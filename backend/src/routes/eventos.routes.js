import { Router } from "express";
import { validateBody } from "../middlewares/eventos.validation.js";
import { crearEventoSchema, editarEventoSchema } from "../schemas/eventos.schema.js";
import {
  createEventoController,
  listEventosController,
  listTiposEventoController,
  updateEventoController,
} from "../controllers/eventos.controller.js";

export function eventosRoutes(db) {
  const router = Router();

  // POST /api/v1/events — Crear evento
  router.post("/", validateBody(crearEventoSchema), createEventoController(db));

  // GET /api/v1/events — Listar eventos
  router.get("/", listEventosController(db));

  // GET /api/v1/events/types — Listar tipos de evento
  router.get("/types", listTiposEventoController(db));

  // PATCH /api/v1/events/:id — Editar evento
  router.patch("/:id", validateBody(editarEventoSchema), updateEventoController(db));

  return router;
}
