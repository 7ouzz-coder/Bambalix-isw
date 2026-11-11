import { registerPublicRequest } from "../services/solicitudes-publicas.service.js";
export function publicRequestsController(db) {
 return async (_req, res, next) => {
  try { res.status(201).json(await registerPublicRequest(db, res.locals.publicRequest, res.locals.idempotencyKey)); }
  catch (error) { if (error.statusCode === 409) return res.status(409).json({ message: error.message }); next(error); }
 };
}
