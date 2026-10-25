import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function paymentRequest(path = "", options = {}) {
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  const requestUrl = `${API_URL}/api/v1/payments${cleanPath}`;

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

export async function getPayments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.quoteId) params.append("quoteId", filters.quoteId);
  if (filters.status) params.append("status", filters.status);
  if (filters.method) params.append("method", filters.method);
  const query = params.toString() ? `?${params.toString()}` : "";
  return paymentRequest(query);
}

export async function getQuoteFinancialSummary(quoteId) {
  if (!quoteId) throw new Error("Se requiere el identificador de la cotización");
  return paymentRequest(`/quote/${quoteId}/summary`);
}

export async function registerPayment(payload) {
  return paymentRequest("", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyPayment(paymentId, verifier = { name: "Tesorero / Finanzas" }) {
  if (!paymentId) throw new Error("Se requiere el identificador del pago para verificar");
  return paymentRequest(`/${paymentId}/verify`, {
    method: "POST",
    headers: {
      "x-user-name": verifier.name || "Tesorero / Finanzas",
    },
  });
}

export const paymentFormSchema = z.object({
  quoteId: z.string().min(1, "Debes seleccionar una cotización"),
  method: z.enum(["EFECTIVO", "TRANSFERENCIA"], {
    errorMap: () => ({ message: "Selecciona un método de pago válido (Efectivo o Transferencia)" }),
  }),
  amount: z.coerce
    .number({ invalid_type_error: "Ingresa un monto numérico válido" })
    .positive("El monto debe ser mayor a 0"),
  reference: z
    .string()
    .trim()
    .max(120, "La referencia admite hasta 120 caracteres")
    .optional()
    .or(z.literal("")),
  registeredBy: z
    .string()
    .trim()
    .max(120, "El nombre admite hasta 120 caracteres")
    .optional()
    .or(z.literal("")),
});
