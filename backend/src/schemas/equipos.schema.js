import { z } from "zod";

export const equipmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  code: z.string().trim().min(1, "El código del equipo es obligatorio").max(60),
  mode: z.literal("UNIT"),
  quantity: z.literal(1),
}).strict();

export const equipmentFiltersSchema = z.object({
  name: z.string().trim().max(120).optional(),
  code: z.string().trim().max(60).optional(),
  category: z.string().trim().max(80).optional(),
  status: z.enum(["UNREVIEWED", "OPERATIONAL", "MAINTENANCE", "DAMAGED"]).optional(),
}).strict();

export const equipmentUpdateSchema = equipmentSchema.pick({ name: true, category: true, code: true }).extend({
  revision: z.number().int().min(0).max(2147483646),
}).strict();

export const equipmentPageSchema = equipmentFiltersSchema.extend({
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100000)).optional().default(1),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).optional().default(20),
});

export const equipmentHistoryPageSchema = equipmentPageSchema.pick({ page: true, pageSize: true });

export const equipmentIdSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const equipmentStatusSchema = z.object({
  status: z.enum(["OPERATIONAL", "MAINTENANCE", "DAMAGED"]),
  reason: z.string().trim().min(3).max(500),
  revision: z.number().int().min(0).max(2147483646),
}).strict();
