import { Prisma } from "@prisma/client";

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
          event: {
            select: { id: true, title: true, startsAt: true, endsAt: true },
          },
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
          payments: true,
        },
      });
    },

    async crear(data) {
      // 1. Validar existencia del cliente
      const cliente = await db.client.findUnique({
        where: { id: data.clientId },
      });
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
        const err = new Error(
          "El evento seleccionado no pertenece al cliente indicado",
        );
        err.statusCode = 400;
        throw err;
      }

      let totalCalculado = new Prisma.Decimal(0);
      const itemsPreparados = data.items.map((item) => {
        const quantity = item.quantity;
        const unitPrice = new Prisma.Decimal(item.unitPrice);
        const subtotal = unitPrice.times(quantity);
        totalCalculado = totalCalculado.plus(subtotal);

        return {
          concept: item.concept.trim(),
          quantity,
          unitPrice,
          subtotal,
        };
      });

      // Validar límite superior de columna Decimal(12,2) en PostgreSQL
      if (totalCalculado.greaterThan("9999999999.99")) {
        const err = new Error(
          "El importe total excede el límite máximo permitido por el sistema",
        );
        err.statusCode = 400;
        throw err;
      }

      const date = new Date();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const code = `COT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}-${randomSuffix}`;
        try {
          return await db.$transaction(async (tx) =>
            tx.quote.create({
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
            }),
          );
        } catch (error) {
          const duplicateCode =
            error.code === "P2002" &&
            Array.isArray(error.meta?.target) &&
            error.meta.target.includes("code");
          if (!duplicateCode) throw error;
          // PostgreSQL requiere una transacción nueva después de un conflicto único.
        }
      }
      const err = new Error(
        "No se pudo generar un código único para la cotización. Intenta nuevamente",
      );
      err.statusCode = 409;
      throw err;
    },

    async enviarARevision(id) {
      if (!id || typeof id !== "string") {
        const err = new Error("Identificador de cotización inválido");
        err.statusCode = 400;
        throw err;
      }

      // Transición protegida contra concurrencia: solo de BORRADOR a EN_REVISION
      const resultado = await db.quote.updateMany({
        where: { id, status: "BORRADOR" },
        data: { status: "EN_REVISION" },
      });

      if (resultado.count === 0) {
        const cotizacionActual = await db.quote.findUnique({ where: { id } });
        if (!cotizacionActual) {
          const err = new Error("Cotización no encontrada");
          err.statusCode = 404;
          throw err;
        }
        const err = new Error(
          `Transición inválida: solo se pueden enviar a revisión cotizaciones en estado BORRADOR (estado actual: ${cotizacionActual.status})`,
        );
        err.statusCode = 400;
        throw err;
      }

      return db.quote.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
          items: true,
        },
      });
    },

    async aprobar(id, authUser = null) {
      if (!id || typeof id !== "string") {
        const err = new Error("Identificador de cotización inválido");
        err.statusCode = 400;
        throw err;
      }

      // Autenticación estricta: NO simular auth ni aceptar cabeceras inyectables
      // Si no existe identidad de sesión autenticada real con rol 'gerente', denegar por defecto
      const role = authUser && authUser.role ? String(authUser.role).toLowerCase() : "";
      const isVerifiedManager = Boolean(authUser && authUser.authenticated && (role === "gerente" || role === "manager" || role === "admin"));

      if (!isVerifiedManager) {
        const err = new Error(
          "Aprobación denegada: la autenticación compartida del servidor aún no está configurada o el usuario no posee rol de gerente verificado. No se aceptan cabeceras simuladas."
        );
        err.statusCode = 403;
        throw err;
      }

      // Transición protegida contra concurrencia: solo de EN_REVISION a APROBADA
      // Prohibido saltar directamente desde BORRADOR ni doble aprobación
      const approverName = authUser.name || authUser.email || authUser.id || "Gerente Autorizado";
      const resultado = await db.quote.updateMany({
        where: { id, status: "EN_REVISION" },
        data: {
          status: "APROBADA",
          approvedBy: approverName,
          approvedAt: new Date(),
        },
      });

      if (resultado.count === 0) {
        const cotizacionActual = await db.quote.findUnique({ where: { id } });
        if (!cotizacionActual) {
          const err = new Error("Cotización no encontrada");
          err.statusCode = 404;
          throw err;
        }
        if (cotizacionActual.status === "BORRADOR") {
          const err = new Error(
            "Transición inválida: una cotización debe enviarse a revisión antes de ser aprobada",
          );
          err.statusCode = 400;
          throw err;
        }
        if (cotizacionActual.status === "APROBADA") {
          const err = new Error("La cotización ya fue aprobada previamente");
          err.statusCode = 400;
          throw err;
        }
        const err = new Error(
          `No se puede aprobar una cotización en estado ${cotizacionActual.status}`,
        );
        err.statusCode = 400;
        throw err;
      }

      return db.quote.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
          items: true,
        },
      });
    },
  };
}
