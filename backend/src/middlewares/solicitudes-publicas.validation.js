import { publicRequestSchema } from "../schemas/solicitudes-publicas.schema.js";
export function validatePublicRequest(req, res, next) {
 const result = publicRequestSchema.safeParse(req.body);
 if (!result.success) return res.status(400).json({ message: "Revisa los datos de tu solicitud" });
 res.locals.publicRequest = result.data; next();
}
export function publicRequestLimit() {
 const attempts = new Map(); const windowMs = 10 * 60 * 1000;
 return (req, res, next) => {
  const now = Date.now();
  for (const [key, item] of attempts) if (item.until <= now) attempts.delete(key);
  const key = req.ip; const item = attempts.get(key) || { count: 0, until: now + windowMs };
  if (item.count >= 5 || (!attempts.has(key) && attempts.size >= 10000)) {
   res.set("Retry-After", "600"); return res.status(429).json({ message: "Has enviado varias solicitudes. Intenta más tarde" });
  }
  item.count++; attempts.set(key, item); next();
 };
}
