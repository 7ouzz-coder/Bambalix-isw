import { apiBase as base } from "./api-url.js";
import { z } from "zod";
const eventsSchema = z.array(z.object({ id: z.number().int().positive(), title: z.string().min(1), startsAt: z.string().datetime(), endsAt: z.string().datetime() }));
export async function publicAgenda() {
 let response;
 try { response = await fetch(base + "/events/public", { credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(10000) }); }
 catch { throw new Error("No pudimos consultar la agenda. Puedes enviar la fecha que te interesa y la productora la revisará."); }
 if (!response.ok) throw new Error("No pudimos consultar la agenda. Puedes enviar la fecha que te interesa y la productora la revisará.");
 const parsed = eventsSchema.safeParse(await response.json());
 if (!parsed.success) throw new Error("No pudimos consultar la agenda. Intenta nuevamente.");
 return parsed.data;
}
export async function sendPublicRequest(data) {
 const response = await fetch(base + "/public/requests", { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: AbortSignal.timeout(10000) });
 const result = await response.json();
 if (!response.ok) throw new Error(result.message || "No pudimos enviar tu solicitud. Intenta nuevamente.");
 return result;
}
