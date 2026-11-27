"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { publicAgenda, sendPublicRequest } from "@/services/publico";
import { PublicCalendar } from "./public-calendar";

export function computeOccupiedDatesFromEvents(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const dates = new Set();
  for (const item of items) {
    if (!item?.startsAt || !item?.endsAt) continue;
    const start = new Date(item.startsAt);
    const end = new Date(item.endsAt);
    const effectiveEnd = end.getTime() > start.getTime() ? new Date(end.getTime() - 1) : end;

    const startDayStr = formatter.format(start);
    const endDayStr = formatter.format(effectiveEnd);

    const parts = startDayStr.split("-").map(Number);
    let y = parts[0], m = parts[1], d = parts[2];

    while (true) {
      const curStr = [y, String(m).padStart(2, "0"), String(d).padStart(2, "0")].join("-");
      dates.add(curStr);
      if (curStr === endDayStr) break;
      const dt = new Date(Date.UTC(y, m - 1, d + 1));
      y = dt.getUTCFullYear();
      m = dt.getUTCMonth() + 1;
      d = dt.getUTCDate();
    }
  }

  return Array.from(dates).sort();
}
function requestKey() {
 if (!globalThis.crypto?.getRandomValues) throw new Error("No pudimos preparar tu solicitud. Intenta desde un navegador actualizado.");
 if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
 const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
 bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
 const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
 return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function PublicContact() {
 const [agenda, setAgenda] = useState({ loading: true, error: "", items: [] });
 const [attempt, setAttempt] = useState(0);
 const [busy, setBusy] = useState(false);
 const sending = useRef(false);
 const pendingRequest = useRef(null);
 const [requestedDate, setRequestedDate] = useState("");
 const [error, setError] = useState(""); const [notice, setNotice] = useState("");
 useEffect(() => {
  let active = true; setAgenda({ loading: true, error: "", items: [] });
  publicAgenda().then(items => { if (active) setAgenda({ loading: false, error: "", items }); })
   .catch(failure => { if (active) setAgenda({ loading: false, error: failure.message || "No pudimos consultar la agenda.", items: [] }); });
  return () => { active = false; };
 }, [attempt]);
 async function submit(event) {
  event.preventDefault(); if (sending.current) return;
  const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
  data.name = data.name.trim(); data.email = data.email.trim().toLowerCase();
  data.phone = data.phone.trim(); data.service = data.service.trim();
  setError(""); setNotice("");
  if (data.name.trim().length < 2) { setError("Ingresa un nombre de al menos 2 caracteres."); form.elements.name.focus(); return; }
  if (!data.phone) { setError("Ingresa tu teléfono."); form.elements.phone.focus(); return; }
  if (!data.service) { setError("Ingresa el servicio que necesitas."); form.elements.service.focus(); return; }
  sending.current = true; setBusy(true);
  try {
   const payload = JSON.stringify(data);
   if (!pendingRequest.current || pendingRequest.current.payload !== payload)
    pendingRequest.current = { payload, key: requestKey() };
   const result = await sendPublicRequest(data, pendingRequest.current.key);
   pendingRequest.current = null; setNotice(result.message); form.reset(); setRequestedDate("");
  }
  catch (failure) { setError(failure.message || "No pudimos enviar tu solicitud. Intenta nuevamente."); }
  finally { sending.current = false; setBusy(false); }
 }
 const occupiedDates = useMemo(() => computeOccupiedDatesFromEvents(agenda.items), [agenda.items]);
 return <div className="public-contact-grid">
  <section id="agenda" aria-labelledby="public-agenda-heading"><p className="public-eyebrow">ANTES DE EMPEZAR</p><h2 id="public-agenda-heading">Una fecha para tu evento.</h2><p>Elige una fecha de interés para tu solicitud.</p>
   <PublicCalendar selectedDate={requestedDate} onSelect={setRequestedDate} occupiedDates={occupiedDates} disabled={busy} />
   <p className="public-calendar-notice">La disponibilidad de estas fechas aún no está confirmada. Elegir una fecha no la reserva.</p>
   {agenda.loading ? <p role="status">Consultando agenda…</p> : agenda.error ? <div className="public-agenda-message"><p role="status">{agenda.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Consultar nuevamente</button></div> : <><p>Eventos confirmados. Enviar una solicitud no reserva la fecha.</p>{agenda.items.length ? <ul>{agenda.items.map(item => <li key={item.id}><time dateTime={item.startsAt}>{new Date(item.startsAt).toLocaleDateString("es-CL")}</time> · {item.title}</li>)}</ul> : <p>No hay eventos publicados. Consulta la disponibilidad con la productora.</p>}</>}
  </section>
  <section id="solicitar" aria-labelledby="public-request-heading"><h2 id="public-request-heading">Cuéntanos tu idea.</h2><p>Revisaremos la fecha y los servicios que necesitas. No necesitas una cuenta.</p>
   <form onSubmit={submit} className="public-request-form">
    <label>Nombre<input name="name" autoComplete="name" minLength={2} maxLength={120} required disabled={busy}/></label>
    <label>Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy}/></label>
    <label>Teléfono<input name="phone" type="tel" autoComplete="tel" maxLength={40} required disabled={busy}/></label>
    <label>Fecha que te interesa<input name="requestedDate" type="date" required disabled={busy} value={requestedDate} onChange={event => setRequestedDate(event.target.value)}/></label>
    <label className="public-wide">Servicio<input name="service" type="text" placeholder="Ej. Sonido e iluminación para una ceremonia" maxLength={240} required disabled={busy}/></label>
    <p className="public-wide public-form-note">La solicitud está sujeta a revisión de disponibilidad y cotización. No confirma una reserva.</p>
    {error && <p className="public-wide" role="alert">{error}</p>}{notice && <p className="public-wide" role="status">{notice}</p>}
    <button className="public-cta" type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}<span aria-hidden="true">↗</span></button>
   </form>
  </section>
 </div>;
}
