import { Router } from "express";
import { eventosController } from "./eventos.controller.js";
import { crearEventoSchema } from "./eventos.schema.js";
import { validateBody } from "../../middlewares/validate-body.js";

export function eventosRoutes(db) {
  const router = Router();
  const controller = eventosController(db);
  router.get("/", controller.listar);
  router.get("/types", controller.listarTipos);
  router.post("/", validateBody(crearEventoSchema), controller.crear);
  return router;
}
