import { Router } from "express";
import { reemplazosController } from "../controllers/reemplazos.controller.js";
import { identidadReemplazos, exigirGerenteReemplazos, validarReemplazo, validarDecisionReemplazo, validarPaginaReemplazos, validarIdReemplazo } from "../middlewares/reemplazos.validation.js";

export function reemplazosRoutes(db) {
  const router = Router({ mergeParams: true });
  const controller = reemplazosController(db);
  router.use(identidadReemplazos);
  router.get("/", validarPaginaReemplazos, controller.listar);
  router.post("/", validarReemplazo, controller.crear);
  router.patch("/:replacementId/decision", exigirGerenteReemplazos, validarIdReemplazo, validarDecisionReemplazo, controller.decidir);
  return router;
}
