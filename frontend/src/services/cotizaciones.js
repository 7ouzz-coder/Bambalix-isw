import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function quoteRequest(path = "", options = {}) {
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  const requestUrl = `${API_URL}/api/v1/quotes${cleanPath}`;

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

export async function approveQuote(id, approver = { role: "gerente", name: "Gerente Comercial" }) {
  return quoteRequest(`/${id}/approve`, {
    method: "POST",
    headers: {
      "x-user-role": approver.role || "gerente",
      "x-user-name": approver.name || "Gerente Comercial",
    },
  });
}

const quoteItemFormSchema = z.object({
  concept: z
    .string()
    .trim()
    .min(2, "El concepto debe tener al menos 2 caracteres")
    .max(200, "El concepto admite hasta 200 caracteres"),
  quantity: z.coerce
    .number()
    .int("La cantidad debe ser entera")
    .min(1, "La cantidad mínima es 1"),
  unitPrice: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo"),
});

export const quoteFormSchema = z.object({
  clientId: z.string().min(1, "Debes seleccionar un cliente"),
  eventId: z.coerce.number().int().positive("Debes seleccionar un evento válido"),
  notes: z.string().max(500, "Las notas admiten hasta 500 caracteres").optional().or(z.literal("")),
  items: z.array(quoteItemFormSchema).min(1, "Debes agregar al menos un ítem a la cotización"),
});
