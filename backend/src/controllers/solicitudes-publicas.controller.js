import { registerPublicRequest } from "../services/solicitudes-publicas.service.js";
export function publicRequestsController(db) {
 return async (_req, res, next) => {
  try { res.status(201).json(await registerPublicRequest(db, res.locals.publicRequest)); }
  catch (error) { next(error); }
 };
}
