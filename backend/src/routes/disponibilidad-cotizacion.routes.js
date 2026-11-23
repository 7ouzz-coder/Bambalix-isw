import { Router } from "express";
import { listarRecursosCotizacion } from "../services/disponibilidad-cotizacion.service.js";

export function quoteResourceRoutes(db) {
  const router = Router();
  router.get("/:eventId", async (req, res, next) => {
    if (!/^[1-9]\d*$/.test(req.params.eventId) || Number(req.params.eventId) > 2147483647)
      return res.status(400).json({ message: "Evento inválido" });
    try { res.json(await listarRecursosCotizacion(db, Number(req.params.eventId))); }
    catch (error) { if (error.status === 404) return res.status(404).json({ message: error.message }); next(error); }
  });
  return router;
}
