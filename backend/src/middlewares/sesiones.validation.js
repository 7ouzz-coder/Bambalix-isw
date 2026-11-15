import { timingSafeEqual } from "node:crypto";
import { getSession } from "../services/sesiones.service.js";
export const cookieName = "bambalix_session";
export function sessionToken(req) {
  const values = (req.get("cookie") || "").split(";").map(part => part.trim()).filter(part => part.startsWith(`${cookieName}=`));
  return values.length === 1 ? values[0].slice(cookieName.length + 1) : null;
}
export function loadSession(db) {
  return async (req, _res, next) => {
    try { req.internalSession = await getSession(db, sessionToken(req)); req.user = req.internalSession?.user || null; next(); }
    catch (error) { next(error); }
  };
}
export function requireSession(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Inicia sesión para acceder a la gestión interna" });
  next();
}
export function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const actual = Buffer.from(req.get("x-csrf-token") || "");
  const expected = Buffer.from(req.internalSession?.csrfToken || "");
  if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return res.status(403).json({ message: "La solicitud no corresponde a la sesión activa. Vuelve a cargar la página" });
  next();
}
export function requireArea(read, write) {
  return (req, res, next) => {
    const permission = ["GET", "HEAD"].includes(req.method) ? read : write;
    if (!req.user?.permissions.includes(permission)) return res.status(403).json({ message: "No tienes permiso para esta operación" });
    next();
  };
}
export function blockDecision(_req, res) {
  return res.status(403).json({ message: "Esta operación permanece bloqueada hasta completar y validar su integración" });
}
// Protección local por IP; no se confía en X-Forwarded-For sin proxy configurado.
export function loginLimit() {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    if (entry.count >= 10 || (!attempts.has(key) && attempts.size >= 10000)) {
      res.set("Retry-After", String(Math.ceil((entry.until - now) / 1000)));
      return res.status(429).json({ message: "Demasiados intentos. Intenta nuevamente más tarde" });
    }
    entry.count++; attempts.set(key, entry); next();
  };
}
