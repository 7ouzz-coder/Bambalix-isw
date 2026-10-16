import {
  NotFoundError,
  ValidationError,
  ConflictError,
  createEvento,
  listEventos,
  listTiposEvento,
  updateEvento,
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
      if (error instanceof ConflictError || error.statusCode === 409) {
        return res.status(409).json({ message: error.message, conflict: error.conflict });
      }
      next(error);
    }
  };
}

export function listEventosController(db) {
  return async (req, res, next) => {
    try {
      const query = req.validatedQuery || req.query || {};
      const eventos = await listEventos(db, query);
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

export function updateEventoController(db) {
  return async (req, res, next) => {
    try {
      const evento = await updateEvento(db, req.params.id, req.body);
      res.json(evento);
    } catch (error) {
      if (error instanceof NotFoundError || error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof ConflictError || error.statusCode === 409) {
        return res.status(409).json({ message: error.message, conflict: error.conflict });
      }
      if (error instanceof ValidationError || error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  };
}


