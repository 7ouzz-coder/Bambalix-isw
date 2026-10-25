import { Router } from "express";
import { paymentController } from "./pagos.controller.js";

export function paymentRoutes(db) {
  const router = Router();
  const controller = paymentController(db);

  router.get("/", controller.listar);
  router.get("/quote/:quoteId/summary", controller.obtenerEstadoFinanciero);
  router.get("/:id", controller.obtenerPorId);
  router.post("/", controller.registrarRecepcion);
  router.post("/:id/verify", controller.verificar);

  return router;
}
