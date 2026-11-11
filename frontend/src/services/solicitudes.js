import { apiBase as base } from "./api-url.js";
import { z } from "zod";
import { sessionFetch } from "./sesion.js";
const listSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), name: z.string(), email: z.string().email(), phone: z.string().nullable(), requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), service: z.string(), message: z.string(), createdAt: z.string().datetime() })),
  total: z.number().int().nonnegative(), pages: z.number().int().positive(), page: z.number().int().positive(),
}).refine(data => data.page <= data.pages);
export async function listRequests(page, signal) {
  let response;
  try { response = await sessionFetch(`${base}/requests?page=${page}`, { signal, cache: "no-store" }); }
  catch (error) {
    if (signal?.aborted && signal.reason?.name === "AbortError") throw error;
    throw new Error("No se pudieron consultar las solicitudes. Intenta nuevamente.");
  }
  if (!response.ok) throw new Error("No se pudieron consultar las solicitudes. Intenta nuevamente.");
  let data;
  try { data = await response.json(); }
  catch { throw new Error("No se pudieron consultar las solicitudes. Intenta nuevamente."); }
  const parsed = listSchema.safeParse(data);
  if (!parsed.success) throw new Error("El servidor devolvió un listado de solicitudes inválido.");
  return parsed.data;
}
