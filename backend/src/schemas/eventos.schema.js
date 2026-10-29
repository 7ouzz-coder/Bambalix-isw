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
      .positive("El ID de tipo de evento debe ser positivo")
      .max(2147483647, "El ID de tipo de evento fuera de rango"),
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
  .strict()
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

export const eventoIdParamSchema = z
  .string({ required_error: "El ID de evento es obligatorio" })
  .trim()
  .superRefine((val, ctx) => {
    if (!/^[1-9]\d*$/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ID de evento inválido",
      });
      return;
    }
    const num = Number(val);
    if (!Number.isSafeInteger(num) || num > 2147483647) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ID de evento fuera de rango",
      });
    }
  });

export const editarEventoParamsSchema = z.object({
  id: eventoIdParamSchema,
});

export const editarEventoSchema = z
  .object({
    title: z
      .string()
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(160, "El título no puede superar 160 caracteres")
      .optional(),
    clientId: z
      .string()
      .min(1, "El cliente no puede estar vacío")
      .optional(),
    eventTypeId: z
      .number()
      .int("El ID de tipo de evento debe ser un entero")
      .positive("El ID de tipo de evento debe ser positivo")
      .max(2147483647, "El ID de tipo de evento fuera de rango")
      .optional(),
    startsAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de inicio no es válida",
      })
      .optional(),
    endsAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de término no es válida",
      })
      .optional(),
    attendees: z
      .number()
      .int("Los asistentes deben ser un número entero")
      .min(1, "Debe haber al menos 1 asistente")
      .max(100000, "Los asistentes no pueden superar 100.000")
      .optional(),
    location: z.string().nullable().optional(),
    needs: z.string().nullable().optional(),
  })
  .strict()
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

export const consultarAgendaSchema = z
  .object({
    from: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de inicio 'from' no es válida",
      })
      .optional(),
    to: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de término 'to' no es válida",
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.from && !data.to) return true;
      if (!data.from || !data.to) return false;
      const f = new Date(data.from);
      const t = new Date(data.to);
      return t > f;
    },
    {
      message: "El periodo de consulta debe tener fechas 'from' y 'to' válidas con 'to' posterior a 'from'",
      path: ["to"],
    }
  );

export const coordinarReprogramacionSchema = z
  .object({
    expectedStartsAt: z
      .string({ required_error: "La fecha esperada de inicio es obligatoria" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha esperada de inicio no es válida",
      }),
    expectedEndsAt: z
      .string({ required_error: "La fecha esperada de término es obligatoria" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha esperada de término no es válida",
      }),
    startsAt: z
      .string({ required_error: "La nueva fecha de inicio es obligatoria" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La nueva fecha de inicio no es válida",
      }),
    endsAt: z
      .string({ required_error: "La nueva fecha de término es obligatoria" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La nueva fecha de término no es válida",
      }),
    assignments: z.array(
      z
        .object({
          id: z.string({ required_error: "El ID de asignación es obligatorio" }).min(1),
          expectedStartsAt: z
            .string({ required_error: "La fecha esperada de asignación es obligatoria" })
            .refine((val) => !isNaN(Date.parse(val)), {
              message: "La fecha esperada de asignación no es válida",
            }),
          expectedEndsAt: z
            .string({ required_error: "La fecha de término esperada de asignación es obligatoria" })
            .refine((val) => !isNaN(Date.parse(val)), {
              message: "La fecha de término esperada de asignación no es válida",
            }),
          startsAt: z
            .string({ required_error: "La nueva fecha de inicio de asignación es obligatoria" })
            .refine((val) => !isNaN(Date.parse(val)), {
              message: "La nueva fecha de inicio de asignación no es válida",
            }),
          endsAt: z
            .string({ required_error: "La nueva fecha de término de asignación es obligatoria" })
            .refine((val) => !isNaN(Date.parse(val)), {
              message: "La nueva fecha de término de asignación no es válida",
            }),
        })
        .strict()
        .refine(
          (a) => new Date(a.endsAt) > new Date(a.startsAt),
          {
            message: "El periodo propuesto de la asignación debe tener término posterior al inicio",
            path: ["endsAt"],
          }
        )
    ),
    title: z.string().min(3).max(160).optional(),
    clientId: z.string().min(1).optional(),
    eventTypeId: z.number().int().positive().max(2147483647).optional(),
    attendees: z.number().int().min(1).max(100000).optional(),
    location: z.string().nullable().optional(),
    needs: z.string().nullable().optional(),
  })
  .strict()
  .refine(
    (data) => new Date(data.endsAt) > new Date(data.startsAt),
    {
      message: "La nueva fecha de término del evento debe ser posterior al inicio",
      path: ["endsAt"],
    }
  );



