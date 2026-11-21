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

export async function eliminarVehiculo(db, id) {
  try {
    await db.$transaction(async tx => {
      const rows = await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${id} FOR UPDATE`;
      if (!rows.length) {
        const failure = new Error("Vehículo no encontrado");
        failure.status = 404;
        throw failure;
      }
      if (await tx.vehicleMaintenance.count({ where: { vehicleId: id } }) ||
          await tx.vehicleAssignment.count({ where: { vehicleId: id } })) {
        const failure = new Error("El vehículo tiene registros asociados y no se puede eliminar");
        failure.status = 409;
        throw failure;
      }
      await tx.vehicle.delete({ where: { id } });
    });
  } catch (error) {
    if (error.code === "P2025") {
      const failure = new Error("Vehículo no encontrado");
      failure.status = 404;
      throw failure;
    }
    if (error.code === "P2003") {
      const failure = new Error("El vehículo tiene registros asociados y no se puede eliminar");
      failure.status = 409;
      throw failure;
    }
    throw error;
  }
}

export async function listarMantencionesVehiculo(db, id) {
  const vehicle = await db.vehicle.findUnique({ where: { id }, select: { id: true } });
  if (!vehicle) {
    const error = new Error("Vehículo no encontrado");
    error.status = 404;
    throw error;
  }
  return db.vehicleMaintenance.findMany({ where: { vehicleId: id }, orderBy: { startsAt: "desc" }, take: 200 });
}

export async function crearMantencionVehiculo(db, id, data) {
  try {
    return await db.$transaction(async tx => {
      const rows = await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${id} FOR UPDATE`;
      if (!rows.length) { const error = new Error("Vehículo no encontrado"); error.status = 404; throw error; }
      const startsAt = new Date(data.startsAt);
      const endsAt = new Date(data.endsAt);
      const assigned = await tx.vehicleAssignment.findFirst({
        where: { vehicleId: id, releasedAt: null, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      });
      if (assigned) { const error = new Error("El periodo cruza una asignación activa"); error.status = 409; throw error; }
      return tx.vehicleMaintenance.create({ data: { vehicleId: id, startsAt, endsAt, reason: data.reason } });
    });
  } catch (error) {
    if (error.code === "P2003") {
      const failure = new Error("Vehículo no encontrado");
      failure.status = 404;
      throw failure;
    }
    throw error;
  }
}

export async function asignarVehiculo(db, vehicleId, data) {
  return db.$transaction(async tx => {
    const rows = await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${vehicleId} FOR UPDATE`;
    if (!rows.length) { const error = new Error("Vehículo no encontrado"); error.status = 404; throw error; }
    const events = await tx.$queryRaw`SELECT id FROM events WHERE id = ${data.eventId} FOR SHARE`;
    if (!events.length) { const error = new Error("Evento no encontrado"); error.status = 404; throw error; }
    const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (startsAt > event.startsAt || endsAt < event.endsAt) {
      const error = new Error("El período debe cubrir todo el evento"); error.status = 409; throw error;
    }
    const overlap = { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } };
    const maintenance = await tx.vehicleMaintenance.findFirst({ where: { vehicleId, ...overlap } });
    const assignment = await tx.vehicleAssignment.findFirst({ where: { vehicleId, releasedAt: null, ...overlap } });
    if (maintenance || assignment) {
      const error = new Error("El vehículo no está disponible en ese período"); error.status = 409; throw error;
    }
    return tx.vehicleAssignment.create({ data: { vehicleId, eventId: event.id, startsAt, endsAt } });
  });
}

export async function listarAsignacionesVehiculo(db, vehicleId) {
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  if (!vehicle) { const error = new Error("Vehículo no encontrado"); error.status = 404; throw error; }
  return db.vehicleAssignment.findMany({
    where: { vehicleId }, orderBy: { startsAt: "desc" }, take: 200,
    include: { event: { select: { id: true, title: true } } },
  });
}
