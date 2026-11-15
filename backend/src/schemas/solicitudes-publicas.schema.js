import { z } from "zod";
export const publicRequestSchema = z.object({
 name: z.string().trim().min(2).max(120),
 email: z.string().trim().toLowerCase().email().max(254),
 phone: z.string().trim().min(1).max(40),
 requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(value + "T12:00:00Z"); return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value; }),
 service: z.string().trim().min(1).max(240),
}).strict();
