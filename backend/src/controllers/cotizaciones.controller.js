import { quoteService } from "../services/cotizaciones.service.js";

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
        const nuevaCotizacion = await service.crear(req.validatedBody || req.body);
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
        const authUser = req.authenticatedManager || req.user || null;
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
