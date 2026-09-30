import { Router } from "express";
import { z } from "zod";

const optionalText = max => z.string().trim().max(max).optional().transform(value => value || null);

const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(254).email(),
  rut: optionalText(20),
  phone: optionalText(40),
  address: optionalText(240),
}).strict();

export function clientRoutes(db) {
  const router = Router();

  router.get("/", async (_req, res) => {
    const clients = await db.client.findMany({ orderBy: { name: "asc" } });
    res.json(clients);
  });

  router.post("/", async (req, res) => {
    const result = clientSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({
      message: "Revisa el nombre, el correo y los datos del cliente",
      fields: z.flattenError(result.error).fieldErrors,
    });

    try {
      const client = await db.client.create({ data: result.data });
      res.status(201).json(client);
    } catch (error) {
      if (error.code === "P2002") return res.status(409).json({ message: "Ya existe un cliente con ese RUT" });
      throw error;
    }
  });

  return router;
}