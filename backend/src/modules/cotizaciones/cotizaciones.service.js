export function quoteService(db) {
  return {
    async listar(filtros = {}) {
      const where = {};
      if (filtros.clientId) where.clientId = filtros.clientId;
      if (filtros.eventId) where.eventId = Number(filtros.eventId);
      if (filtros.status) where.status = filtros.status;

      return db.quote.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, email: true, rut: true } },
          event: { select: { id: true, title: true, startsAt: true, endsAt: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });
    },

    async obtenerPorId(id) {
      if (!id || typeof id !== "string") return null;
      return db.quote.findUnique({
        where: { id },
        include: {
          client: true,
          event: {
            include: { eventType: { select: { id: true, name: true } } },
          },
          items: true,
        },
      });
    },

    async crear(data) {
      // 1. Validar existencia del cliente
      const cliente = await db.client.findUnique({ where: { id: data.clientId } });
      if (!cliente) {
        const err = new Error("Cliente no encontrado");
        err.statusCode = 404;
        throw err;
      }

      // 2. Validar existencia del evento real
      const evento = await db.event.findUnique({ where: { id: data.eventId } });
      if (!evento) {
        const err = new Error("Evento no encontrado");
        err.statusCode = 404;
        throw err;
      }

      // 3. Validar vinculación coherente: el evento debe pertenecer al cliente
      if (evento.clientId !== data.clientId) {
        const err = new Error("El evento seleccionado no pertenece al cliente indicado");
        err.statusCode = 400;
        throw err;
      }

      // 4. Calcular importes exactos estrictamente en backend (precios ya incluyen IVA)
      let totalCalculado = 0;
      const itemsPreparados = data.items.map((item) => {
        const quantity = Math.floor(Number(item.quantity));
        const unitPrice = Number(Number(item.unitPrice).toFixed(2));
        const subtotal = Number((quantity * unitPrice).toFixed(2));
        totalCalculado = Number((totalCalculado + subtotal).toFixed(2));

        return {
          concept: item.concept.trim(),
          quantity,
          unitPrice,
          subtotal,
        };
      });

      // 5. Generar código comercial único (ej. COT-YYYYMM-XXXX)
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const code = `COT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${randomSuffix}`;

      // 6. Guardar en base de datos con estado inicial BORRADOR
      return db.quote.create({
        data: {
          code,
          clientId: data.clientId,
          eventId: data.eventId,
          status: "BORRADOR",
          total: totalCalculado,
          notes: data.notes || null,
          items: {
            create: itemsPreparados,
          },
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, title: true } },
          items: true,
        },
      });
    },

    async enviarARevision(id) {
      const quote = await db.quote.findUnique({ where: { id } });
      if (!quote) {
        const err = new Error("Cotización no encontrada");
        err.statusCode = 404;
        throw err;
      }

      if (quote.status !== "BORRADOR") {
        const err = new Error(`Solo se pueden enviar a revisión cotizaciones en estado BORRADOR (estado actual: ${quote.status})`);
        err.statusCode = 400;
        throw err;
      }

      return db.quote.update({
        where: { id },
        data: { status: "EN_REVISION" },
        include: {
          client: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
          items: true,
        },
      });
    },

    async aprobar(id, authUser = {}) {
      // 1. Validar rol de gerente mediante identidad autenticada
      const role = authUser.role ? String(authUser.role).toLowerCase() : "";
      if (role !== "gerente" && role !== "manager" && role !== "admin") {
        const err = new Error("Acceso denegado: solo un usuario con rol de gerente puede aprobar cotizaciones");
        err.statusCode = 403;
        throw err;
      }

      const quote = await db.quote.findUnique({ where: { id } });
      if (!quote) {
        const err = new Error("Cotización no encontrada");
        err.statusCode = 404;
        throw err;
      }

      if (quote.status === "APROBADA") {
        const err = new Error("La cotización ya ha sido aprobada previamente");
        err.statusCode = 400;
        throw err;
      }

      const approverName = authUser.name || authUser.email || authUser.id || "Gerente Autenticado";

      // 2. Aprobar comercialmente. No confirma el evento ni asigna equipos (responsabilidad de Ángel y Guillermo)
      return db.quote.update({
        where: { id },
        data: {
          status: "APROBADA",
          approvedBy: approverName,
          approvedAt: new Date(),
        },
        include: {
          client: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
          items: true,
        },
      });
    },
  };
}
