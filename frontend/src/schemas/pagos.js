import { z } from "zod";

export const paymentFormSchema = z.object({
  quoteId: z.string().min(1, "Debes seleccionar una cotización"),
  method: z.enum(["EFECTIVO", "TRANSFERENCIA"], {
    errorMap: () => ({ message: "Selecciona un método válido: Efectivo o Transferencia" }),
  }),
  amount: z.coerce
    .number({ invalid_type_error: "Ingresa un monto numérico válido" })
    .positive("El monto debe ser mayor a 0")
    .max(999999999.99, "El monto excede el límite permitido"),
  reference: z
    .string()
    .trim()
    .max(120, "La referencia admite hasta 120 caracteres")
    .optional()
    .or(z.literal("")),
  registeredBy: z
    .string()
    .trim()
    .max(120, "El nombre admite hasta 120 caracteres")
    .optional()
    .or(z.literal("")),
});
