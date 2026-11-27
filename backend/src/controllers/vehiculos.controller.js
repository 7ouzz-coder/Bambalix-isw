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
  async function listarMantenciones(_req, res, next) {
    try { res.json(await vehiculosService.listarMantencionesVehiculo(db, res.locals.vehicleId)); }
    catch (error) { if (error.status === 404) return res.status(404).json({ message: error.message }); next(error); }
  }
  async function crearMantencion(_req, res, next) {
    try { res.status(201).json(await vehiculosService.crearMantencionVehiculo(db, res.locals.vehicleId, res.locals.maintenance)); }
    catch (error) { if (error.status === 404 || error.status === 409) return res.status(error.status).json({ message: error.message }); next(error); }
  }
  async function listarAsignaciones(_req, res, next) {
    try { res.json(await vehiculosService.listarAsignacionesVehiculo(db, res.locals.vehicleId)); }
    catch (error) { if (error.status === 404) return res.status(404).json({ message: error.message }); next(error); }
  }
  async function asignar(_req, res, next) {
    try { res.status(201).json(await vehiculosService.asignarVehiculo(db, res.locals.vehicleId, res.locals.assignment)); }
    catch (error) { if (error.status === 404 || error.status === 409) return res.status(error.status).json({ message: error.message }); next(error); }
  }
  async function eliminar(_req, res, next) {
    try {
      await vehiculosService.eliminarVehiculo(db, res.locals.vehicleId);
      res.status(204).end();
    } catch (error) {
      if (error.status === 404 || error.status === 409) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  }
  return { listarAsignaciones, asignar, listarMantenciones, crearMantencion, eliminar, listar, listarPagina, listarTipos, crear, editar };
}
