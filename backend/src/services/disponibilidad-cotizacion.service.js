import { resourceError } from "./disponibilidad.service.js";

export async function listarRecursosCotizacion(db, eventId) {
  const event = await db.event.findUnique({
    where: { id: eventId }, select: { startsAt: true, endsAt: true },
  });
  if (!event) throw resourceError("Evento no encontrado", 404);
  const overlap = { startsAt: { lt: event.endsAt }, endsAt: { gt: event.startsAt } };
  const [equipos, vehiculos] = await Promise.all([
    db.resource.findMany({
      where: {
        mode: "UNIT", status: "OPERATIONAL",
        maintenances: { none: overlap },
        assignments: { none: { ...overlap, releasedAt: null, eventId: { not: eventId } } },
      },
      select: { id: true, name: true, code: true, category: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    db.vehicle.findMany({
      where: {
        status: "OPERATIONAL",
        maintenances: { none: overlap },
        assignments: { none: { ...overlap, releasedAt: null, eventId: { not: eventId } } },
      },
      select: { id: true, name: true, type: true, plate: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
  ]);
  return { equipos, vehiculos };
}
