import { Router } from "express";
import { validateRequestList } from "../middlewares/solicitudes-internas.validation.js";
import { internalRequestsController } from "../controllers/solicitudes-internas.controller.js";
export function internalRequestRoutes(db) {
  const router = Router();
  router.get("/", validateRequestList, internalRequestsController(db));
  return router;
}
