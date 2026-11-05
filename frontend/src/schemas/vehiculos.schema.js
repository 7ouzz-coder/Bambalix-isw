import { z } from "zod";

export const vehicleSchema = z.object({
  name: z.string().trim().min(2, "Escribe al menos 2 caracteres").max(120, "El nombre admite hasta 120 caracteres"),
  type: z.string().trim().min(2, "Escribe el tipo de vehículo").max(80, "El tipo admite hasta 80 caracteres"),
  plate: z.string().trim().min(2, "La patente es obligatoria").max(20, "La patente admite hasta 20 caracteres")
    .transform(value => value.toUpperCase().replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^[A-Z0-9]{2,20}$/, "Escribe una patente con letras y números")),
}).strict();

export const vehicleUpdateSchema = vehicleSchema.extend({
  revision: z.number().int().min(0).max(2147483646),
});
