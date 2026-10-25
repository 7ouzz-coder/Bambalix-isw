import { z } from "zod";

export const clientFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Escribe entre 2 y 120 caracteres")
      .max(120, "Escribe hasta 120 caracteres"),
    email: z
      .string()
      .trim()
      .min(1, "El correo es obligatorio")
      .max(254, "Escribe un correo válido de hasta 254 caracteres")
      .email("Escribe un correo válido de hasta 254 caracteres"),
    rut: z
      .string()
      .trim()
      .max(20, "El RUT admite hasta 20 caracteres")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .trim()
      .max(40, "El teléfono admite hasta 40 caracteres")
      .optional()
      .or(z.literal("")),
    address: z
      .string()
      .trim()
      .max(240, "La dirección admite hasta 240 caracteres")
      .optional()
      .or(z.literal("")),
    clientType: z.enum(["persona", "empresa"]).default("persona"),
    contactName: z
      .string()
      .trim()
      .max(120, "El contacto admite hasta 120 caracteres")
      .optional()
      .or(z.literal("")),
    contactPhone: z
      .string()
      .trim()
      .max(40, "El teléfono de contacto admite hasta 40 caracteres")
      .optional()
      .or(z.literal("")),
    contactEmail: z
      .string()
      .trim()
      .max(254, "El correo de contacto admite hasta 254 caracteres")
      .email("Ingresa un correo de contacto válido")
      .optional()
      .or(z.literal("")),
    contactPosition: z
      .string()
      .trim()
      .max(120, "El cargo admite hasta 120 caracteres")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.clientType === "empresa") {
        return Boolean(data.contactName && data.contactName.trim().length >= 2);
      }
      return true;
    },
    {
      message: "Para empresas es obligatorio indicar el encargado de contacto",
      path: ["contactName"],
    }
  );
