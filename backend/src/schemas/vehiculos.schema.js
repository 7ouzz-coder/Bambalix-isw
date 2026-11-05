import { z } from "zod";

export const vehicleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(80),
  plate: z.string().trim().min(2).max(20).transform(value => value.toUpperCase().replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^[A-Z0-9]{2,20}$/, "Escribe una patente con letras y números")),
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
