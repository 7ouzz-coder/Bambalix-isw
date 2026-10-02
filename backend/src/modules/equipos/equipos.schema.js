import { z } from "zod";

export const equipmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  code: z.string().trim().max(60).optional().transform(value => value || null),
  mode: z.literal("UNIT"),
  quantity: z.literal(1),
}).strict();
