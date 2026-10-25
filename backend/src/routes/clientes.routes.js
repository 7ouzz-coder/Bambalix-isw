import { Router } from "express";
import { clientController } from "../controllers/clientes.controller.js";
import { validateCreateClient, validateUpdateClient } from "../middlewares/clientes.validation.js";

export function clientRoutes(db) {
  const router = Router();
  const controller = clientController(db);

  router.get("/", controller.listar);
  router.get("/:id", controller.obtenerPorId);
  router.post("/", validateCreateClient, controller.crear);
  router.patch("/:id", validateUpdateClient, controller.actualizar);

  return router;
}
