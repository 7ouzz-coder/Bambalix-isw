import { apiBase as API_BASE } from "./api-url.js";
import { sessionFetch } from "./sesion.js";
import { paymentFormSchema } from "../schemas/pagos.js";
export { paymentFormSchema };


export async function paymentRequest(path = "", options = {}) {
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  const requestUrl = `${API_BASE}/payments${cleanPath}`;

  try {
    const response = await sessionFetch(requestUrl, {
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

export async function registerPayment(payload, file) {
  if (file) {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) {
      throw new Error("Selecciona un PDF, JPEG o PNG de hasta 2 MB");
    }
    const encoded = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("No se pudo leer el comprobante"));
      reader.readAsDataURL(file);
    });
    return paymentRequest("", {
      method: "POST",
      headers: { "Content-Type": "application/vnd.bambalix.payment+json" },
      body: JSON.stringify({ ...payload, receipt: { mime: file.type, base64: encoded } }),
    });
  }
  return paymentRequest("", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Solicitud de verificación de pago.
 * No inyecta cabeceras simuladas; la autorización la realiza el backend.
 */
export async function verifyPayment(paymentId) {
  if (!paymentId) throw new Error("Se requiere el identificador del pago para verificar");
  return paymentRequest(`/${paymentId}/verify`, {
    method: "POST",
  });
}


export async function downloadPaymentReceipt(paymentId) {
  const response = await sessionFetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}/receipt`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("No se pudo descargar el comprobante");
  const file = await response.blob();
  const extension = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" }[file.type];
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `comprobante.${extension || "bin"}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
