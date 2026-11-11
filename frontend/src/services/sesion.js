import { apiBase } from "./api-url.js";
import { z } from "zod";
const sessionResponse = z.object({
  user: z.object({ id: z.string().min(1), name: z.string().min(1), email: z.string().email(), role: z.string().min(1), authenticated: z.literal(true), permissions: z.array(z.string()) }),
  csrfToken: z.string().regex(/^[a-f0-9]{64}$/),
});
const root = `${apiBase}/auth`;
let csrfToken = null;
export async function currentSession() {
  let response;
  try { response = await fetch(`${root}/me`, { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(10000) }); }
  catch { throw new Error("No se pudo conectar con el servidor. Intenta nuevamente"); }
  if (response.status === 401) { csrfToken = null; return null; }
  if (!response.ok) throw new Error("No se pudo consultar la sesión. Intenta nuevamente");
  let data;
  try { data = await response.json(); }
  catch { throw new Error("No se pudo consultar la sesión. Intenta nuevamente"); }
  const parsed = sessionResponse.safeParse(data);
  if (!parsed.success) throw new Error("El servidor devolvió una sesión inválida");
  csrfToken = parsed.data.csrfToken; return parsed.data.user;
}
export async function startSession(email, password) {
  let response, data;
  try { response = await fetch(`${root}/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); }
  catch { throw new Error("No se pudo conectar con el servidor. Intenta nuevamente"); }
  try { data = await response.json(); }
  catch { throw new Error("No se pudo iniciar sesión. Intenta nuevamente"); }
  if (!response.ok) throw new Error(data?.message || "No se pudo iniciar sesión");
  const parsed = sessionResponse.safeParse(data);
  if (!parsed.success) throw new Error("El servidor devolvió una sesión inválida");
  csrfToken = parsed.data.csrfToken; return parsed.data.user;
}
export async function endSession() {
  let response;
  try { response = await sessionFetch(`${root}/logout`, { method: "POST" }); }
  catch { throw new Error("No se pudo cerrar la sesión. Intenta nuevamente"); }
  if (!response.ok) throw new Error("No se pudo cerrar la sesión. Intenta nuevamente");
  csrfToken = null;
}
export async function sessionFetch(url, options = {}) {
  const writing = !["GET", "HEAD"].includes((options.method || "GET").toUpperCase());
  if (writing && !csrfToken) await currentSession();
  const headers = new Headers(options.headers);
  if (writing && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(url, { ...options, headers, credentials: "include" });
  if (response.status === 401) {
    csrfToken = null;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("bambalix-session-expired"));
  }
  return response;
}
