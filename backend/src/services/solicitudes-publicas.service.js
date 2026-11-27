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
  // Comprobación previa de idempotencia fuera o antes de bloquear
  if (idempotencyKey && typeof db?.publicEventRequest?.findUnique === "function") {
    const existingBefore = await db.publicEventRequest.findUnique({
      where: { idempotencyKey },
      select: { name: true, email: true, phone: true, requestedDate: true, service: true },
    });
    if (existingBefore) {
      const sameRequest =
        existingBefore.name === data.name &&
        existingBefore.email === data.email &&
        existingBefore.phone.trim() === data.phone.trim() &&
        existingBefore.requestedDate === data.requestedDate &&
        existingBefore.service === data.service;

      if (!sameRequest) {
        const conflict = new Error("La solicitud cambió. Actualiza la página antes de volver a enviarla.");
        conflict.statusCode = 409;
        throw conflict;
      }

      return { message: "Recibimos tu solicitud. La productora revisará la fecha y los servicios. Esto no confirma una reserva." };
    }
  }

  const executeInTransaction = async () => {
    const runner = typeof db?.$transaction === "function" ? (cb) => db.$transaction(cb) : (cb) => cb(db);

    return runner(async (tx) => {
      // 1. Adquirir el mismo bloqueo transaccional coordinado con Gabriel
      // (solicitud pública, aprobación de cotización y verificación de abono)
      if (typeof tx?.$queryRaw === "function") {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('bambalix_confirmacion_agenda')) IS NOT NULL AS locked`;
      }

      // 2. Verificar idempotencia nuevamente dentro de la transacción por si otra petición ganó la carrera
      if (idempotencyKey && typeof tx?.publicEventRequest?.findUnique === "function") {
        const existingInTx = await tx.publicEventRequest.findUnique({
          where: { idempotencyKey },
          select: { name: true, email: true, phone: true, requestedDate: true, service: true },
        });

        if (existingInTx) {
          const sameRequest =
            existingInTx.name === data.name &&
            existingInTx.email === data.email &&
            existingInTx.phone.trim() === data.phone.trim() &&
            existingInTx.requestedDate === data.requestedDate &&
            existingInTx.service === data.service;

          if (!sameRequest) {
            const conflict = new Error("La solicitud cambió. Actualiza la página antes de volver a enviarla.");
            conflict.statusCode = 409;
            throw conflict;
          }

          return { message: "Recibimos tu solicitud. La productora revisará la fecha y los servicios. Esto no confirma una reserva." };
        }
      }

      // 3. Comprobar ocupación por eventos confirmados
      const isOccupied = await isDateOccupiedByConfirmedEvent(tx, data.requestedDate);
      if (isOccupied) {
        const conflict = new Error("La fecha seleccionada ya no se encuentra disponible. Por favor elige otra fecha.");
        conflict.statusCode = 409;
        throw conflict;
      }

      // 4. Insertar la solicitud pública dentro de la transacción
      await tx.publicEventRequest.create({
        data: {
          ...data,
          message: "",
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      });

      return { message: "Recibimos tu solicitud. La productora revisará la fecha y los servicios. Esto no confirma una reserva." };
    });
  };

  try {
    return await executeInTransaction();
  } catch (error) {
    // Si la transacción abortó por colisión de clave única (P2002), recuperar fuera de la transacción fallida
    if (idempotencyKey && error.code === "P2002" && typeof db?.publicEventRequest?.findUnique === "function") {
      const existingAfterConflict = await db.publicEventRequest.findUnique({
        where: { idempotencyKey },
        select: { name: true, email: true, phone: true, requestedDate: true, service: true },
      });
      if (existingAfterConflict) {
        const sameRequest =
          existingAfterConflict.name === data.name &&
          existingAfterConflict.email === data.email &&
          existingAfterConflict.phone.trim() === data.phone.trim() &&
          existingAfterConflict.requestedDate === data.requestedDate &&
          existingAfterConflict.service === data.service;

        if (!sameRequest) {
          const conflict = new Error("La solicitud cambió. Actualiza la página antes de volver a enviarla.");
          conflict.statusCode = 409;
          throw conflict;
        }

        return { message: "Recibimos tu solicitud. La productora revisará la fecha y los servicios. Esto no confirma una reserva." };
      }
    }
    throw error;
  }
}
