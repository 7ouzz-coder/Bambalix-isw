import { z } from "zod";

export const crearEventoSchema = z
  .object({
    title: z
      .string({ required_error: "El título es obligatorio" })
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(160, "El título no puede superar 160 caracteres"),
    clientId: z
      .string({ required_error: "El cliente es obligatorio" })
      .min(1, "El cliente es obligatorio"),
    eventTypeId: z
      .number({ required_error: "El tipo de evento es obligatorio" })
      .int("El ID de tipo de evento debe ser un entero")
      .positive("El ID de tipo de evento debe ser positivo"),
    startsAt: z
      .string({ required_error: "La fecha de inicio es obligatoria" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de inicio no es válida",
      }),
    endsAt: z
      .string({ required_error: "La fecha de término es obligatoria" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de término no es válida",
      }),
    attendees: z
      .number({ required_error: "La cantidad de asistentes es obligatoria" })
      .int("Los asistentes deben ser un número entero")
      .min(1, "Debe haber al menos 1 asistente")
      .max(100000, "Los asistentes no pueden superar 100.000"),
    location: z.string().optional(),
    needs: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startsAt || !data.endsAt) return true;
      const inicio = new Date(data.startsAt);
      const termino = new Date(data.endsAt);
      if (isNaN(inicio.getTime()) || isNaN(termino.getTime())) return true;
      return termino > inicio;
    },
    {
      message: "La fecha de término debe ser posterior al inicio",
      path: ["endsAt"],
    }
  );
