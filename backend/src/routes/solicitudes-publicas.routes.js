import { Router } from "express";
import { publicRequestLimit, validatePublicRequest } from "../middlewares/solicitudes-publicas.validation.js";
import { publicRequestsController } from "../controllers/solicitudes-publicas.controller.js";
export function publicRequestRoutes(db) {
 const router = Router();
 router.post("/", publicRequestLimit(), validatePublicRequest, publicRequestsController(db));
 return router;
}
