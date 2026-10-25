import { z } from "zod";

const createOptionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : null));

export const createClientSchema = z
  .object({
    name: z
      .string({ required_error: "El nombre es obligatorio" })
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(120, "El nombre no puede superar 120 caracteres"),
    email: z
      .string({ required_error: "El correo es obligatorio" })
      .trim()
      .max(254, "El correo no puede superar 254 caracteres")
      .email("Ingresa un correo electrónico válido"),
    rut: createOptionalText(20),
    phone: createOptionalText(40),
    address: createOptionalText(240),
    clientType: z.enum(["persona", "empresa"]).default("persona"),
    contactName: createOptionalText(120),
    contactPhone: createOptionalText(40),
    contactEmail: z
      .string()
      .trim()
      .max(254, "El correo de contacto no puede superar 254 caracteres")
      .email("Ingresa un correo de contacto válido")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val.trim() : null)),
    contactPosition: createOptionalText(120),
  })
  .strict()
  .refine(
    (data) => {
      if (data.clientType === "empresa") {
        return Boolean(data.contactName && data.contactName.trim().length >= 2);
      }
      return true;
    },
    {
      message: "Para clientes tipo empresa se requiere el nombre del encargado de contacto",
      path: ["contactName"],
    }
  );

// Helper para PATCH: distingue undefined (no enviado) de null/string (intención explícita)
const patchOptionalNullableText = (max) =>
  z
    .union([
      z.string().trim().max(max, `Máximo ${max} caracteres`),
      z.null(),
    ])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === null || val.trim() === "") return null;
      return val.trim();
    });

export const updateClientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(120, "El nombre no puede superar 120 caracteres")
      .optional(),
    email: z
      .string()
      .trim()
      .max(254, "El correo no puede superar 254 caracteres")
      .email("Ingresa un correo electrónico válido")
      .optional(),
    rut: patchOptionalNullableText(20),
    phone: patchOptionalNullableText(40),
    address: patchOptionalNullableText(240),
    clientType: z.enum(["persona", "empresa"]).optional(),
    contactName: patchOptionalNullableText(120),
    contactPhone: patchOptionalNullableText(40),
    contactEmail: z
      .union([
        z.string().trim().max(254, "El correo no puede superar 254 caracteres").email("Ingresa un correo válido"),
        z.null(),
      ])
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        if (val === null || val.trim() === "") return null;
        return val.trim();
      }),
    contactPosition: patchOptionalNullableText(120),
  })
  .strict();
