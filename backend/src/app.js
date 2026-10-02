import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middlewares/error-handler.js";
import { equipmentRoutes } from "./modules/equipos/equipos.routes.js";
import { clientRoutes } from "./modules/clientes/clientes.routes.js";
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
  app.use("/api/v1/clients", clientRoutes(db));
  app.use("/api/v1/events", eventosRoutes(db));

  app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));
  app.use(errorHandler);
  return app;
}
