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
  router.post("/", async (req, res) => {
    const result = equipmentSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({
      message: "Revisa el nombre, la categoría y el código del equipo",
      fields: z.flattenError(result.error).fieldErrors,
    });
    const equipment = await db.resource.create({ data: result.data });
    res.status(201).json(equipment);
  });
  return router;
}
