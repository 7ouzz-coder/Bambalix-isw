function equipmentWhere(filters = {}) {
  const where = { mode: "UNIT" };
  if (filters.name) where.name = { contains: filters.name.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" };
  if (filters.code) where.code = { contains: filters.code, mode: "insensitive" };
  if (filters.category) where.category = { equals: filters.category, mode: "insensitive" };
  if (filters.status) where.status = filters.status;
  return where;
}

export function listarEquipos(db, filters = {}) {
  return db.resource.findMany({
    where: equipmentWhere(filters), take: 200,
    orderBy: [{ category: "asc" }, { name: "asc" }, { id: "asc" }],
  });
}

export function listarPaginaEquipos(db, { page = 1, pageSize = 20, ...filters } = {}) {
  const where = equipmentWhere(filters);
  return db.$transaction(async tx => {
    const total = await tx.resource.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const items = await tx.resource.findMany({
      where, skip: (currentPage - 1) * pageSize, take: pageSize,
      orderBy: [{ category: "asc" }, { name: "asc" }, { id: "asc" }],
    });
    return { items, total, page: currentPage, pageSize, pages };
  }, { isolationLevel: "RepeatableRead" });
}

export async function listarCategoriasEquipos(db) {
  const items = await db.resource.findMany({
    where: { mode: "UNIT" },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return items.map(item => item.category);
}

export async function crearEquipo(db, data) {
  try {
    return await db.resource.create({ data });
  } catch (error) {
    if (error.code === "P2002") {
      const conflict = new Error("Ya existe un equipo con ese código");
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

function equipmentError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function cambiarEstadoEquipo(db, id, data) {
  return db.$transaction(async tx => {
    const equipment = await tx.resource.findFirst({ where: { id, mode: "UNIT" } });
    if (!equipment) throw equipmentError("Equipo no encontrado", 404);
    if (equipment.revision !== data.revision)
      throw equipmentError("El equipo cambió. Actualiza el inventario antes de intentar nuevamente", 409);
    if (equipment.status === data.status)
      throw equipmentError("El equipo ya tiene ese estado", 409);

    const result = await tx.resource.updateMany({
      where: { id, mode: "UNIT", revision: data.revision },
      data: { status: data.status, revision: { increment: 1 } },
    });
    if (result.count !== 1)
      throw equipmentError("El equipo cambió. Actualiza el inventario antes de intentar nuevamente", 409);

    await tx.equipmentStatusChange.create({ data: {
      resourceId: id,
      previousStatus: equipment.status,
      status: data.status,
      reason: data.reason,
      revision: data.revision + 1,
    } });
    return tx.resource.findUnique({ where: { id } });
  });
}

export async function listarHistorialEquipo(db, id) {
  const equipment = await db.resource.findFirst({
    where: { id, mode: "UNIT" }, select: { id: true },
  });
  if (!equipment) throw equipmentError("Equipo no encontrado", 404);
  return db.equipmentStatusChange.findMany({
    where: { resourceId: id },
    orderBy: { revision: "desc" }, take: 200,
  });
}

export async function editarEquipo(db, id, { revision, ...data }) {
  try {
    return await db.$transaction(async tx => {
      const equipment = await tx.resource.findFirst({ where: { id, mode: "UNIT" } });
      if (!equipment) throw equipmentError("Equipo no encontrado", 404);
      const result = await tx.resource.updateMany({
        where: { id, mode: "UNIT", revision },
        data: { ...data, revision: { increment: 1 } },
      });
      if (result.count !== 1)
        throw equipmentError("El equipo cambió. Actualiza el inventario antes de intentar nuevamente", 409);
      return tx.resource.findUnique({ where: { id } });
    });
  } catch (error) {
    if (error.code === "P2002") throw equipmentError("Ya existe un equipo con ese código", 409);
    throw error;
  }
}

export function listarPaginaHistorialEquipo(db, id, { page = 1, pageSize = 20 } = {}) {
  return db.$transaction(async tx => {
    const equipment = await tx.resource.findFirst({ where: { id, mode: "UNIT" }, select: { id: true } });
    if (!equipment) throw equipmentError("Equipo no encontrado", 404);
    const where = { resourceId: id };
    const total = await tx.equipmentStatusChange.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const items = await tx.equipmentStatusChange.findMany({
      where, skip: (currentPage - 1) * pageSize, take: pageSize,
      orderBy: [{ revision: "desc" }, { id: "desc" }],
    });
    return { items, total, page: currentPage, pageSize, pages };
  }, { isolationLevel: "RepeatableRead" });
}
