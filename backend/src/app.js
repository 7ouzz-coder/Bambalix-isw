import { internalRequestRoutes } from "./routes/solicitudes-internas.routes.js";
import { publicRequestRoutes } from "./routes/solicitudes-publicas.routes.js";
import { sessionRoutes } from "./routes/sesiones.routes.js";
import { loadSession, requireSession, requireCsrf, requireArea, blockDecision } from "./middlewares/sesiones.validation.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { equipmentRoutes } from "./routes/equipos.routes.js";
import { vehicleRoutes } from "./routes/vehiculos.routes.js";
import { clientRoutes } from "./routes/clientes.routes.js";
import { eventosRoutes } from "./routes/eventos.routes.js";
import { quoteRoutes } from "./routes/cotizaciones.routes.js";
import { paymentRoutes } from "./routes/pagos.routes.js";

export function createApp({ db, webOrigin, sessionMiddleware = loadSession(db), csrfMiddleware = requireCsrf, secureCookies = process.env.NODE_ENV === "production" }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: webOrigin, credentials: true, methods: ["GET", "POST", "PATCH"] }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.get("origin") && req.get("origin") !== webOrigin)
      return res.status(403).json({ message: "Origen no autorizado" });
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/v1/health", async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });
  app.use("/api/v1/public/requests", publicRequestRoutes(db));
  app.use("/api/v1/auth", sessionRoutes(db, secureCookies));
  const publicEvents = eventosRoutes(db);
  app.use("/api/v1/events", (req, res, next) => {
    if (req.method === "GET" && req.path === "/public") return publicEvents(req, res, next);
    next();
  });
  app.use("/api/v1", sessionMiddleware, requireSession, csrfMiddleware, (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.post("/api/v1/quotes/:id/approve", blockDecision);
  app.post("/api/v1/payments/:id/verify", blockDecision);
  app.patch("/api/v1/operations/resources/:id/assignments/:assignmentId/replacements/:replacementId/decision", blockDecision);
  app.use("/api/v1/operations/resources", requireArea("recursos:leer", "recursos:editar"), equipmentRoutes(db));
  app.use("/api/v1/operations/vehicles", requireArea("recursos:leer", "recursos:editar"), vehicleRoutes(db));
  app.use("/api/v1/requests", requireArea("solicitudes:leer", "solicitudes:leer"), internalRequestRoutes(db));
  app.use("/api/v1/clients", requireArea("clientes:leer", "clientes:editar"), clientRoutes(db));
  app.use("/api/v1/events", requireArea("eventos:leer", "eventos:editar"), eventosRoutes(db));
  app.use("/api/v1/quotes", requireArea("cotizaciones:leer", "cotizaciones:editar"), quoteRoutes(db));
  app.use("/api/v1/payments", requireArea("pagos:leer", "pagos:registrar"), paymentRoutes(db));

  app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));
  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400)
      return res.status(400).json({ message: "El cuerpo debe contener JSON válido" });
    if (error.type === "entity.too.large")
      return res.status(413).json({ message: "La solicitud es demasiado grande" });
    if (error.code === "P2002")
      return res.status(409).json({ message: "Ya existe un registro con esos datos" });
    if (error.name === "PrismaClientInitializationError" || error.code === "P1001")
      return res.status(503).json({ message: "La base de datos no está disponible. Intenta nuevamente" });
    console.error("Error de API", { name: error.name, code: error.code });
    res.status(500).json({ message: "No se pudo completar la solicitud" });
  });
  return app;
}
