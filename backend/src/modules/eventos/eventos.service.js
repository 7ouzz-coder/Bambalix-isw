export function eventosService(db) {
  return {
    async crear(datos) {
      const cliente = await db.client.findUnique({ where: { id: datos.clientId } });
      if (!cliente) throw Object.assign(new Error("Cliente no encontrado"), { statusCode: 404 });

      const tipo = await db.eventType.findUnique({ where: { id: datos.eventTypeId } });
      if (!tipo) throw Object.assign(new Error("Tipo de evento no encontrado"), { statusCode: 404 });

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
    },
    listar() {
      return db.event.findMany({
        include: {
          client: { select: { id: true, name: true } },
          eventType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    },
    listarTipos() {
      return db.eventType.findMany({ orderBy: { name: "asc" } });
    },
  };
}
