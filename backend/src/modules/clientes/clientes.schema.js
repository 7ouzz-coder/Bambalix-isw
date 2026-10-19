import { z } from "zod";

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null));

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
    rut: optionalText(20),
    phone: optionalText(40),
    address: optionalText(240),
    clientType: z.enum(["persona", "empresa"]).default("persona"),
    contactName: optionalText(120),
    contactPhone: optionalText(40),
    contactEmail: z
      .string()
      .trim()
      .max(254, "El correo de contacto no puede superar 254 caracteres")
      .email("Ingresa un correo de contacto válido")
      .optional()
      .nullable()
      .or(z.literal(""))
      .transform((val) => (val ? val.trim() : null)),
    contactPosition: optionalText(120),
  })
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
    rut: optionalText(20),
    phone: optionalText(40),
    address: optionalText(240),
    clientType: z.enum(["persona", "empresa"]).optional(),
    contactName: optionalText(120),
    contactPhone: optionalText(40),
    contactEmail: z
      .string()
      .trim()
      .max(254, "El correo de contacto no puede superar 254 caracteres")
      .email("Ingresa un correo de contacto válido")
      .optional()
      .nullable()
      .or(z.literal(""))
      .transform((val) => (val ? val.trim() : null)),
    contactPosition: optionalText(120),
  })
  .refine(
    (data) => {
      if (data.clientType === "empresa" && data.contactName !== undefined) {
        return Boolean(data.contactName && data.contactName.trim().length >= 2);
      }
      return true;
    },
    {
      message: "Para clientes tipo empresa se requiere el nombre del encargado de contacto",
      path: ["contactName"],
    }
  );
