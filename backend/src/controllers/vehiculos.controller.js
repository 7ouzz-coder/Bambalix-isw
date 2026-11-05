import * as vehiculosService from "../services/vehiculos.service.js";

export function vehiculosController(db) {
  async function listar(_req, res) {
    res.json(await vehiculosService.listarVehiculos(db, res.locals.vehicleFilters));
  }
  async function listarTipos(_req, res) {
    res.json(await vehiculosService.listarTiposVehiculos(db));
  }
  async function listarPagina(_req, res) {
    res.json(await vehiculosService.listarPaginaVehiculos(db, res.locals.vehiclePage));
  }
  async function crear(req, res, next) {
    try {
      res.status(201).json(await vehiculosService.crearVehiculo(db, req.body));
    } catch (error) {
      if (error.status === 409) return res.status(409).json({ message: error.message });
      next(error);
    }
  }
  async function editar(req, res, next) {
    try {
      res.json(await vehiculosService.editarVehiculo(db, res.locals.vehicleId, req.body));
    } catch (error) {
      if (error.status === 404 || error.status === 409)
        return res.status(error.status).json({ message: error.message, code: error.code });
      next(error);
    }
  }
  return { listar, listarPagina, listarTipos, crear, editar };
}
