import {
  NotFoundError,
  createEvento,
  listEventos,
  listTiposEvento,
} from "../services/eventos.service.js";

export function createEventoController(db) {
  return async (req, res, next) => {
    try {
      const evento = await createEvento(db, req.body);
      res.status(201).json(evento);
    } catch (error) {
      if (error instanceof NotFoundError || error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  };
}

export function listEventosController(db) {
  return async (_req, res, next) => {
    try {
      const eventos = await listEventos(db);
      res.json(eventos);
    } catch (error) {
      next(error);
    }
  };
}

export function listTiposEventoController(db) {
  return async (_req, res, next) => {
    try {
      const tipos = await listTiposEvento(db);
      res.json(tipos);
    } catch (error) {
      next(error);
    }
  };
}
