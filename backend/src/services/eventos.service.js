export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

export class ConflictError extends Error {
  constructor(message, conflict = null) {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
    this.conflict = conflict;
  }
}

export async function checkSpaceConflict(tx, { location, startsAt, endsAt, excludeId = null }) {
  if (!location || typeof location !== "string" || !location.trim()) {
    return null;
  }

  const normalizedLocation = location.trim();

  // Bloqueo consultivo de transacción en PostgreSQL para evitar dos reservas concurrentes del mismo espacio
  if (typeof tx.$queryRaw === "function") {
    try {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('event_space_' || lower(${normalizedLocation})))`;
    } catch {
      // Ignorar si el motor o mock no soporta la función pg_advisory_xact_lock
    }
  }

  const where = {
    location: { equals: normalizedLocation, mode: "insensitive" },
    startsAt: { lt: endsAt },
    endsAt: { gt: startsAt },
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const conflictingEvent = await tx.event.findFirst({
    where,
    select: {
      id: true,
      title: true,
      location: true,
      startsAt: true,
      endsAt: true,
    },
  });

  if (conflictingEvent) {
    const fStart = new Date(conflictingEvent.startsAt).toISOString();
    const fEnd = new Date(conflictingEvent.endsAt).toISOString();
    throw new ConflictError(
      `Conflicto de programación: el espacio «${conflictingEvent.location}» ya está reservado por «${conflictingEvent.title}» entre ${fStart} y ${fEnd}.`,
      conflictingEvent
    );
  }

  return null;
}

export async function createEvento(db, datos) {
  const runner = typeof db.$transaction === "function" ? (cb) => db.$transaction(cb) : (cb) => cb(db);

  return runner(async (tx) => {
    const cliente = await tx.client.findUnique({ where: { id: datos.clientId } });
    if (!cliente) {
      throw new NotFoundError("Cliente no encontrado");
    }

    const tipo = await tx.eventType.findUnique({ where: { id: datos.eventTypeId } });
    if (!tipo) {
      throw new NotFoundError("Tipo de evento no encontrado");
    }

    const startsAt = new Date(datos.startsAt);
    const endsAt = new Date(datos.endsAt);
    const location = datos.location && datos.location.trim() ? datos.location.trim() : null;

    if (location) {
      await checkSpaceConflict(tx, {
        location,
        startsAt,
        endsAt,
      });
    }

    return tx.event.create({
      data: {
        title: datos.title,
        clientId: datos.clientId,
        eventTypeId: datos.eventTypeId,
        startsAt,
        endsAt,
        attendees: datos.attendees,
        location,
        needs: datos.needs || null,
      },
      include: {
        client: { select: { id: true, name: true } },
        eventType: { select: { id: true, name: true } },
      },
    });
  });
}

export async function listEventos(db, filters = {}) {
  const where = {};
  let orderBy = { createdAt: "desc" };

  if (filters.from && filters.to) {
    where.startsAt = { lt: new Date(filters.to) };
    where.endsAt = { gt: new Date(filters.from) };
    orderBy = { startsAt: "asc" };
  }

  return db.event.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      eventType: { select: { id: true, name: true } },
    },
    orderBy,
  });
}

export async function listTiposEvento(db) {
  return db.eventType.findMany({
    orderBy: { name: "asc" },
  });
}

export async function updateEvento(db, id, datos) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    throw new ValidationError("ID de evento inválido");
  }

  const runner = typeof db.$transaction === "function" ? (cb) => db.$transaction(cb) : (cb) => cb(db);

  return runner(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id: numericId } });
    if (!existing) {
      throw new NotFoundError("Evento no encontrado");
    }

    if (datos.clientId !== undefined) {
      const cliente = await tx.client.findUnique({ where: { id: datos.clientId } });
      if (!cliente) {
        throw new NotFoundError("Cliente no encontrado");
      }
    }

    if (datos.eventTypeId !== undefined) {
      const tipo = await tx.eventType.findUnique({ where: { id: datos.eventTypeId } });
      if (!tipo) {
        throw new NotFoundError("Tipo de evento no encontrado");
      }
    }

    const startsAt = datos.startsAt !== undefined ? new Date(datos.startsAt) : existing.startsAt;
    const endsAt = datos.endsAt !== undefined ? new Date(datos.endsAt) : existing.endsAt;
    if (endsAt <= startsAt) {
      throw new ValidationError("La fecha de término debe ser posterior al inicio");
    }

    const location =
      datos.location !== undefined
        ? (datos.location && datos.location.trim() ? datos.location.trim() : null)
        : existing.location;

    if (location) {
      await checkSpaceConflict(tx, {
        location,
        startsAt,
        endsAt,
        excludeId: numericId,
      });
    }

    const updateData = {};
    if (datos.title !== undefined) updateData.title = datos.title;
    if (datos.clientId !== undefined) updateData.clientId = datos.clientId;
    if (datos.eventTypeId !== undefined) updateData.eventTypeId = datos.eventTypeId;
    if (datos.startsAt !== undefined) updateData.startsAt = startsAt;
    if (datos.endsAt !== undefined) updateData.endsAt = endsAt;
    if (datos.attendees !== undefined) updateData.attendees = datos.attendees;
    if (datos.location !== undefined) updateData.location = location;
    if (datos.needs !== undefined) updateData.needs = datos.needs;

    return tx.event.update({
      where: { id: numericId },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        eventType: { select: { id: true, name: true } },
      },
    });
  });
}


