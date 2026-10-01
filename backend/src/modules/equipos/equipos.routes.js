import { Router } from "express";
import { z } from "zod";

const equipmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  code: z.string().trim().max(60).optional().transform(value => value || null),
  mode: z.literal("UNIT"),
  quantity: z.literal(1),
}).strict();

export function equipmentRoutes(db) {
  const router = Router();
  router.get("/", async (_req, res) => {
    const equipment = await db.resource.findMany({
      where: { mode: "UNIT" }, take: 200,
      orderBy: [{ category: "asc" }, { name: "asc" }, { id: "asc" }],
    });
    res.json(equipment);
  });
  router.post("/", async (req, res, next) => {
    try {
      const result = equipmentSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({
        message: "Revisa el nombre, la categoría y el código del equipo",
        fields: z.flattenError(result.error).fieldErrors,
      });
      const equipment = await db.resource.create({ data: result.data });
      res.status(201).json(equipment);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Ya existe un equipo con ese código" });
      }
      next(error);
    }
  });
  return router;
}
