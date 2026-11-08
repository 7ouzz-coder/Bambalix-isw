import { requestListSchema } from "../schemas/solicitudes-internas.schema.js";
export function validateRequestList(req, res, next) {
  const parsed = requestListSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Revisa la página solicitada" });
  res.locals.requestList = parsed.data;
  next();
}
