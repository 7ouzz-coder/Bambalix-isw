import { assignmentRescheduleSchema, rescheduleEventIdSchema } from "../schemas/reprogramacion-asignaciones.schema.js";
import { bloquearEquipo, motivosNoDisponible, resourceError } from "./disponibilidad.service.js";

const selection = { id: true, resourceId: true, startsAt: true, endsAt: true };
const sameDate = (actual, expected) => +actual === +new Date(expected);

// Solo guarda Recursos. El coordinador debe guardar el evento en esta misma transacción
// y propagar cualquier error para revertir ambas escrituras.
export async function reprogramarAsignaciones(tx, eventId, input) {
  const plan = await prepararReprogramacionAsignaciones(tx, eventId, input);
  for (const item of plan.assignments) {
    const result = await tx.equipmentAssignment.updateMany({
      where: { id: item.id, eventId, resourceId: item.resourceId, releasedAt: null,
        startsAt: item.previousStartsAt, endsAt: item.previousEndsAt },
      data: { startsAt: item.startsAt, endsAt: item.endsAt },
    });
    if (result.count !== 1)
      throw resourceError("Las asignaciones cambiaron. Actualiza antes de reprogramar", 409);
  }
  return plan;
}

// No escribe ni abre otra transacción: el coordinador debe usar estos bloqueos hasta guardar todo.
export async function prepararReprogramacionAsignaciones(tx, eventId, input) {
  if (!tx || typeof tx.$transaction === "function" || typeof tx.$queryRaw !== "function")
    throw new TypeError("Usa la transacción compartida de evento y asignaciones");
  const parsed = assignmentRescheduleSchema.safeParse(input);
  if (!rescheduleEventIdSchema.safeParse(eventId).success || !parsed.success)
    throw resourceError("Revisa las fechas y asignaciones de la reprogramación", 400);
  const data = parsed.data;
  const isolation = await tx.$queryRaw`SHOW transaction_isolation`;
  if (isolation[0]?.transaction_isolation !== "read committed")
    throw new TypeError("La reprogramación compartida requiere ReadCommitted");

  const where = { eventId, releasedAt: null };
  const initial = await tx.equipmentAssignment.findMany({ where, select: selection });
  const equipment = new Map();
  // El mismo orden que asignaciones/reemplazos: recursos ordenados antes de bloquear el evento.
  for (const id of [...new Set(initial.map(item => item.resourceId))].sort())
    equipment.set(id, await bloquearEquipo(tx, id));

  const events = await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
  if (!events.length) throw resourceError("Evento no encontrado", 404);
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (!sameDate(event.startsAt, data.expectedStartsAt) || !sameDate(event.endsAt, data.expectedEndsAt))
    throw resourceError("Las fechas del evento cambiaron. Actualiza antes de reprogramar", 409);

  const current = await tx.equipmentAssignment.findMany({ where, select: selection });
  const proposed = new Map(data.assignments.map(item => [item.id, item]));
  if (current.length !== proposed.size || current.some(item => !proposed.has(item.id) || !equipment.has(item.resourceId)))
    throw resourceError("Las asignaciones activas cambiaron. Actualiza antes de reprogramar", 409);
  if (new Set(current.map(item => item.resourceId)).size !== current.length)
    throw resourceError("Revisa las asignaciones repetidas del mismo equipo antes de reprogramar", 409);

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  const assignments = [];
  for (const item of current) {
    const next = proposed.get(item.id);
    if (!sameDate(item.startsAt, next.expectedStartsAt) || !sameDate(item.endsAt, next.expectedEndsAt))
      throw resourceError("El periodo de una asignación cambió. Actualiza antes de reprogramar", 409);
    const occupiedStart = new Date(next.startsAt);
    const occupiedEnd = new Date(next.endsAt);
    if (occupiedStart > startsAt || occupiedEnd < endsAt)
      throw resourceError("Cada periodo de ocupación debe cubrir todo el evento reprogramado", 409);
    const reasons = await motivosNoDisponible(tx, equipment.get(item.resourceId), occupiedStart, occupiedEnd, item.id);
    if (reasons.length) throw resourceError(reasons.join(". "), 409);
    assignments.push({ id: item.id, resourceId: item.resourceId,
      previousStartsAt: item.startsAt, previousEndsAt: item.endsAt, startsAt: occupiedStart, endsAt: occupiedEnd });
  }
  return { eventId, expectedStartsAt: event.startsAt, expectedEndsAt: event.endsAt, startsAt, endsAt, assignments };
}
