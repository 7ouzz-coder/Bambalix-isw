import { bloquearEquipo, motivosNoDisponible, resourceError } from "./disponibilidad.service.js";

export function consultarDisponibilidad(db, resourceId, data) {
  return db.$transaction(async tx => {
    const equipment = await bloquearEquipo(tx, resourceId);
    const reasons = await motivosNoDisponible(tx, equipment, new Date(data.startsAt), new Date(data.endsAt));
    return { available: reasons.length === 0, reasons };
  });
}

export function crearAsignacion(db, resourceId, data) {
  return db.$transaction(async tx => {
    const equipment = await bloquearEquipo(tx, resourceId);
    const events = await tx.$queryRaw`SELECT id FROM events WHERE id = ${data.eventId} FOR SHARE`;
    if (!events.length) throw resourceError("Evento no encontrado", 404);
    const event = await tx.event.findUnique({ where: { id: data.eventId } });
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (event.endsAt <= event.startsAt || startsAt > event.startsAt || endsAt < event.endsAt)
      throw resourceError("El periodo de ocupación debe cubrir todo el evento", 409);
    const reasons = await motivosNoDisponible(tx, equipment, startsAt, endsAt);
    if (reasons.length) throw resourceError(reasons.join(". "), 409);
    return tx.equipmentAssignment.create({
      data: { resourceId, eventId: event.id, startsAt, endsAt },
      include: { event: { select: { id: true, title: true, startsAt: true, endsAt: true } } },
    });
  });
}

export function liberarAsignacion(db, resourceId, assignmentId, { reason }) {
  return db.$transaction(async tx => {
    await bloquearEquipo(tx, resourceId);
    const assignment = await tx.equipmentAssignment.findFirst({ where: { id: assignmentId, resourceId } });
    if (!assignment) throw resourceError("Asignación no encontrada", 404);
    if (assignment.releasedAt) throw resourceError("La asignación ya fue liberada", 409);
    return tx.equipmentAssignment.update({
      where: { id: assignmentId }, data: { releasedAt: new Date(), releaseReason: reason },
    });
  });
}

export function listarAsignaciones(db, resourceId, { page = 1, pageSize = 20 } = {}) {
  return db.$transaction(async tx => {
    const equipment = await tx.resource.findFirst({ where: { id: resourceId, mode: "UNIT" }, select: { id: true } });
    if (!equipment) throw resourceError("Equipo no encontrado", 404);
    const where = { resourceId };
    const total = await tx.equipmentAssignment.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const items = await tx.equipmentAssignment.findMany({
      where, skip: (currentPage - 1) * pageSize, take: pageSize,
      orderBy: [{ startsAt: "desc" }, { id: "asc" }],
      include: { event: { select: { id: true, title: true, startsAt: true, endsAt: true } } },
    });
    return { items, total, page: currentPage, pageSize, pages };
  }, { isolationLevel: "RepeatableRead" });
}

export function listarEventosAsignables(db, { page = 1, pageSize = 20, search } = {}) {
  return db.$transaction(async tx => {
    const where = search ? { title: { contains: search.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } } : {};
    const total = await tx.event.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const items = await tx.event.findMany({
      where, select: { id: true, title: true, startsAt: true, endsAt: true },
      orderBy: [{ startsAt: "desc" }, { id: "asc" }], skip: (currentPage - 1) * pageSize, take: pageSize,
    });
    return { items, total, page: currentPage, pageSize, pages };
  }, { isolationLevel: "RepeatableRead" });
}
