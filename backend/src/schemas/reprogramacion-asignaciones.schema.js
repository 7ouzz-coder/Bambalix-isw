import { z } from "zod";
import { assignmentIdSchema } from "./asignaciones.schema.js";

const dates = {
  expectedStartsAt: z.string().datetime({ offset: true }),
  expectedEndsAt: z.string().datetime({ offset: true }),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
};
const validPeriods = data => new Date(data.endsAt) > new Date(data.startsAt) &&
  new Date(data.expectedEndsAt) > new Date(data.expectedStartsAt);
const periodError = { path: ["endsAt"], message: "Los periodos deben tener término posterior al inicio" };

export const assignmentRescheduleSchema = z.object({
  ...dates,
  assignments: z.array(z.object({ id: assignmentIdSchema, ...dates }).strict().refine(validPeriods, periodError)),
}).strict().refine(validPeriods, periodError).refine(data =>
  new Set(data.assignments.map(item => item.id)).size === data.assignments.length,
  { path: ["assignments"], message: "No repitas asignaciones en la reprogramación" },
);

export const rescheduleEventIdSchema = z.number().int().positive().max(2147483647);
