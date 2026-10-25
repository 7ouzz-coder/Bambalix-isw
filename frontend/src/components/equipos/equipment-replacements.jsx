"use client";

import { useEffect, useId, useState } from "react";
import { getEquipmentReplacements } from "@/services/equipos";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
import { ReplacementRequestForm } from "./replacement-request-form";
import { ReplacementDecisionForm } from "./replacement-decision-form";

const labels = { PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada" };

export function EquipmentReplacements({ equipment, assignment, busy, onBack }) {
  const id = useId();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [decision, setDecision] = useState(null);
  const [swapped, setSwapped] = useState(false);
  const [state, setState] = useState({ loading: true, items: [], canDecide: false, total: 0, pages: 1, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    getEquipmentReplacements(equipment.id, assignment.id, { page }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(result => {
        if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.pages) || result.pages < 1 || !Number.isInteger(result.page) || result.page < 1 || result.page > result.pages || typeof result.canDecide !== "boolean" ||
            (result.assignmentReleasedAt !== null && (typeof result.assignmentReleasedAt !== "string" || !Number.isFinite(Date.parse(result.assignmentReleasedAt)))))
          throw new Error("No se pudieron consultar los reemplazos");
        if (!controller.signal.aborted) {
          setState({ ...result, loading: false, error: "" });
          if (result.page !== page) setPage(result.page);
        }
      }).catch(error => { if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: error.message, canDecide: false })); });
    return () => controller.abort();
  }, [equipment.id, assignment.id, page, attempt]);
  function saved(message, result) {
    if (result?.resultingAssignmentId) setSwapped(true);
    setNotice(message); setCreating(false); setDecision(null); setPage(1); setAttempt(value => value + 1);
  }
  const editing = creating || Boolean(decision);
  const originalReleased = Boolean(assignment.releasedAt || state.assignmentReleasedAt || swapped);
  return <section className="equipment-status-history" aria-labelledby={id} aria-busy={state.loading}>
    <h3 id={id}>Reemplazos de equipo</h3>
    <p>{assignment.event.title} · #{assignment.event.id}</p>
    <p className="form-note">Solicitar no reserva equipos. Aprobar un sustituto registrado libera el original y asigna el sustituto al mismo evento y periodo. Una alternativa externa solo queda autorizada.</p>
    {notice && <p role="status" className="equipment-status-notice">{notice}</p>}
    {creating ? <ReplacementRequestForm equipmentId={equipment.id} assignmentId={assignment.id} busy={busy} onSaved={saved} onCancel={() => setCreating(false)} />
      : decision ? <ReplacementDecisionForm equipmentId={equipment.id} assignmentId={assignment.id} replacement={decision.replacement} status={decision.status} busy={busy} onSaved={saved} onCancel={() => setDecision(null)} />
      : !originalReleased && <Button type="button" onClick={() => { setNotice(""); setCreating(true); }}>Solicitar reemplazo</Button>}
    {state.loading ? <p role="status">Consultando solicitudes…</p> : state.error ? <><p role="alert" className="error-message">{state.error}</p><Button variant="outline" disabled={editing} onClick={() => setAttempt(value => value + 1)}>Reintentar</Button></> : <>
      {!state.canDecide && <p className="form-note">Aprobar o rechazar requiere una sesión de gerente validada por el servidor.</p>}
      {!state.items.length ? <p>No hay solicitudes de reemplazo.</p> : <ol>{state.items.map(item => <li key={item.id}>
        <p><strong>{item.proposedResource ? `${item.proposedResource.code} · ${item.proposedResource.name}` : item.externalAlternative}</strong></p>
        <p>Estado: {labels[item.status] || "Desconocido"}</p>
        <p>Solicitud: <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("es-CL")}</time></p>
        <p>Periodo: {new Date(item.startsAt).toLocaleString("es-CL")} — {new Date(item.endsAt).toLocaleString("es-CL")}</p>
        <p>Motivo: {item.reason}</p>
        {item.estimatedCost !== null && <p>Costo estimado: ${Number(item.estimatedCost).toLocaleString("es-CL", { maximumFractionDigits: 2 })}</p>}
        {item.status === "PENDING" ? <div className="form-actions flex-wrap">
          <Button type="button" disabled={!state.canDecide || editing || originalReleased} onClick={() => { setNotice(""); setDecision({ replacement: item, status: "APPROVED" }); }}>Aprobar</Button>
          <Button type="button" variant="outline" disabled={!state.canDecide || editing} onClick={() => { setNotice(""); setDecision({ replacement: item, status: "REJECTED" }); }}>Rechazar</Button>
        </div> : <>
          <p>Decisión: <time dateTime={item.decidedAt}>{new Date(item.decidedAt).toLocaleString("es-CL")}</time></p>
          <p>{item.decisionReason}</p>
          {item.status === "APPROVED" && <p>{item.resultingAssignmentId ? `Intercambio realizado. Asignación del sustituto: ${item.resultingAssignmentId}.`
            : item.proposedResourceId ? "Aprobación registrada sin intercambio de asignación." : "Alternativa externa autorizada, sin intercambio de asignación."}</p>}
        </>}
      </li>)}</ol>}
      <ListPagination page={page} pages={state.pages} disabled={state.loading || editing} label="Páginas de solicitudes de reemplazo" onChange={setPage} />
    </>}
    <Button type="button" variant="outline" disabled={editing} onClick={onBack}>Volver a asignaciones</Button>
  </section>;
}
