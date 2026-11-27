import { validateListFilters } from "../middlewares/pagos.validation.js";
import { Router, json } from "express";
import { paymentController } from "../controllers/pagos.controller.js";
import { requirePaymentVerifier, validateCreatePayment, validatePaymentReceipt } from "../middlewares/pagos.validation.js";

export function paymentRoutes(db) {
  const router = Router();
  const controller = paymentController(db);

  router.get("/", validateListFilters, controller.listar);
  router.get("/quote/:quoteId/summary", controller.obtenerEstadoFinanciero);
  router.get("/:id/receipt", controller.obtenerComprobante);
  router.get("/:id", controller.obtenerPorId);
  router.post("/", json({ type: "application/vnd.bambalix.payment+json", limit: "3mb" }), validatePaymentReceipt, validateCreatePayment, controller.registrarRecepcion);
  router.post("/:id/verify", requirePaymentVerifier, controller.verificar);

  return router;
}
