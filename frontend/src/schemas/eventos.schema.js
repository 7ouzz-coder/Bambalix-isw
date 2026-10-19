import { z } from "zod";

export const eventoFormSchema = z
  .object({
    title: z
      .string({ required_error: "El título es obligatorio" })
      .trim()
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(160, "El título no puede superar 160 caracteres"),
    clientId: z
      .string({ required_error: "El cliente es obligatorio" })
      .trim()
      .min(1, "El cliente es obligatorio"),
    eventTypeId: z
      .string({ required_error: "El tipo de evento es obligatorio" })
      .min(1, "El tipo de evento es obligatorio")
      .refine((val) => /^[1-9]\d*$/.test(val), {
        message: "El tipo de evento debe ser válido",
      }),
    startsAt: z
      .string({ required_error: "La fecha de inicio es obligatoria" })
      .min(1, "La fecha de inicio es obligatoria")
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de inicio no es válida",
      }),
    endsAt: z
      .string({ required_error: "La fecha de término es obligatoria" })
      .min(1, "La fecha de término es obligatoria")
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de término no es válida",
      }),
    attendees: z
      .string({ required_error: "La cantidad de asistentes es obligatoria" })
      .min(1, "La cantidad de asistentes es obligatoria")
      .refine((val) => /^[1-9]\d*$/.test(val), {
        message: "Los asistentes deben ser un número entero positivo",
      })
      .refine((val) => Number(val) >= 1, {
        message: "Debe haber al menos 1 asistente",
      })
      .refine((val) => Number(val) <= 100000, {
        message: "Los asistentes no pueden superar 100.000",
      }),
    location: z.string().optional(),
    needs: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startsAt || !data.endsAt) return true;
      const start = new Date(data.startsAt);
      const end = new Date(data.endsAt);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
      return end > start;
    },
    {
      message: "La fecha de término debe ser posterior al inicio",
      path: ["endsAt"],
    }
  );
