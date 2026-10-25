import { z } from "zod";

const quoteItemSchema = z
  .object({
    concept: z
      .string({ required_error: "El concepto es obligatorio" })
      .trim()
      .min(2, "El concepto debe tener al menos 2 caracteres")
      .max(200, "El concepto no puede superar 200 caracteres"),
    quantity: z
      .number({ required_error: "La cantidad es obligatoria" })
      .int("La cantidad debe ser un número entero")
      .min(1, "La cantidad debe ser al menos 1")
      .max(100000, "La cantidad no puede exceder 100.000"),
    unitPrice: z
      .number({ required_error: "El precio unitario es obligatorio" })
      .min(0, "El precio unitario no puede ser negativo")
      .max(999999999.99, "El precio unitario excede el límite permitido de la base de datos"),
  })
  .strict();

export const createQuoteSchema = z
  .object({
    clientId: z
      .string({ required_error: "El cliente es obligatorio" })
      .trim()
      .min(1, "El cliente es obligatorio"),
    eventId: z
      .number({ required_error: "El evento es obligatorio" })
      .int("El identificador del evento debe ser un número entero")
      .positive("El identificador del evento debe ser positivo"),
    notes: z
      .string()
      .trim()
      .max(500, "Las notas no pueden superar 500 caracteres")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val.trim() : null)),
    items: z
      .array(quoteItemSchema, { required_error: "Debes incluir al menos un ítem en la cotización" })
      .min(1, "Debes incluir al menos un ítem en la cotización"),
  })
  .strict();
