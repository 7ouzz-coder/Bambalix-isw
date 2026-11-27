import { solicitarReemplazo, listarReemplazos, decidirReemplazo } from "../services/reemplazos.service.js";

export function reemplazosController(db) {
  function action(handler, status = 200) {
    return async (req, res, next) => {
      try { res.status(status).json(await handler(res.locals, req.user)); }
      catch (error) {
        if ([401,403,404,409].includes(error.status)) return res.status(error.status).json({ message: error.message });
        next(error);
      }
    };
  }
  return {
    crear: action(data => solicitarReemplazo(db, data.equipmentId, data.assignmentId, data.replacementData, data.replacementActor), 201),
    listar: action(async (data, user) => ({
      ...await listarReemplazos(db, data.equipmentId, data.assignmentId, data.replacementPage),
      canDecide: data.replacementActor?.role === "GERENTE" && Boolean(user?.permissions?.includes("recursos:editar")),
    })),
    decidir: action(data => decidirReemplazo(db, data.equipmentId, data.assignmentId, data.replacementId, data.replacementDecision, data.replacementActor)),
  };
}
