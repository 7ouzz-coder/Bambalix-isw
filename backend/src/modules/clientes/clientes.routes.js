import { Router } from "express";

export function clientesRoutes(db) {
  const router = Router();

  // GET /api/v1/clients — Listar clientes para selector interno
  router.get("/", async (_req, res, next) => {
    try {
      const clientes = await db.client.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
        orderBy: { name: "asc" },
      });
      res.json(clientes);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
