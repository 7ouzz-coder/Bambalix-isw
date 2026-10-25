import { z } from "zod";

export const equipmentCreateSchema = z.object({
  name: z.string().trim().min(2, "Escribe al menos 2 caracteres").max(120, "El nombre admite hasta 120 caracteres"),
  category: z.string().trim().min(2, "Escribe al menos 2 caracteres").max(80, "La categoría admite hasta 80 caracteres"),
  code: z.string().trim().min(1, "El código del equipo es obligatorio").max(60, "El código admite hasta 60 caracteres"),
}).strict();

export const equipmentUpdateSchema = equipmentCreateSchema.extend({
  revision: z.number().int().min(0).max(2147483646),
});

export const equipmentStatusSchema = z.object({
  status: z.enum(["OPERATIONAL", "MAINTENANCE", "DAMAGED"], {
    error: "Selecciona un estado operativo válido",
  }),
  reason: z.string().trim()
    .min(3, "Escribe un motivo de al menos 3 caracteres")
    .max(500, "El motivo admite hasta 500 caracteres"),
  revision: z.number().int().min(0).max(2147483646),
}).strict();
