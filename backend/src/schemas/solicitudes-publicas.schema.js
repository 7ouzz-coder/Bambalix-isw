import { z } from "zod";
export const publicRequestSchema = z.object({
 name: z.string().trim().min(2).max(120),
 email: z.string().trim().toLowerCase().email().max(254),
 phone: z.string().trim().max(40).optional(),
 requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(value + "T12:00:00Z"); return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value; }),
 service: z.enum(["Seminarios y congresos", "Ceremonias académicas", "Shows y conciertos", "Banquetería y celebraciones", "Arriendo de equipamiento", "Asesoría de producción"]),
 message: z.string().trim().min(10).max(2000),
}).strict();
