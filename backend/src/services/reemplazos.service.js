import { bloquearEquipo, motivosNoDisponible, resourceError } from "./disponibilidad.service.js";
import { replacementActorSchema } from "../schemas/reemplazos.schema.js";

const details = { proposedResource: { select: { id: true, name: true, code: true, status: true } } };

async function assignmentFor(db, resourceId, assignmentId) {
  const assignment = await db.equipmentAssignment.findFirst({ where: { id: assignmentId, resourceId } });
  if (!assignment) throw resourceError("Asignación no encontrada para este equipo", 404);
  return assignment;
}

async function lockResources(tx, resourceId, proposedResourceId) {
  const resources = new Map();
  for (const id of [...new Set([resourceId, proposedResourceId].filter(Boolean))].sort())
    resources.set(id, await bloquearEquipo(tx, id));
  return resources;
}

async function activeContext(tx, resourceId, assignmentId) {
  const assignment = await assignmentFor(tx, resourceId, assignmentId);
  if (assignment.releasedAt) throw resourceError("La asignación original ya fue liberada", 409);
  const rows = await tx.$queryRaw`SELECT id FROM events WHERE id = ${assignment.eventId} FOR SHARE`;
  if (!rows.length) throw resourceError("Evento no encontrado", 404);
  const event = await tx.event.findUnique({ where: { id: assignment.eventId } });
  if (event.endsAt <= event.startsAt || assignment.startsAt > event.startsAt || assignment.endsAt < event.endsAt)
    throw resourceError("El evento cambió de fecha. Revisa primero su asignación", 409);
  return { assignment, event };
}

async function checkAlternative(tx, resources, resourceId, proposedResourceId, assignment) {
  if (!proposedResourceId) return;
  if (proposedResourceId === resourceId) throw resourceError("El reemplazo debe ser un equipo distinto", 409);
  const reasons = await motivosNoDisponible(tx, resources.get(proposedResourceId), assignment.startsAt, assignment.endsAt);
  if (reasons.length) throw resourceError(reasons.join(". "), 409);
}

export function solicitarReemplazo(db, resourceId, assignmentId, data, actor) {
  const identity = replacementActorSchema.safeParse(actor);
  return db.$transaction(async tx => {
    const resources = await lockResources(tx, resourceId, data.proposedResourceId);
    const { assignment, event } = await activeContext(tx, resourceId, assignmentId);
    await checkAlternative(tx, resources, resourceId, data.proposedResourceId, assignment);
    return tx.equipmentReplacement.create({ data: {
      assignmentId, proposedResourceId: data.proposedResourceId, externalAlternative: data.externalAlternative,
      reason: data.reason, estimatedCost: data.estimatedCost,
      startsAt: assignment.startsAt, endsAt: assignment.endsAt,
      eventStartsAt: event.startsAt, eventEndsAt: event.endsAt,
      requestedById: identity.success ? identity.data.id : null,
    }, include: details });
  });
}

export function listarReemplazos(db, resourceId, assignmentId, { page = 1, pageSize = 20 } = {}) {
  return db.$transaction(async tx => {
    const assignment = await assignmentFor(tx, resourceId, assignmentId);
    const where = { assignmentId };
    const total = await tx.equipmentReplacement.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const items = await tx.equipmentReplacement.findMany({
      where, include: details, skip: (currentPage - 1) * pageSize, take: pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
    return { items, total, page: currentPage, pageSize, pages, assignmentReleasedAt: assignment.releasedAt };
  }, { isolationLevel: "RepeatableRead" });
}

export async function decidirReemplazo(db, resourceId, assignmentId, replacementId, data, actor) {
  const identity = replacementActorSchema.safeParse(actor);
  if (!identity.success) throw resourceError("Necesitas una sesión de gerente validada por el servidor", 401);
  if (identity.data.role !== "GERENTE") throw resourceError("Solo el gerente puede decidir un reemplazo", 403);
  return db.$transaction(async tx => {
    const initial = await tx.equipmentReplacement.findFirst({ where: { id: replacementId, assignmentId, assignment: { resourceId } } });
    if (!initial) throw resourceError("Solicitud de reemplazo no encontrada", 404);
    const resources = await lockResources(tx, resourceId, initial.proposedResourceId);
    const replacement = await tx.equipmentReplacement.findUnique({ where: { id: replacementId } });
    if (replacement.status !== "PENDING") throw resourceError("La solicitud ya tiene una decisión. Actualiza el listado", 409);
    const decidedAt = new Date();
    let resultingAssignmentId = null;
    if (data.status === "APPROVED") {
      const { assignment, event } = await activeContext(tx, resourceId, assignmentId);
      if (+assignment.startsAt !== +replacement.startsAt || +assignment.endsAt !== +replacement.endsAt ||
          +event.startsAt !== +replacement.eventStartsAt || +event.endsAt !== +replacement.eventEndsAt)
        throw resourceError("Las fechas cambiaron desde la solicitud. Registra una nueva propuesta", 409);
      await checkAlternative(tx, resources, resourceId, replacement.proposedResourceId, assignment);
      if (replacement.proposedResourceId) {
        await tx.equipmentAssignment.update({
          where: { id: assignment.id },
          data: { releasedAt: decidedAt, releaseReason: `Reemplazo aprobado: ${replacement.id}` },
        });
        const resultingAssignment = await tx.equipmentAssignment.create({ data: {
          resourceId: replacement.proposedResourceId, eventId: assignment.eventId,
          startsAt: assignment.startsAt, endsAt: assignment.endsAt,
        } });
        resultingAssignmentId = resultingAssignment.id;
      }
    }
    return tx.equipmentReplacement.update({
      where: { id: replacementId },
      data: { status: data.status, decidedAt, decidedById: identity.data.id, decisionReason: data.reason, resultingAssignmentId },
      include: details,
    });
  });
}
