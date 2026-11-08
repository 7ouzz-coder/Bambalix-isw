import { listPublicRequests } from "../services/solicitudes-internas.service.js";
export function internalRequestsController(db) {
  return async (_req, res, next) => {
    try { res.json(await listPublicRequests(db, res.locals.requestList)); }
    catch (error) { next(error); }
  };
}
