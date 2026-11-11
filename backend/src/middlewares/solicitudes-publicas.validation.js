import { publicRequestSchema } from "../schemas/solicitudes-publicas.schema.js";
export function validatePublicRequest(req, res, next) {
 const result = publicRequestSchema.safeParse(req.body);
 if (!result.success) return res.status(400).json({ message: "Revisa los datos de tu solicitud" });
 const key = req.get("Idempotency-Key");
 if (key !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
  return res.status(400).json({ message: "No se pudo identificar la solicitud. Vuelve a cargar la página." });
 res.locals.idempotencyKey = key?.toLowerCase();
 res.locals.publicRequest = result.data; next();
}
export function publicRequestLimit() {
 const attempts = new Map(); const windowMs = 10 * 60 * 1000;
 return (req, res, next) => {
  const now = Date.now();
  for (const [key, item] of attempts) if (item.until <= now) attempts.delete(key);
  const key = req.ip; const item = attempts.get(key) || { count: 0, until: now + windowMs };
  if (item.count >= 5 || (!attempts.has(key) && attempts.size >= 10000)) {
   const retrySeconds = Math.ceil((item.until - now) / 1000);
   res.set("Retry-After", String(retrySeconds)); return res.status(429).json({ message: "Has enviado varias solicitudes. Intenta más tarde" });
  }
  item.count++; attempts.set(key, item); next();
 };
}
