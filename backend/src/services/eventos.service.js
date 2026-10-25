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

export function normalizeSpace(location) {
  if (!location || typeof location !== "string") return null;
  const trimmed = location.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, " ");
}

export function getSpaceCanonicalKey(loc) {
  if (!loc || typeof loc !== "string") return "";
  return loc
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export async function checkSpaceConflict(tx, { location, startsAt, endsAt, excludeId = null }) {
  const normalizedLocation = normalizeSpace(location);
  if (!normalizedLocation) {
    return null;
  }

  const spaceKey = getSpaceCanonicalKey(normalizedLocation);

  // Bloqueo consultivo de transacción en PostgreSQL con clave canónica del espacio
  // Sin catch silencioso para garantizar protección transaccional real en PostgreSQL
  // Se evalúa IS NOT NULL para que PostgreSQL devuelva un tipo boolean deserializable por Prisma (evitando error con tipo void)
  if (typeof tx.$queryRaw === "function") {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('event_space_' || ${spaceKey})) IS NOT NULL AS locked`;
  }

  let conflictingEvent = null;
  if (typeof tx.event.findFirst === "function") {
    conflictingEvent = await tx.event.findFirst({
      where: {
        location: { equals: normalizedLocation, mode: "insensitive" },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        title: true,
        location: true,
        startsAt: true,
        endsAt: true,
      },
    });
  }

  if (!conflictingEvent && typeof tx.event.findMany === "function") {
    const rawCandidates = await tx.event.findMany({
      where: {
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        location: { not: null },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        title: true,
        location: true,
        startsAt: true,
        endsAt: true,
      },
    });
    const candidateEvents = Array.isArray(rawCandidates) ? rawCandidates : [];
    conflictingEvent =
      candidateEvents.find(
        (ev) => getSpaceCanonicalKey(ev.location) === spaceKey
      ) || null;
  }

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
    const location = normalizeSpace(datos.location);

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
        needs: datos.needs && typeof datos.needs === "string" && datos.needs.trim() ? datos.needs.trim() : null,
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

/**
 * Consulta de agenda externa / pública para clientes.
 * Entrega únicamente eventos y campos autorizados filtrados estrictamente desde el backend.
 * No expone datos de clientes (id, nombre, contacto), notas internas (needs),
 * conteo de asistentes ni información comercial.
 */
export async function listEventosPublicos(db, filters = {}) {
  const where = {};
  let orderBy = { startsAt: "asc" };

  if (filters.from && filters.to) {
    where.startsAt = { lt: new Date(filters.to) };
    where.endsAt = { gt: new Date(filters.from) };
  }

  return db.event.findMany({
    where,
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true,
      eventType: { select: { id: true, name: true } },
    },
    orderBy,
  });
}

export async function updateEvento(db, id, datos, options = {}) {
  const strId = String(id).trim();
  if (!/^[1-9]\d*$/.test(strId)) {
    throw new ValidationError("ID de evento inválido");
  }
  const numericId = Number(strId);
  if (!Number.isSafeInteger(numericId) || numericId > 2147483647) {
    throw new ValidationError("ID de evento inválido");
  }

  const runner = typeof db.$transaction === "function" ? (cb) => db.$transaction(cb) : (cb) => cb(db);

  return runner(async (tx) => {
    // Bloqueo exclusivo de fila en PostgreSQL para evitar carreras concurrentes al editar el mismo evento
    if (typeof tx.$queryRaw === "function") {
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${numericId} FOR UPDATE`;
    }

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
        ? normalizeSpace(datos.location)
        : existing.location;

    if (location) {
      await checkSpaceConflict(tx, {
        location,
        startsAt,
        endsAt,
        excludeId: numericId,
      });
    }

    const isScheduleChange =
      (datos.startsAt !== undefined && startsAt.getTime() !== new Date(existing.startsAt).getTime()) ||
      (datos.endsAt !== undefined && endsAt.getTime() !== new Date(existing.endsAt).getTime());

    if (isScheduleChange) {
      if (typeof options.onScheduleChange !== "function") {
        throw new ConflictError(
          "No se puede cambiar el horario sin validar las asignaciones de equipos"
        );
      }
      await options.onScheduleChange(tx, {
        eventId: numericId,
        previousSchedule: {
          startsAt: existing.startsAt,
          endsAt: existing.endsAt,
        },
        newSchedule: { startsAt, endsAt },
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
    if (datos.needs !== undefined) {
      updateData.needs =
        datos.needs && typeof datos.needs === "string" && datos.needs.trim()
          ? datos.needs.trim()
          : null;
    }

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



