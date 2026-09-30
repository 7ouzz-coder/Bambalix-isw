import express from "express";
import cors from "cors";
import helmet from "helmet";
import { equipmentRoutes } from "./modules/equipos/equipos.routes.js";
import { clientesRoutes } from "./modules/clientes/clientes.routes.js";
import { eventosRoutes } from "./modules/eventos/eventos.routes.js";

export function createApp({ db, webOrigin }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: webOrigin, methods: ["GET", "POST"] }));
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
  app.use("/api/v1/operations/resources", equipmentRoutes(db));
  app.use("/api/v1/clients", clientesRoutes(db));
  app.use("/api/v1/events", eventosRoutes(db));

  app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));
  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400)
      return res.status(400).json({ message: "El cuerpo debe contener JSON válido" });
    if (error.type === "entity.too.large")
      return res.status(413).json({ message: "La solicitud es demasiado grande" });
    if (error.code === "P2002")
      return res.status(409).json({ message: "Ya existe un equipo con ese código" });
    if (error.name === "PrismaClientInitializationError" || error.code === "P1001")
      return res.status(503).json({ message: "La base de datos no está disponible. Intenta nuevamente" });
    console.error("Error de API", { name: error.name, code: error.code });
    res.status(500).json({ message: "No se pudo completar la solicitud" });
  });
  return app;
}
