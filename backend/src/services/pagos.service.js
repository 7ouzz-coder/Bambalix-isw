import { Prisma } from "@prisma/client";
import { paymentVerifierSchema } from "../schemas/pagos.schema.js";

export function paymentService(
  db,
  { authorizePaymentVerification = null } = {},
) {
  return {
    async listar(filtros = {}) {
      const where = {};
      if (filtros.quoteId) where.quoteId = filtros.quoteId;
      if (filtros.status) where.status = filtros.status;
      if (filtros.method) where.method = filtros.method;

      return db.payment.findMany({
        where,
        include: {
          quote: {
            select: {
              id: true,
              code: true,
              total: true,
              status: true,
              client: { select: { id: true, name: true } },
              event: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },

    async obtenerPorId(id) {
      if (!id || typeof id !== "string") return null;
      return db.payment.findUnique({
        where: { id },
        include: {
          quote: {
            include: {
              client: { select: { id: true, name: true } },
              event: { select: { id: true, title: true } },
            },
          },
        },
      });
    },

    async obtenerEstadoFinanciero(quoteId) {
      const quote = await db.quote.findUnique({
        where: { id: quoteId },
        include: { payments: true },
      });

      if (!quote) {
        const err = new Error("Cotización no encontrada");
        err.statusCode = 404;
        throw err;
      }

      const totalCotizacion = new Prisma.Decimal(quote.total);

      // Regla estricta: SOLO los pagos VERIFICADOS reducen el saldo
      const totalVerificado = quote.payments
        .filter((p) => p.status === "VERIFICADO")
        .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));

      // Pagos solo recepcionados/registrados pero NO verificados
      const totalRegistradoPendiente = quote.payments
        .filter((p) => p.status === "REGISTRADO")
        .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));

      const saldoPendiente = Prisma.Decimal.max(
        0,
        totalCotizacion.minus(totalVerificado),
      );

      let estadoFinanciero = "PENDIENTE";
      if (totalVerificado.greaterThanOrEqualTo(totalCotizacion)) {
        estadoFinanciero = "PAGADO_TOTAL";
      } else if (totalVerificado.greaterThan(0)) {
        estadoFinanciero = "ABONADO";
      }

      return {
        quoteId: quote.id,
        quoteCode: quote.code,
        quoteStatus: quote.status,
        totalCotizacion: totalCotizacion.toNumber(),
        totalVerificado: totalVerificado.toNumber(),
        totalRegistradoPendiente: totalRegistradoPendiente.toNumber(),
        saldoPendiente: saldoPendiente.toNumber(),
        estadoFinanciero,
      };
    },

    async registrarRecepcion(data) {
      return db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM quotes WHERE id = ${data.quoteId} FOR UPDATE`;
        const quote = await tx.quote.findUnique({
          where: { id: data.quoteId },
          include: { payments: true },
        });

        if (!quote) {
          const err = new Error("Cotización no encontrada");
          err.statusCode = 404;
          throw err;
        }

        // 2. Calcular saldo pendiente considerando ÚNICAMENTE los pagos ya verificados
        const totalCotizacion = new Prisma.Decimal(quote.total);
        const totalVerificado = quote.payments
          .filter((p) => p.status === "VERIFICADO")
          .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));

        const saldoPendiente = totalCotizacion.minus(totalVerificado);
        const montoPago = new Prisma.Decimal(data.amount);

        if (montoPago.greaterThan(saldoPendiente)) {
          const err = new Error(
            "El monto ingresado supera el saldo pendiente de la cotización",
          );
          err.statusCode = 400;
          throw err;
        }

        // 3. Registrar con estado inicial REGISTRADO (NO reduce saldo hasta verificar)
        return tx.payment.create({
          data: {
            quoteId: data.quoteId,
            method: data.method,
            amount: montoPago,
            reference: data.reference || null,
            status: "REGISTRADO",
            registeredBy: data.registeredBy || "Recepción Comercial",
          },
          include: {
            quote: {
              select: {
                id: true,
                code: true,
                total: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
        });
      });
    },

    async verificar(paymentId, authVerifier = null) {
      const identity = paymentVerifierSchema.safeParse(authVerifier);
      if (!identity.success) {
        const err = new Error(
          "Se requiere una sesión interna válida para verificar pagos",
        );
        err.statusCode = 401;
        throw err;
      }
      if (
        typeof authorizePaymentVerification !== "function" ||
        (await authorizePaymentVerification(identity.data)) !== true
      ) {
        const err = new Error(
          "La verificación requiere autorización interna confirmada",
        );
        err.statusCode = 403;
        throw err;
      }
      if (
        typeof paymentId !== "string" ||
        !paymentId.trim() ||
        paymentId.length > 100
      ) {
        const err = new Error("Identificador de pago inválido");
        err.statusCode = 400;
        throw err;
      }

      return db.$transaction(async (tx) => {
        const initial = await tx.payment.findUnique({
          where: { id: paymentId },
          select: { quoteId: true },
        });
        if (!initial) {
          const err = new Error("Registro de pago no encontrado");
          err.statusCode = 404;
          throw err;
        }
        // Serializa las verificaciones de todos los pagos de una misma cotización.
        const locked =
          await tx.$queryRaw`SELECT id FROM quotes WHERE id = ${initial.quoteId} FOR UPDATE`;
        if (!locked.length) {
          const err = new Error("Cotización no encontrada");
          err.statusCode = 404;
          throw err;
        }
        const paymentActual = await tx.payment.findUnique({
          where: { id: paymentId },
          include: { quote: { include: { payments: true } } },
        });

        if (!paymentActual || paymentActual.quoteId !== initial.quoteId) {
          const err = new Error("El pago cambió. Actualiza el listado");
          err.statusCode = 409;
          throw err;
        }

        // 2. Idempotencia y prevención de doble verificación: rechazar si ya está verificado
        if (paymentActual.status === "VERIFICADO") {
          const err = new Error(
            "Este pago ya fue verificado previamente y no puede verificarse dos veces",
          );
          err.statusCode = 409;
          throw err;
        }

        if (paymentActual.status !== "REGISTRADO") {
          const err = new Error(
            `Solo se pueden verificar pagos en estado REGISTRADO (estado actual: ${paymentActual.status})`,
          );
          err.statusCode = 409;
          throw err;
        }

        // 3. Control de concurrencia: asegurar que la suma de verificados no exceda el total
        const totalCotizacion = new Prisma.Decimal(paymentActual.quote.total);
        const otrosVerificados = paymentActual.quote.payments
          .filter((p) => p.status === "VERIFICADO" && p.id !== paymentId)
          .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));

        const amount = new Prisma.Decimal(paymentActual.amount);
        if (!amount.isFinite() || amount.lessThanOrEqualTo(0)) {
          const err = new Error("El pago debe tener un monto positivo");
          err.statusCode = 409;
          throw err;
        }
        const nuevoTotal = otrosVerificados.plus(amount);
        if (nuevoTotal.greaterThan(totalCotizacion)) {
          const err = new Error(
            "La verificación de este pago sobrepasaría el monto total de la cotización",
          );
          err.statusCode = 409;
          throw err;
        }

        // 4. Actualización condicional atómica en Prisma para garantizar idempotencia bajo concurrencia
        const updateResult = await tx.payment.updateMany({
          where: {
            id: paymentId,
            quoteId: initial.quoteId,
            status: "REGISTRADO", // Solo si sigue estando REGISTRADO en la fila física
          },
          data: {
            status: "VERIFICADO",
            verifiedBy: identity.data.id,
            verifiedAt: new Date(),
          },
        });

        if (updateResult.count !== 1) {
          const err = new Error(
            "El pago ya fue verificado concurrentemente por otra operación",
          );
          err.statusCode = 409;
          throw err;
        }

        return tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            quote: {
              select: {
                id: true,
                code: true,
                total: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
        });
      });
    },
  };
}
