const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function clientRequest(options = {}) {
  try {
    const response = await fetch(`${API_URL}/api/v1/clients`, {
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

export function validateClient({ name = "", email = "", rut = "", phone = "", address = "" } = {}) {
  const errors = {};
  const normalizedName = name.trim();
  const normalizedEmail = email.trim();
  if (normalizedName.length < 2 || normalizedName.length > 120) errors.name = "Escribe entre 2 y 120 caracteres";
  if (normalizedEmail.length === 0) errors.email = "El correo es obligatorio";
  else if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.email = "Escribe un correo válido de hasta 254 caracteres";
  if (rut.trim().length > 20) errors.rut = "El RUT admite hasta 20 caracteres";
  if (phone.trim().length > 40) errors.phone = "El teléfono admite hasta 40 caracteres";
  if (address.trim().length > 240) errors.address = "La dirección admite hasta 240 caracteres";
  return errors;
}