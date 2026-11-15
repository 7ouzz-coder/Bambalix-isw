import { z } from "zod";

export const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Selecciona fecha y hora")
  .refine(value => {
    const date = new Date(value);
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    return parts && Number.isFinite(date.getTime()) &&
      [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()]
        .every((part, index) => part === Number(parts[index + 1]));
  }, "La fecha no es válida");

export const maintenanceFormSchema = z.object({
  startsAt: localDate,
  endsAt: localDate,
  reason: z.string().trim().min(3, "Escribe un motivo de al menos 3 caracteres")
    .max(500, "El motivo admite hasta 500 caracteres"),
}).strict().refine(data => new Date(data.endsAt) > new Date(data.startsAt), {
  path: ["endsAt"], message: "El término debe ser posterior al inicio",
});

const observation = z.string().trim().min(3, "Escribe al menos 3 caracteres")
  .max(500, "La observación admite hasta 500 caracteres");
export const maintenanceNoteFormSchema = z.object({ content: observation }).strict();
export const maintenanceCloseFormSchema = z.object({ closingNotes: observation }).strict();
