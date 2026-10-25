import { bloquearEquipo, periodoOcupado, resourceError } from "./disponibilidad.service.js";

async function comprobarEquipo(db, id) {
  const equipment = await db.resource.findFirst({ where: { id, mode: "UNIT" }, select: { id: true } });
  if (!equipment) {
    const error = new Error("Equipo no encontrado");
    error.status = 404;
    throw error;
  }
}

export function crearMantencion(db, resourceId, data) {
  return db.$transaction(async tx => {
    await bloquearEquipo(tx, resourceId);
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    const assigned = await tx.equipmentAssignment.findFirst({
      where: { ...periodoOcupado(resourceId, startsAt, endsAt), releasedAt: null }, select: { id: true },
    });
    if (assigned) throw resourceError("El periodo cruza una asignación activa. Libera el equipo antes de registrar la mantención", 409);
    return tx.equipmentMaintenance.create({ data: {
      resourceId, startsAt, endsAt, reason: data.reason,
    } });
  });
}

export function listarMantenciones(db, resourceId, { page = 1, pageSize = 20 } = {}) {
  return db.$transaction(async tx => {
    await comprobarEquipo(tx, resourceId);
    const where = { resourceId };
    const total = await tx.equipmentMaintenance.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const items = await tx.equipmentMaintenance.findMany({
      where, skip: (currentPage - 1) * pageSize, take: pageSize,
      orderBy: [{ startsAt: "desc" }, { id: "asc" }],
    });
    return { items, total, page: currentPage, pageSize, pages };
  }, { isolationLevel: "RepeatableRead" });
}

async function comprobarMantencion(db, resourceId, maintenanceId) {
  const maintenance = await db.equipmentMaintenance.findFirst({ where: { id: maintenanceId, resourceId } });
  if (!maintenance) throw resourceError("Mantención no encontrada para este equipo", 404);
  return maintenance;
}

async function mantencionAbierta(tx, resourceId, maintenanceId) {
  await bloquearEquipo(tx, resourceId);
  const maintenance = await comprobarMantencion(tx, resourceId, maintenanceId);
  if (maintenance.closedAt) throw resourceError("La mantención ya está cerrada. Actualiza el historial", 409);
  return maintenance;
}

export function agregarNotaMantencion(db, resourceId, maintenanceId, { content }) {
  return db.$transaction(async tx => {
    await mantencionAbierta(tx, resourceId, maintenanceId);
    return tx.equipmentMaintenanceNote.create({ data: { maintenanceId, content } });
  });
}

export function cerrarMantencion(db, resourceId, maintenanceId, { closingNotes }) {
  return db.$transaction(async tx => {
    await mantencionAbierta(tx, resourceId, maintenanceId);
    return tx.equipmentMaintenance.update({
      where: { id: maintenanceId }, data: { closedAt: new Date(), closingNotes },
    });
  });
}

export function listarNotasMantencion(db, resourceId, maintenanceId, { page = 1, pageSize = 20 } = {}) {
  return db.$transaction(async tx => {
    await comprobarEquipo(tx, resourceId);
    const maintenance = await comprobarMantencion(tx, resourceId, maintenanceId);
    const where = { maintenanceId };
    const total = await tx.equipmentMaintenanceNote.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const items = await tx.equipmentMaintenanceNote.findMany({
      where, skip: (currentPage - 1) * pageSize, take: pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
    return { maintenance, items, total, page: currentPage, pageSize, pages };
  }, { isolationLevel: "RepeatableRead" });
}
