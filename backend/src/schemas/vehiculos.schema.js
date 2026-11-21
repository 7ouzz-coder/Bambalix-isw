import { z } from "zod";

export const vehicleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(80),
  status: z.enum(["UNREVIEWED", "OPERATIONAL", "DAMAGED"]).optional(),
  plate: z.string().trim().min(2).max(20).transform(value => value.toUpperCase().replace(/[.\s-]/g, ""))
    .pipe(z.string().regex(/^(?:[A-Z]{4}\d{2}|[A-Z]{2}\d{4}|[A-Z]{2}\d{3}|[A-Z]{3}\d{2})$/, "Usa una patente chilena, por ejemplo ABCD12, AB1234 o AB123")),
}).strict();

export const vehicleUpdateSchema = vehicleSchema.extend({
  revision: z.number().int().min(0).max(2147483646),
});

export const vehicleFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  type: z.string().trim().max(80).optional(),
}).strict();

export const vehiclePageSchema = vehicleFiltersSchema.extend({
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100000)).optional().default(1),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).optional().default(20),
});

export const vehicleIdSchema = z.object({ id: z.string().trim().min(1).max(128) }).strict();

export const vehicleMaintenanceSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(3).max(500),
}).strict().refine(data => new Date(data.endsAt) > new Date(data.startsAt), {
  message: "El término debe ser posterior al inicio", path: ["endsAt"],
});

export const vehicleAssignmentSchema = z.object({
  eventId: z.number().int().positive().max(2147483647),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
}).strict().refine(data => new Date(data.endsAt) > new Date(data.startsAt), { message: "El término debe ser posterior al inicio" });
