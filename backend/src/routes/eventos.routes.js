import { Router } from "express";
import { validateBody, validateQuery, validateParams } from "../middlewares/eventos.validation.js";
import {
  crearEventoSchema,
  editarEventoParamsSchema,
  editarEventoSchema,
  consultarAgendaSchema,
} from "../schemas/eventos.schema.js";
import {
  createEventoController,
  listEventosController,
  listEventosPublicosController,
  listTiposEventoController,
  updateEventoController,
} from "../controllers/eventos.controller.js";

export function eventosRoutes(db) {
  const router = Router();

  // POST /api/v1/events — Crear evento
  router.post("/", validateBody(crearEventoSchema), createEventoController(db));

  // GET /api/v1/events — Listar eventos internos (soporta consulta de agenda por periodo ?from=...&to=...)
  router.get("/", validateQuery(consultarAgendaSchema), listEventosController(db));

  // GET /api/v1/events/public — Consulta de agenda externa/pública para clientes (solo campos autorizados)
  router.get("/public", validateQuery(consultarAgendaSchema), listEventosPublicosController(db));

  // GET /api/v1/events/types — Listar tipos de evento
  router.get("/types", listTiposEventoController(db));

  // PATCH /api/v1/events/:id — Editar evento
  router.patch("/:id", validateParams(editarEventoParamsSchema), validateBody(editarEventoSchema), updateEventoController(db));

  return router;
}
