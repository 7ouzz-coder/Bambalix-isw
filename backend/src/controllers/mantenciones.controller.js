import { crearMantencion, listarMantenciones, agregarNotaMantencion, cerrarMantencion, listarNotasMantencion } from "../services/mantenciones.service.js";

export function mantencionesController(db) {
  async function crear(req, res, next) {
    try {
      res.status(201).json(await crearMantencion(db, res.locals.equipmentId, req.body));
    } catch (error) {
      if (error.status === 404 || error.status === 409) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  }

  async function listar(_req, res, next) {
    try {
      res.json(await listarMantenciones(db, res.locals.equipmentId, res.locals.maintenancePage));
    } catch (error) {
      if (error.status === 404) return res.status(404).json({ message: error.message });
      next(error);
    }
  }

  function accion(service, status = 200) {
    return async (_req, res, next) => {
      try {
        const { equipmentId, maintenanceId, maintenanceAction, maintenancePage } = res.locals;
        res.status(status).json(await service(db, equipmentId, maintenanceId, maintenanceAction || maintenancePage));
      } catch (error) {
        if (error.status === 404 || error.status === 409) return res.status(error.status).json({ message: error.message });
        next(error);
      }
    };
  }

  return { crear, listar, agregarNota: accion(agregarNotaMantencion, 201), cerrar: accion(cerrarMantencion), notas: accion(listarNotasMantencion) };
}
