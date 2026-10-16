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

export async function createEvento(db, datos) {
  const cliente = await db.client.findUnique({ where: { id: datos.clientId } });
  if (!cliente) {
    throw new NotFoundError("Cliente no encontrado");
  }

  const tipo = await db.eventType.findUnique({ where: { id: datos.eventTypeId } });
  if (!tipo) {
    throw new NotFoundError("Tipo de evento no encontrado");
  }

  return db.event.create({
    data: {
      title: datos.title,
      clientId: datos.clientId,
      eventTypeId: datos.eventTypeId,
      startsAt: new Date(datos.startsAt),
      endsAt: new Date(datos.endsAt),
      attendees: datos.attendees,
      location: datos.location || null,
      needs: datos.needs || null,
    },
    include: {
      client: { select: { id: true, name: true } },
      eventType: { select: { id: true, name: true } },
    },
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

  const existing = await db.event.findUnique({ where: { id: numericId } });
  if (!existing) {
    throw new NotFoundError("Evento no encontrado");
  }

  if (datos.clientId !== undefined) {
    const cliente = await db.client.findUnique({ where: { id: datos.clientId } });
    if (!cliente) {
      throw new NotFoundError("Cliente no encontrado");
    }
  }

  if (datos.eventTypeId !== undefined) {
    const tipo = await db.eventType.findUnique({ where: { id: datos.eventTypeId } });
    if (!tipo) {
      throw new NotFoundError("Tipo de evento no encontrado");
    }
  }

  const startsAt = datos.startsAt !== undefined ? new Date(datos.startsAt) : existing.startsAt;
  const endsAt = datos.endsAt !== undefined ? new Date(datos.endsAt) : existing.endsAt;
  if (endsAt <= startsAt) {
    throw new ValidationError("La fecha de término debe ser posterior al inicio");
  }

  const updateData = {};
  if (datos.title !== undefined) updateData.title = datos.title;
  if (datos.clientId !== undefined) updateData.clientId = datos.clientId;
  if (datos.eventTypeId !== undefined) updateData.eventTypeId = datos.eventTypeId;
  if (datos.startsAt !== undefined) updateData.startsAt = startsAt;
  if (datos.endsAt !== undefined) updateData.endsAt = endsAt;
  if (datos.attendees !== undefined) updateData.attendees = datos.attendees;
  if (datos.location !== undefined) updateData.location = datos.location;
  if (datos.needs !== undefined) updateData.needs = datos.needs;

  return db.event.update({
    where: { id: numericId },
    data: updateData,
    include: {
      client: { select: { id: true, name: true } },
      eventType: { select: { id: true, name: true } },
    },
  });
}

