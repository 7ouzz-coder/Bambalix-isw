import * as service from "../services/asignaciones.service.js";

export function asignacionesController(db) {
  function action(run, status = 200) {
    return async (_req, res, next) => {
      try { res.status(status).json(await run(res.locals)); }
      catch (error) {
        if (error.status === 404 || error.status === 409)
          return res.status(error.status).json({ message: error.message });
        next(error);
      }
    };
  }
  return {
    crear: action(data => service.crearAsignacion(db, data.equipmentId, data.assignmentData), 201),
    listar: action(data => service.listarAsignaciones(db, data.equipmentId, data.assignmentPage)),
    liberar: action(data => service.liberarAsignacion(db, data.equipmentId, data.assignmentId, data.releaseData)),
    disponibilidad: action(data => service.consultarDisponibilidad(db, data.equipmentId, data.availabilityPeriod)),
    eventos: action(data => service.listarEventosAsignables(db, data.assignmentEvents)),
  };
}
