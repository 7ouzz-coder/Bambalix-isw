import { validateListFilters } from "../middlewares/cotizaciones.validation.js";
import { Router } from "express";
import { quoteController } from "../controllers/cotizaciones.controller.js";
import { requireManagerAuth, validateQuoteInput } from "../middlewares/cotizaciones.validation.js";

export function quoteRoutes(db) {
  const router = Router();
  const controller = quoteController(db);

  router.get("/", validateListFilters, controller.listar);
  router.get("/:id", controller.obtenerPorId);
  router.post("/", validateQuoteInput, controller.crear);
  router.patch("/:id", validateQuoteInput, controller.editarBorrador);
  router.post("/:id/submit-review", controller.enviarARevision);
  router.post("/:id/approve", requireManagerAuth, controller.aprobar);

  return router;
}
