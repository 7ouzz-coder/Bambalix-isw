import { createPaymentSchema } from "./pagos.schema.js";
import { paymentService } from "./pagos.service.js";

function formatearErroresZod(error) {
  if (Array.isArray(error?.issues)) {
    return error.issues.map((i) => i.message).filter(Boolean).join("; ");
  }
  return "Datos de pago inválidos";
}

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
        const parseResult = createPaymentSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            message: formatearErroresZod(parseResult.error),
            issues: parseResult.error.issues,
          });
        }

        const nuevoPago = await service.registrarRecepcion(parseResult.data);
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
        const authUser = {
          name: req.headers["x-user-name"] || req.user?.name || "Verificador de Pagos",
          id: req.headers["x-user-id"] || req.user?.id || "user_verificador",
        };

        const pagoVerificado = await service.verificar(req.params.id, authUser);
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
