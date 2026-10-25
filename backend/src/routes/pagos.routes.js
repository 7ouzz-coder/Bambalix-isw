import { Router } from "express";
import { paymentController } from "../controllers/pagos.controller.js";
import { requirePaymentVerifier, validateCreatePayment } from "../middlewares/pagos.validation.js";

export function paymentRoutes(db) {
  const router = Router();
  const controller = paymentController(db);

  router.get("/", controller.listar);
  router.get("/quote/:quoteId/summary", controller.obtenerEstadoFinanciero);
  router.get("/:id", controller.obtenerPorId);
  router.post("/", validateCreatePayment, controller.registrarRecepcion);
  router.post("/:id/verify", requirePaymentVerifier, controller.verificar);

  return router;
}
