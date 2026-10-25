import { z } from "zod";

export const paymentVerifierSchema = z.object({
  id: z.string().trim().min(1).max(100),
  authenticated: z.literal(true),
});

export const createPaymentSchema = z
  .object({
    quoteId: z
      .string({ required_error: "La cotización es obligatoria" })
      .trim()
      .min(1, "La cotización es obligatoria"),
    method: z
      .string({ required_error: "El método de pago es obligatorio" })
      .trim()
      .transform((val) => val.toUpperCase())
      .refine((val) => val === "EFECTIVO" || val === "TRANSFERENCIA", {
        message: "El método de pago debe ser exclusivamente EFECTIVO o TRANSFERENCIA",
      }),
    amount: z
      .number({ required_error: "El monto es obligatorio" })
      .positive("El monto debe ser un valor positivo mayor a 0")
      .max(999999999.99, "El monto excede el límite máximo permitido")
      .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), "El monto admite hasta dos decimales"),
    reference: z
      .string()
      .trim()
      .max(120, "La referencia no puede exceder 120 caracteres")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val.trim() : null)),
    registeredBy: z
      .string()
      .trim()
      .max(120, "El nombre de quien registra no puede exceder 120 caracteres")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val.trim() : null)),
  })
  .strict();
