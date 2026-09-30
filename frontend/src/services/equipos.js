const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function equipmentRequest(options = {}) {
  try {
    const response = await fetch(`${API_URL}/api/v1/operations/resources`, {
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

export function validateEquipment({ name, category, code }) {
  const errors = {};
  if (name.trim().length < 2 || name.trim().length > 120) errors.name = "Escribe entre 2 y 120 caracteres";
  if (category.trim().length < 2 || category.trim().length > 80) errors.category = "Escribe entre 2 y 80 caracteres";
  if (code.trim().length > 60) errors.code = "El código admite hasta 60 caracteres";
  return errors;
}
