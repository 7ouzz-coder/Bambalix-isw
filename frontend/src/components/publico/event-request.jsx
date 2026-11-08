"use client";
import { useEffect, useState } from "react";
import { publicAgenda, sendPublicRequest } from "@/services/publico";
import { PublicCalendar } from "./public-calendar";
const services = ["Seminarios y congresos", "Ceremonias académicas", "Shows y conciertos", "Banquetería y celebraciones", "Arriendo de equipamiento", "Asesoría de producción"];
export function PublicContact() {
 const [agenda, setAgenda] = useState({ loading: true, error: "", items: [] });
 const [attempt, setAttempt] = useState(0);
 const [busy, setBusy] = useState(false);
 const [requestedDate, setRequestedDate] = useState("");
 const [error, setError] = useState(""); const [notice, setNotice] = useState("");
 useEffect(() => {
  let active = true; setAgenda({ loading: true, error: "", items: [] });
  publicAgenda().then(items => { if (active) setAgenda({ loading: false, error: "", items }); })
   .catch(failure => { if (active) setAgenda({ loading: false, error: failure.message || "No pudimos consultar la agenda.", items: [] }); });
  return () => { active = false; };
 }, [attempt]);
 async function submit(event) {
  event.preventDefault(); if (busy) return;
  const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
  setBusy(true); setError(""); setNotice("");
  try { const result = await sendPublicRequest(data); setNotice(result.message); form.reset(); setRequestedDate(""); }
  catch (failure) { setError(failure.message || "No pudimos enviar tu solicitud. Intenta nuevamente."); }
  finally { setBusy(false); }
 }
 return <div className="public-contact-grid">
  <section id="agenda" aria-labelledby="public-agenda-heading"><p className="public-eyebrow">ANTES DE EMPEZAR</p><h2 id="public-agenda-heading">Una fecha para tu evento.</h2><p>Elige una fecha de interés para tu solicitud.</p>
   <PublicCalendar selectedDate={requestedDate} onSelect={setRequestedDate} />
   <p className="public-calendar-notice">La disponibilidad de estas fechas aún no está confirmada. Elegir una fecha no la reserva.</p>
   {agenda.loading ? <p role="status">Consultando agenda…</p> : agenda.error ? <div className="public-agenda-message"><p role="status">{agenda.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Consultar nuevamente</button></div> : <><p>Eventos confirmados. Enviar una solicitud no reserva la fecha.</p>{agenda.items.length ? <ul>{agenda.items.map(item => <li key={item.id}><time dateTime={item.startsAt}>{new Date(item.startsAt).toLocaleDateString("es-CL")}</time> · {item.title}</li>)}</ul> : <p>No hay eventos publicados. Consulta la disponibilidad con la productora.</p>}</>}
  </section>
  <section id="solicitar" aria-labelledby="public-request-heading"><h2 id="public-request-heading">Cuéntanos tu idea.</h2><p>Revisaremos la fecha y los servicios que necesitas. No necesitas una cuenta.</p>
   <form onSubmit={submit} className="public-request-form">
    <label>Nombre<input name="name" autoComplete="name" minLength={2} maxLength={120} required disabled={busy}/></label>
    <label>Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy}/></label>
    <label>Teléfono (opcional)<input name="phone" type="tel" autoComplete="tel" maxLength={40} disabled={busy}/></label>
    <label>Fecha que te interesa<input name="requestedDate" type="date" required disabled={busy} value={requestedDate} onChange={event => setRequestedDate(event.target.value)}/></label>
    <label className="public-wide">Servicio<select name="service" required disabled={busy}><option value="">Selecciona un servicio</option>{services.map(service => <option key={service}>{service}</option>)}</select></label>
    <label className="public-wide">¿Qué tienes en mente?<textarea name="message" minLength={10} maxLength={2000} rows={4} required disabled={busy}/></label>
    <p className="public-wide public-form-note">La solicitud está sujeta a revisión de disponibilidad y cotización. No confirma una reserva.</p>
    {error && <p className="public-wide" role="alert">{error}</p>}{notice && <p className="public-wide" role="status">{notice}</p>}
    <button className="public-cta" type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}<span aria-hidden="true">↗</span></button>
   </form>
  </section>
 </div>;
}
