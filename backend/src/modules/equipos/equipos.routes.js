import { Router } from "express";
import { equipmentController } from "./equipos.controller.js";
import { equipmentSchema } from "./equipos.schema.js";
import { validateBody } from "../../middlewares/validate-body.js";

export function equipmentRoutes(db) {
  const router = Router();
  const controller = equipmentController(db);
  router.get("/", controller.listar);
  router.post("/", validateBody(equipmentSchema, "Revisa el nombre, la categoría y el código del equipo"), controller.crear);
  return router;
}
