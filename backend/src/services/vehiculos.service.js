function vehicleWhere({ q, type } = {}) {
  const plate = q?.replace(/[\s-]/g, "");
  const where = {};
  if (type) where.type = { equals: type, mode: "insensitive" };
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" } },
    ...(plate ? [{ plate: { contains: plate, mode: "insensitive" } }] : []),
  ];
  return where;
}

export function listarVehiculos(db, filters = {}) {
  return db.vehicle.findMany({
    where: vehicleWhere(filters),
    take: 200, orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export function listarPaginaVehiculos(db, { page = 1, pageSize = 20, ...filters } = {}) {
  const where = vehicleWhere(filters);
  return db.$transaction(async tx => {
    const total = await tx.vehicle.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const items = await tx.vehicle.findMany({
      where, skip: (currentPage - 1) * pageSize, take: pageSize,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return { items, total, page: currentPage, pageSize, pages };
  }, { isolationLevel: "RepeatableRead" });
}

export async function listarTiposVehiculos(db) {
  const items = await db.vehicle.findMany({
    distinct: ["type"], select: { type: true }, orderBy: { type: "asc" },
  });
  return items.map(item => item.type);
}

export async function crearVehiculo(db, data) {
  try {
    return await db.vehicle.create({ data });
  } catch (error) {
    if (error.code === "P2002") {
      const conflict = new Error("Ya existe un vehículo con esa patente");
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

export async function editarVehiculo(db, id, { revision, ...data }) {
  try {
    return await db.$transaction(async tx => {
      const vehicle = await tx.vehicle.findUnique({ where: { id }, select: { id: true } });
      if (!vehicle) {
        const failure = new Error("Vehículo no encontrado");
        failure.status = 404;
        throw failure;
      }
      const result = await tx.vehicle.updateMany({
        where: { id, revision }, data: { ...data, revision: { increment: 1 } },
      });
      if (result.count !== 1) {
        const failure = new Error("El vehículo cambió. Conserva lo escrito y cierra este formulario; actualiza el listado antes de volver a editar");
        failure.status = 409;
        failure.code = "VEHICLE_REVISION_CONFLICT";
        throw failure;
      }
      return tx.vehicle.findUnique({ where: { id } });
    });
  } catch (error) {
    if (error.code === "P2002" || error.code === "P2025") {
      const failure = new Error(error.code === "P2002"
        ? "Ya existe un vehículo con esa patente" : "Vehículo no encontrado");
      failure.status = error.code === "P2002" ? 409 : 404;
      throw failure;
    }
    throw error;
  }
}
