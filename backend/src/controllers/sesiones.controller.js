import { login, logout, sessionDuration } from "../services/sesiones.service.js";
import { sessionToken, cookieName } from "../middlewares/sesiones.validation.js";

export function sesionesController(db, secure) {
  const cookie = { httpOnly: true, secure, sameSite: "lax", path: "/api/v1" };
  return {
    async iniciar(req, res, next) {
      try {
        const result = await login(db, res.locals.loginData, sessionToken(req));
        if (!result) return res.status(401).json({ message: "Correo o contraseña incorrectos" });
        res.cookie(cookieName, result.token, { ...cookie, maxAge: sessionDuration });
        res.json({ user: result.user, csrfToken: result.csrfToken });
      } catch (error) { next(error); }
    },
    actual(req, res) { res.json({ user: req.user, csrfToken: req.internalSession.csrfToken }); },
    async cerrar(req, res, next) {
      try { await logout(db, sessionToken(req)); res.clearCookie(cookieName, cookie); res.status(204).end(); }
      catch (error) { next(error); }
    },
  };
}
