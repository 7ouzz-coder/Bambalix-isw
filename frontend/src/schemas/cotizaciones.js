import { z } from "zod";

const quoteItemFormSchema = z.object({
  concept: z
    .string()
    .trim()
    .min(2, "El concepto debe tener al menos 2 caracteres")
    .max(200, "El concepto admite hasta 200 caracteres"),
  quantity: z.coerce
    .number({ invalid_type_error: "Ingresa una cantidad numérica" })
    .int("La cantidad debe ser entera")
    .min(1, "La cantidad mínima es 1")
    .max(100000, "La cantidad no puede superar 100.000"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Ingresa un precio válido" })
    .min(0, "El precio no puede ser negativo")
    .max(999999999.99, "El precio excede el límite máximo permitido")
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), "El precio admite hasta dos decimales"),
});

export const quoteFormSchema = z.object({
  clientId: z.string().min(1, "Debes seleccionar un cliente"),
  eventId: z.coerce.number().int().positive("Debes seleccionar un evento válido"),
  notes: z.string().max(500, "Las notas admiten hasta 500 caracteres").optional().or(z.literal("")),
  items: z.array(quoteItemFormSchema).min(1, "Debes agregar al menos un ítem a la cotización"),
});
