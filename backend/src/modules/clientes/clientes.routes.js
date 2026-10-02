import { Router } from "express";
import { clientController } from "./clientes.controller.js";
import { clientSchema } from "./clientes.schema.js";
import { validateBody } from "../../middlewares/validate-body.js";

export function clientRoutes(db) {
  const router = Router();
  const controller = clientController(db);
  router.get("/", controller.listar);
  router.post("/", validateBody(clientSchema, "Revisa el nombre, el correo y los datos del cliente"), controller.crear);
  return router;
}
