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
      
      // Separación estricta: solo los pagos VERIFICADOS reducen el saldo
      const totalVerificado = quote.payments
        .filter((p) => p.status === "VERIFICADO")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Pagos solo registrados pero no verificados aún
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

      // 2. Calcular saldo pendiente considerando SOLO los pagos ya verificados
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

      // 3. Registrar recepción con estado inicial REGISTRADO (NO verificado aún)
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

    async verificar(paymentId, authUser = {}) {
      // 1. Consultar el pago y su cotización asociada
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: { quote: { include: { payments: true } } },
      });

      if (!payment) {
        const err = new Error("Registro de pago no encontrado");
        err.statusCode = 404;
        throw err;
      }

      // 2. IMPEDIR que un mismo pago se contabilice o verifique dos veces
      if (payment.status === "VERIFICADO") {
        const err = new Error("Este pago ya fue verificado previamente y no puede verificarse dos veces");
        err.statusCode = 400;
        throw err;
      }

      if (payment.status !== "REGISTRADO") {
        const err = new Error(`Solo se pueden verificar pagos en estado REGISTRADO (estado actual: ${payment.status})`);
        err.statusCode = 400;
        throw err;
      }

      // 3. Control de concurrencia: validar que al verificar este pago no se sobrepase el total
      const totalCotizacion = Number(payment.quote.total);
      const otrosPagosVerificados = payment.quote.payments
        .filter((p) => p.status === "VERIFICADO" && p.id !== paymentId)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const nuevoTotalVerificado = Number((otrosPagosVerificados + Number(payment.amount)).toFixed(2));
      if (nuevoTotalVerificado > totalCotizacion) {
        const err = new Error("La verificación de este pago sobrepasaría el monto total de la cotización");
        err.statusCode = 400;
        throw err;
      }

      const verifierName = authUser.name || authUser.id || "Finanzas / Tesorería";

      // 4. Actualizar estado a VERIFICADO
      return db.payment.update({
        where: { id: paymentId },
        data: {
          status: "VERIFICADO",
          verifiedBy: verifierName,
          verifiedAt: new Date(),
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
  };
}
