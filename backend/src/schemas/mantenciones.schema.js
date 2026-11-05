import { z } from "zod";
import { equipmentHistoryPageSchema } from "./equipos.schema.js";

export const maintenanceSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(3).max(500),
}).strict().refine(data => new Date(data.endsAt) > new Date(data.startsAt), {
  path: ["endsAt"], message: "El término debe ser posterior al inicio",
});

export const maintenancePageSchema = equipmentHistoryPageSchema;
export const maintenanceIdSchema = z.string().trim().min(1).max(100);
export const maintenanceNoteSchema = z.object({ content: z.string().trim().min(3).max(500) }).strict();
export const maintenanceCloseSchema = z.object({ closingNotes: z.string().trim().min(3).max(500) }).strict();
