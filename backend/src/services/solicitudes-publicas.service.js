import { computeEventStatus, getEventOccupiedDates } from "./eventos.service.js";

export async function isDateOccupiedByConfirmedEvent(tx, requestedDate) {
  if (typeof tx?.event?.findMany !== "function") return false;
  const events = await tx.event.findMany({
    include: {
      quotes: {
        select: {
          id: true,
          status: true,
          total: true,
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
        },
      },
    },
  });

  const confirmedEvents = events.filter((ev) => computeEventStatus(ev) === "CONFIRMADO");
  for (const ev of confirmedEvents) {
    const occupiedDates = getEventOccupiedDates(ev.startsAt, ev.endsAt);
    if (occupiedDates.includes(requestedDate)) {
      return true;
    }
  }
  return false;
}

export async function registerPublicRequest(db, data, idempotencyKey) {
  const runner = typeof db?.$transaction === "function" ? (cb) => db.$transaction(cb) : (cb) => cb(db);

  return runner(async (tx) => {
    // 1. Manejo prioritario de idempotencia:
    // Si la solicitud ya fue guardada previamente con esta clave, comprobar antes de rechazar
    if (idempotencyKey && typeof tx?.publicEventRequest?.findUnique === "function") {
      const existing = await tx.publicEventRequest.findUnique({
        where: { idempotencyKey },
        select: { name: true, email: true, phone: true, requestedDate: true, service: true },
      });

      if (existing) {
        const sameRequest =
          existing.name === data.name &&
          existing.email === data.email &&
          existing.phone.trim() === data.phone.trim() &&
          existing.requestedDate === data.requestedDate &&
          existing.service === data.service;

        if (!sameRequest) {
          const conflict = new Error("La solicitud cambió. Actualiza la página antes de volver a enviarla.");
          conflict.statusCode = 409;
          throw conflict;
        }

        // Si es exactamente la misma solicitud guardada previamente, devuelve éxito
        // aun cuando la fecha se haya ocupado posteriormente
        return { message: "Recibimos tu solicitud. La productora revisará la fecha y los servicios. Esto no confirma una reserva." };
      }
    }

    // 2. Bloqueo consultivo de PostgreSQL para serializar la verificación de ocupación de la fecha
    // evitando condiciones de carrera con confirmación comercial simultánea
    if (typeof tx?.$queryRaw === "function") {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('public_date_' || ${data.requestedDate})) IS NOT NULL AS locked`;
    }

    // 3. Verificación en el servidor: rechazar si la fecha ya está ocupada por un evento confirmado
    const isOccupied = await isDateOccupiedByConfirmedEvent(tx, data.requestedDate);
    if (isOccupied) {
      const conflict = new Error("La fecha seleccionada ya no se encuentra disponible. Por favor elige otra fecha.");
      conflict.statusCode = 409;
      throw conflict;
    }

    // 4. Inserción de la nueva solicitud
    try {
      await tx.publicEventRequest.create({
        data: {
          ...data,
          message: "",
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      });
    } catch (error) {
      if (idempotencyKey && error.code === "P2002" && typeof tx?.publicEventRequest?.findUnique === "function") {
        const existingAfterRace = await tx.publicEventRequest.findUnique({
          where: { idempotencyKey },
          select: { name: true, email: true, phone: true, requestedDate: true, service: true },
        });
        if (existingAfterRace) {
          const same =
            existingAfterRace.name === data.name &&
            existingAfterRace.email === data.email &&
            existingAfterRace.phone.trim() === data.phone.trim() &&
            existingAfterRace.requestedDate === data.requestedDate &&
            existingAfterRace.service === data.service;
          if (!same) {
            const conflict = new Error("La solicitud cambió. Actualiza la página antes de volver a enviarla.");
            conflict.statusCode = 409;
            throw conflict;
          }
          return { message: "Recibimos tu solicitud. La productora revisará la fecha y los servicios. Esto no confirma una reserva." };
        }
      }
      throw error;
    }

    return { message: "Recibimos tu solicitud. La productora revisará la fecha y los servicios. Esto no confirma una reserva." };
  });
}
