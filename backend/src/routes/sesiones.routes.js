import { Router } from "express";
import { sesionesController } from "../controllers/sesiones.controller.js";
import { loginSchema } from "../schemas/sesiones.schema.js";
import { loadSession, requireSession, requireCsrf, loginLimit } from "../middlewares/sesiones.validation.js";

export function sessionRoutes(db, secure) {
  const router = Router();
  const controller = sesionesController(db, secure);
  router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.post("/login", loginLimit(), (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: "Revisa el correo y la contraseña" });
    res.locals.loginData = result.data; next();
  }, controller.iniciar);
  router.use(loadSession(db), requireSession);
  router.get("/me", controller.actual);
  router.post("/logout", requireCsrf, controller.cerrar);
  return router;
}
