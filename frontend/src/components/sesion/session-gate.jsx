"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { currentSession, startSession, endSession } from "@/services/sesion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);
export function SessionGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    currentSession().then(value => { if (active) setUser(value); })
      .catch(() => { if (active) setError("No se pudo consultar la sesión. Intenta nuevamente"); })
      .finally(() => { if (active) setLoading(false); });
    function expired() { setUser(null); setError("Tu sesión terminó. Vuelve a iniciar sesión"); }
    window.addEventListener("bambalix-session-expired", expired);
    return () => { active = false; window.removeEventListener("bambalix-session-expired", expired); };
  }, [attempt]);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError("");
    try { const value = await startSession(data.get("email"), data.get("password")); form.reset(); setUser(value); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function close() {
    if (busy) return;
    setBusy(true); setError("");
    try { await endSession(); setUser(null); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="session-entry"><p role="status">Consultando sesión…</p></main>;
  if (!user) return <main className="session-entry"><section className="session-card">
    <p className="eyebrow">BAMBALIX</p><h1>Acceso del personal</h1><p>Ingresa con tu cuenta de la empresa.</p>
    {error && <p role="alert" className="error-message">{error}</p>}
    <form onSubmit={submit} className="equipment-form">
      <Label htmlFor="session-email">Correo</Label><Input id="session-email" name="email" type="email" maxLength={254} autoComplete="username" required disabled={busy} />
      <Label htmlFor="session-password">Contraseña</Label><Input id="session-password" name="password" type="password" maxLength={128} autoComplete="current-password" required disabled={busy} />
      <Button type="submit" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Comprobar conexión</Button>
    </form>
  </section></main>;
  const links = [["solicitudes", "/solicitudes", "Solicitudes"], ["recursos", "/colaboradores", "Equipos"], ["recursos", "/vehiculos", "Vehículos"], ["clientes", "/clientes", "Clientes"], ["eventos", "/colaboradores?module=eventos", "Eventos"], ["cotizaciones", "/cotizaciones", "Cotizaciones"], ["pagos", "/pagos", "Pagos"]];
  const path = window.location.pathname;
  const area = path === "/colaboradores" ? (new URLSearchParams(window.location.search).get("module") === "eventos" ? "eventos" : "recursos") : path === "/vehiculos" ? "recursos" : path.slice(1);
  const allowed = user.permissions.includes(`${area}:leer`);
  const content = allowed ? children : <main className="session-entry"><section className="session-card"><h1>Acceso interno</h1><p>No tienes permiso para consultar esta área.</p><nav aria-label="Áreas disponibles">{links.filter(([scope]) => user.permissions.includes(`${scope}:leer`)).map(([, href, name]) => <p key={href}><a href={href}>{name}</a></p>)}</nav></section></main>;
  return <SessionContext.Provider value={user}><div className="session-toolbar"><span>{user.name}</span><Button variant="outline" disabled={busy} onClick={close}>Cerrar sesión</Button></div>
    {error && <p role="alert" className="error-message">{error}</p>}{content}</SessionContext.Provider>;
}
