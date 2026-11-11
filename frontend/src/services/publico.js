import { apiBase as base } from "./api-url.js";
import { z } from "zod";
const eventsSchema = z.array(z.object({ id: z.number().int().positive(), title: z.string().min(1), startsAt: z.string().datetime(), endsAt: z.string().datetime() }));
export async function publicAgenda() {
 let response;
 try { response = await fetch(base + "/events/public", { credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(10000) }); }
 catch { throw new Error("No pudimos consultar la agenda. Puedes enviar la fecha que te interesa y la productora la revisará."); }
 if (response.status === 503) throw new Error("Puedes enviar la fecha que te interesa y la productora la revisará.");
 if (!response.ok) throw new Error("No pudimos consultar la agenda. Puedes enviar la fecha que te interesa y la productora la revisará.");
 let data;
 try { data = await response.json(); }
 catch { throw new Error("No pudimos consultar la agenda. Intenta nuevamente."); }
 const parsed = eventsSchema.safeParse(data);
 if (!parsed.success) throw new Error("No pudimos consultar la agenda. Intenta nuevamente.");
 return parsed.data;
}
export async function sendPublicRequest(data, idempotencyKey) {
 const uncertain = "No pudimos confirmar el envío. Puedes reintentar sin modificar los datos ni recargar la página.";
 let response;
 try { response = await fetch(base + "/public/requests", { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, body: JSON.stringify(data), signal: AbortSignal.timeout(10000) }); }
 catch { throw new Error(uncertain); }
 let result;
 try { result = await response.json(); }
 catch { throw new Error(uncertain); }
 if (response.status >= 500) throw new Error(uncertain);
 if (!response.ok) {
  const message = typeof result?.message === "string" && result.message.trim() ? result.message : "No pudimos enviar tu solicitud. Intenta nuevamente.";
  throw new Error(message);
 }
 if (typeof result?.message !== "string" || !result.message.trim()) throw new Error(uncertain);
 return result;
}
