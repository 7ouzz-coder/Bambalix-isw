import { Router } from "express";
import { clientController } from "./clientes.controller.js";

export function clientRoutes(db) {
  const router = Router();
  const controller = clientController(db);

  router.get("/", controller.listar);
  router.get("/:id", controller.obtenerPorId);
  router.post("/", controller.crear);
  router.patch("/:id", controller.actualizar);

  return router;
}
