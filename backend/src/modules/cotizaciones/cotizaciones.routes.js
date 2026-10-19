import { Router } from "express";
import { quoteController } from "./cotizaciones.controller.js";

export function quoteRoutes(db) {
  const router = Router();
  const controller = quoteController(db);

  router.get("/", controller.listar);
  router.get("/:id", controller.obtenerPorId);
  router.post("/", controller.crear);
  router.post("/:id/submit-review", controller.enviarARevision);
  router.post("/:id/approve", controller.aprobar);

  return router;
}
