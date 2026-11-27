import { z } from "zod";
import { rutValido, celularValido } from "./identidad-cl.js";

const createOptionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : null));

const requiredRut = z.string({ error: "El RUT es obligatorio" }).trim().min(1, "El RUT es obligatorio").max(20).refine(rutValido, "Ingresa un RUT válido");
const requiredPhone = z.string({ error: "El teléfono es obligatorio" }).trim().min(1, "El teléfono es obligatorio").max(40).refine(celularValido, "Ingresa un celular chileno que comience con +569 o 9");
const addressRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s#.,\-\/]*$/;
const addressSchema = z
  .string()
  .trim()
  .max(240, "Máximo 240 caracteres")
  .refine((val) => addressRegex.test(val), "La dirección solo permite letras, números, espacios y los signos #, ., ,, -, /")
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
    rut: requiredRut,
    phone: requiredPhone,
    address: addressSchema,
    clientType: z.enum(["persona", "empresa"]).default("persona"),
    contactName: createOptionalText(120),
    contactPhone: createOptionalText(40).refine(value => value === null || celularValido(value), "Ingresa un celular de contacto chileno válido"),
    contactEmail: z
      .string()
      .trim()
      .max(254, "El correo de contacto no puede superar 254 caracteres")
      .refine(value => !value || z.email().safeParse(value).success, "Ingresa un correo de contacto válido")
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

const patchAddressSchema = z
  .union([
    z
      .string()
      .trim()
      .max(240, "Máximo 240 caracteres")
      .refine((val) => addressRegex.test(val), "La dirección solo permite letras, números, espacios y los signos #, ., ,, -, /"),
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
    rut: requiredRut.optional(),
    phone: requiredPhone.optional(),
    address: patchAddressSchema,
    clientType: z.enum(["persona", "empresa"]).optional(),
    contactName: patchOptionalNullableText(120),
    contactPhone: patchOptionalNullableText(40).refine(value => value == null || celularValido(value), "Ingresa un celular de contacto chileno válido"),
    contactEmail: z
      .union([
        z.string().trim().max(254, "El correo no puede superar 254 caracteres").refine(value => !value || z.email().safeParse(value).success, "Ingresa un correo válido"),
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
