export function paymentService(db) {
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

      const totalCotizacion = Number(quote.total);

      // Regla estricta: SOLO los pagos VERIFICADOS reducen el saldo
      const totalVerificado = quote.payments
        .filter((p) => p.status === "VERIFICADO")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Pagos solo recepcionados/registrados pero NO verificados
      const totalRegistradoPendiente = quote.payments
        .filter((p) => p.status === "REGISTRADO")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const saldoPendiente = Math.max(0, Number((totalCotizacion - totalVerificado).toFixed(2)));

      let estadoFinanciero = "PENDIENTE";
      if (totalVerificado >= totalCotizacion) {
        estadoFinanciero = "PAGADO_TOTAL";
      } else if (totalVerificado > 0) {
        estadoFinanciero = "ABONADO";
      }

      return {
        quoteId: quote.id,
        quoteCode: quote.code,
        quoteStatus: quote.status,
        totalCotizacion,
        totalVerificado,
        totalRegistradoPendiente,
        saldoPendiente,
        estadoFinanciero,
      };
    },

    async registrarRecepcion(data) {
      // 1. Validar existencia de la cotización
      const quote = await db.quote.findUnique({
        where: { id: data.quoteId },
        include: { payments: true },
      });

      if (!quote) {
        const err = new Error("Cotización no encontrada");
        err.statusCode = 404;
        throw err;
      }

      // 2. Calcular saldo pendiente considerando ÚNICAMENTE los pagos ya verificados
      const totalCotizacion = Number(quote.total);
      const totalVerificado = quote.payments
        .filter((p) => p.status === "VERIFICADO")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const saldoPendiente = Number((totalCotizacion - totalVerificado).toFixed(2));
      const montoPago = Number(Number(data.amount).toFixed(2));

      if (montoPago > saldoPendiente) {
        const err = new Error(
          `El monto ingresado ($${montoPago.toLocaleString("es-CL")}) supera el saldo pendiente de la cotización ($${saldoPendiente.toLocaleString("es-CL")})`
        );
        err.statusCode = 400;
        throw err;
      }

      // 3. Registrar con estado inicial REGISTRADO (NO reduce saldo hasta verificar)
      return db.payment.create({
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
    },

    async verificar(paymentId, authVerifier = null) {
      if (!paymentId || typeof paymentId !== "string") {
        const err = new Error("Identificador de pago inválido");
        err.statusCode = 400;
        throw err;
      }

      // 1. Validar existencia y estado actual del pago
      const paymentActual = await db.payment.findUnique({
        where: { id: paymentId },
        include: { quote: { include: { payments: true } } },
      });

      if (!paymentActual) {
        const err = new Error("Registro de pago no encontrado");
        err.statusCode = 404;
        throw err;
      }

      // 2. Idempotencia y prevención de doble verificación: rechazar si ya está verificado
      if (paymentActual.status === "VERIFICADO") {
        const err = new Error("Este pago ya fue verificado previamente y no puede verificarse dos veces");
        err.statusCode = 400;
        throw err;
      }

      if (paymentActual.status !== "REGISTRADO") {
        const err = new Error(`Solo se pueden verificar pagos en estado REGISTRADO (estado actual: ${paymentActual.status})`);
        err.statusCode = 400;
        throw err;
      }

      // 3. Control de concurrencia: asegurar que la suma de verificados no exceda el total
      const totalCotizacion = Number(paymentActual.quote.total);
      const otrosVerificados = paymentActual.quote.payments
        .filter((p) => p.status === "VERIFICADO" && p.id !== paymentId)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const nuevoTotal = Number((otrosVerificados + Number(paymentActual.amount)).toFixed(2));
      if (nuevoTotal > totalCotizacion) {
        const err = new Error("La verificación de este pago sobrepasaría el monto total de la cotización");
        err.statusCode = 400;
        throw err;
      }

      const verifierName = (authVerifier && (authVerifier.name || authVerifier.id)) || "Tesoreria / Administracion";

      // 4. Actualización condicional atómica en Prisma para garantizar idempotencia bajo concurrencia
      const updateResult = await db.payment.updateMany({
        where: {
          id: paymentId,
          status: "REGISTRADO", // Solo si sigue estando REGISTRADO en la fila física
        },
        data: {
          status: "VERIFICADO",
          verifiedBy: verifierName,
          verifiedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        const err = new Error("El pago ya fue verificado concurrentemente por otra operación");
        err.statusCode = 400;
        throw err;
      }

      return db.payment.findUnique({
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
    },
  };
}
