import * as equiposService from "../services/equipos.service.js";

export function equiposController(db) {
  async function listarEquipos(_req, res) {
    const equipment = await equiposService.listarEquipos(db, res.locals.equipmentFilters);
    res.json(equipment);
  }

  async function listarCategoriasEquipos(_req, res) {
    res.json(await equiposService.listarCategoriasEquipos(db));
  }

  async function listarPaginaEquipos(_req, res) {
    res.json(await equiposService.listarPaginaEquipos(db, res.locals.equipmentPage));
  }

  async function crearEquipo(req, res, next) {
    try {
      const equipment = await equiposService.crearEquipo(db, req.body);
      res.status(201).json(equipment);
    } catch (error) {
      if (error.status === 409)
        return res.status(409).json({ message: error.message });
      next(error);
    }
  }

  async function cambiarEstadoEquipo(req, res, next) {
    try {
      res.json(await equiposService.cambiarEstadoEquipo(db, res.locals.equipmentId, req.body));
    } catch (error) {
      if (error.status === 404 || error.status === 409)
        return res.status(error.status).json({ message: error.message });
      next(error);
    }
  }

  async function listarHistorialEquipo(_req, res, next) {
    try {
      res.json(await equiposService.listarHistorialEquipo(db, res.locals.equipmentId));
    } catch (error) {
      if (error.status === 404)
        return res.status(404).json({ message: error.message });
      next(error);
    }
  }

  async function editarEquipo(req, res, next) {
    try {
      res.json(await equiposService.editarEquipo(db, res.locals.equipmentId, req.body));
    } catch (error) {
      if (error.status === 404 || error.status === 409)
        return res.status(error.status).json({ message: error.message });
      next(error);
    }
  }

  async function listarPaginaHistorialEquipo(_req, res, next) {
    try {
      res.json(await equiposService.listarPaginaHistorialEquipo(db, res.locals.equipmentId, res.locals.equipmentHistoryPage));
    } catch (error) {
      if (error.status === 404) return res.status(404).json({ message: error.message });
      next(error);
    }
  }

  return { listarEquipos, listarPaginaEquipos, listarCategoriasEquipos, crearEquipo, cambiarEstadoEquipo, listarHistorialEquipo, listarPaginaHistorialEquipo, editarEquipo };
}
