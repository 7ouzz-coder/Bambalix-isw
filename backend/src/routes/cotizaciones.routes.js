import { Router } from "express";
import { quoteController } from "../controllers/cotizaciones.controller.js";
import { requireManagerAuth, validateCreateQuote } from "../middlewares/cotizaciones.validation.js";

export function quoteRoutes(db) {
  const router = Router();
  const controller = quoteController(db);

  router.get("/", controller.listar);
  router.get("/:id", controller.obtenerPorId);
  router.post("/", validateCreateQuote, controller.crear);
  router.post("/:id/submit-review", controller.enviarARevision);
  router.post("/:id/approve", requireManagerAuth, controller.aprobar);

  return router;
}
