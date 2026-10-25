import { z } from "zod";
import { localDate } from "./mantenciones.schema";

export const assignmentFormSchema = z.object({
  eventId: z.number().int().positive("Selecciona un evento").max(2147483647),
  startsAt: localDate,
  endsAt: localDate,
}).strict().refine(data => new Date(data.endsAt) > new Date(data.startsAt), {
  path: ["endsAt"], message: "El término debe ser posterior al inicio",
});

export const assignmentReleaseSchema = z.object({
  reason: z.string().trim().min(3, "Escribe un motivo de al menos 3 caracteres")
    .max(500, "El motivo admite hasta 500 caracteres"),
}).strict();
