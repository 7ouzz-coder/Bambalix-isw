import { z } from "zod";
import { equipmentHistoryPageSchema } from "./equipos.schema.js";

const periodFields = {
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
};
const validPeriod = data => new Date(data.endsAt) > new Date(data.startsAt);
const periodError = { path: ["endsAt"], message: "El término debe ser posterior al inicio" };

export const availabilitySchema = z.object(periodFields).strict().refine(validPeriod, periodError);
export const assignmentSchema = z.object({
  eventId: z.number().int().positive().max(2147483647), ...periodFields,
}).strict().refine(validPeriod, periodError);
export const releaseSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();
export const assignmentIdSchema = z.string().trim().min(1).max(100);
export const assignmentPageSchema = equipmentHistoryPageSchema;
export const assignmentEventsSchema = equipmentHistoryPageSchema.extend({ search: z.string().trim().max(160).optional() });
