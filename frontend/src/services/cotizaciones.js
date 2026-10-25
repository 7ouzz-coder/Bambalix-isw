import { quoteFormSchema } from "../schemas/cotizaciones.js";
export { quoteFormSchema };

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_BASE = rawApiUrl.endsWith("/api/v1") ? rawApiUrl : `${rawApiUrl.replace(/\/$/, "")}/api/v1`;

export async function quoteRequest(path = "", options = {}) {
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  const requestUrl = `${API_BASE}/quotes${cleanPath}`;

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

export async function getQuotes(filters = {}) {
  const params = new URLSearchParams();
  if (filters.clientId) params.append("clientId", filters.clientId);
  if (filters.eventId) params.append("eventId", filters.eventId);
  if (filters.status) params.append("status", filters.status);
  const query = params.toString() ? `?${params.toString()}` : "";
  return quoteRequest(query);
}

export async function getQuoteById(id) {
  return quoteRequest(`/${id}`);
}

export async function createQuote(payload) {
  return quoteRequest("", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitQuoteForReview(id) {
  return quoteRequest(`/${id}/submit-review`, {
    method: "POST",
  });
}

/**
 * Solicitud de aprobación gerencial.
 * No inyecta cabeceras simuladas; viaja con las credenciales de sesión del cliente al servidor.
 */
export async function approveQuote(id) {
  return quoteRequest(`/${id}/approve`, {
    method: "POST",
  });
}
