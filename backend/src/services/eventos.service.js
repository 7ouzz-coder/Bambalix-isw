export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
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

export async function listEventos(db) {
  return db.event.findMany({
    include: {
      client: { select: { id: true, name: true } },
      eventType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listTiposEvento(db) {
  return db.eventType.findMany({
    orderBy: { name: "asc" },
  });
}
