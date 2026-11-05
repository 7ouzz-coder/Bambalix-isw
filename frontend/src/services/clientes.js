import { clientFormSchema } from "../schemas/clientes.js";
export { clientFormSchema };

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_BASE = rawApiUrl.endsWith("/api/v1") ? rawApiUrl : `${rawApiUrl.replace(/\/$/, "")}/api/v1`;

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
  const requestUrl = `${API_BASE}/clients${cleanPath}`;

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
  if (rut && rut.trim().length > 20) errors.rut = "El RUT admite hasta 20 caracteres";
  if (phone && phone.trim().length > 40) errors.phone = "El teléfono admite hasta 40 caracteres";
  if (address && address.trim().length > 240) errors.address = "La dirección admite hasta 240 caracteres";
  if (clientType === "empresa" && (!contactName || contactName.trim().length < 2)) {
    errors.contactName = "Para empresas es obligatorio indicar el encargado de contacto";
  }
  return errors;
}
