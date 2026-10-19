import { createQuoteSchema } from "./cotizaciones.schema.js";
import { quoteService } from "./cotizaciones.service.js";

function formatearErroresZod(error) {
  if (Array.isArray(error?.issues)) {
    return error.issues.map((i) => i.message).filter(Boolean).join("; ");
  }
  return "Datos de cotización inválidos";
}

export function quoteController(db) {
  const service = quoteService(db);

  return {
    async listar(req, res, next) {
      try {
        const { clientId, eventId, status } = req.query;
        const quotes = await service.listar({ clientId, eventId, status });
        res.json(quotes);
      } catch (error) {
        next(error);
      }
    },

    async obtenerPorId(req, res, next) {
      try {
        const quote = await service.obtenerPorId(req.params.id);
        if (!quote) {
          return res.status(404).json({ message: "Cotización no encontrada" });
        }
        res.json(quote);
      } catch (error) {
        next(error);
      }
    },

    async crear(req, res, next) {
      try {
        const parseResult = createQuoteSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            message: formatearErroresZod(parseResult.error),
            issues: parseResult.error.issues,
          });
        }

        const nuevaCotizacion = await service.crear(parseResult.data);
        res.status(201).json(nuevaCotizacion);
      } catch (error) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
      }
    },

    async enviarARevision(req, res, next) {
      try {
        const cotizacionActualizada = await service.enviarARevision(req.params.id);
        res.status(200).json(cotizacionActualizada);
      } catch (error) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
      }
    },

    async aprobar(req, res, next) {
      try {
        // Extraer identidad autenticada desde headers o req.user
        const authUser = {
          role: req.headers["x-user-role"] || req.user?.role || "",
          name: req.headers["x-user-name"] || req.user?.name || "",
          id: req.headers["x-user-id"] || req.user?.id || "",
        };

        const cotizacionAprobada = await service.aprobar(req.params.id, authUser);
        res.status(200).json(cotizacionAprobada);
      } catch (error) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
      }
    },
  };
}
