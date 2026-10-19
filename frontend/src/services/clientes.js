import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function clientRequest(pathOrOptions = {}, maybeOptions = {}) {
  let path = "";
  let options = {};
  if (typeof pathOrOptions === "string") {
    path = pathOrOptions;
    options = maybeOptions;
  } else {
    options = pathOrOptions;
    path = options.path || "";
  }

  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  const requestUrl = `${API_URL}/api/v1/clients${cleanPath}`;

  try {
    const response = await fetch(requestUrl, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: options.signal || AbortSignal.timeout(10000),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "No se pudo completar la solicitud");
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw error;
    if (error instanceof TypeError || error.name === "TimeoutError")
      throw new Error("No se pudo conectar con el servidor. Comprueba que esté encendido");
    throw error;
  }
}

export async function createClient(clientData) {
  return clientRequest({
    method: "POST",
    body: JSON.stringify(clientData),
  });
}

export async function updateClient(id, clientData) {
  if (!id) throw new Error("Se requiere el identificador del cliente para actualizar");
  return clientRequest(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(clientData),
  });
}

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

export function validateClient({
  name = "",
  email = "",
  rut = "",
  phone = "",
  address = "",
  clientType = "persona",
  contactName = "",
} = {}) {
  const errors = {};
  const normalizedName = name.trim();
  const normalizedEmail = email.trim();
  if (normalizedName.length < 2 || normalizedName.length > 120) errors.name = "Escribe entre 2 y 120 caracteres";
  if (normalizedEmail.length === 0) errors.email = "El correo es obligatorio";
  else if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    errors.email = "Escribe un correo válido de hasta 254 caracteres";
  if (rut.trim().length > 20) errors.rut = "El RUT admite hasta 20 caracteres";
  if (phone.trim().length > 40) errors.phone = "El teléfono admite hasta 40 caracteres";
  if (address.trim().length > 240) errors.address = "La dirección admite hasta 240 caracteres";
  if (clientType === "empresa" && (!contactName || contactName.trim().length < 2)) {
    errors.contactName = "Para empresas es obligatorio indicar el encargado de contacto";
  }
  return errors;
}