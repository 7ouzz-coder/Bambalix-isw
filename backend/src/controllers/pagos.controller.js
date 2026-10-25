import { paymentService } from "../services/pagos.service.js";

export function paymentController(db) {
  const service = paymentService(db);

  return {
    async listar(req, res, next) {
      try {
        const { quoteId, status, method } = req.query;
        const payments = await service.listar({ quoteId, status, method });
        res.json(payments);
      } catch (error) {
        next(error);
      }
    },

    async obtenerPorId(req, res, next) {
      try {
        const payment = await service.obtenerPorId(req.params.id);
        if (!payment) {
          return res.status(404).json({ message: "Registro de pago no encontrado" });
        }
        res.json(payment);
      } catch (error) {
        next(error);
      }
    },

    async obtenerEstadoFinanciero(req, res, next) {
      try {
        const summary = await service.obtenerEstadoFinanciero(req.params.quoteId);
        res.json(summary);
      } catch (error) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
      }
    },

    async registrarRecepcion(req, res, next) {
      try {
        const nuevoPago = await service.registrarRecepcion(req.validatedBody || req.body);
        res.status(201).json(nuevoPago);
      } catch (error) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
      }
    },

    async verificar(req, res, next) {
      try {
        const pagoVerificado = await service.verificar(req.params.id, res.locals.paymentVerifier);
        res.status(200).json(pagoVerificado);
      } catch (error) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
      }
    },
  };
}
