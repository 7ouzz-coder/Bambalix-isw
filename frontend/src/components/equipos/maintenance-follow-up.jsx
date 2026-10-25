"use client";

import { useEffect, useId, useState } from "react";
import { getMaintenanceNotes } from "@/services/equipos";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
import { MaintenanceActionForm } from "./maintenance-action-form";

export function MaintenanceFollowUp({ equipmentId, maintenanceId, busy, onBack, onChanged }) {
  const id = useId();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [action, setAction] = useState("");
  const [notice, setNotice] = useState("");
  const [state, setState] = useState({ loading: true, items: [], maintenance: null, total: 0, pages: 1, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    getMaintenanceNotes(equipmentId, maintenanceId, { page }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(result => {
        if (result?.maintenance?.id !== maintenanceId || !Array.isArray(result.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.pages) || result.pages < 1 || !Number.isInteger(result.page) || result.page < 1 || result.page > result.pages)
          throw new Error("No se pudo consultar el seguimiento");
        if (!controller.signal.aborted) {
          setState({ ...result, loading: false, error: "" });
          if (result.page !== page) setPage(result.page);
        }
      }).catch(error => { if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: error.message })); });
    return () => controller.abort();
  }, [equipmentId, maintenanceId, page, attempt]);

  function saved(message) {
    setNotice(message); setAction(""); setPage(1); setAttempt(value => value + 1); onChanged();
  }
  const maintenance = state.maintenance;
  return <section className="equipment-status-history" aria-labelledby={`${id}-heading`} aria-busy={state.loading}>
    <h3 id={`${id}-heading`}>Seguimiento de mantención</h3>
    {notice && <p role="status" className="equipment-status-notice">{notice}</p>}
    {state.loading ? <p role="status">Consultando seguimiento…</p> : state.error ? <>
      <p role="alert" className="error-message">{state.error}</p>
      <Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Reintentar</Button>
    </> : <>
      <p>{maintenance.reason}</p>
      <p>Periodo: {new Date(maintenance.startsAt).toLocaleString("es-CL")} — {new Date(maintenance.endsAt).toLocaleString("es-CL")}</p>
      <p>Estado: <strong>{maintenance.closedAt ? "Cerrada" : "Abierta"}</strong></p>
      {maintenance.closedAt ? <>
        <p>Cierre: <time dateTime={maintenance.closedAt}>{new Date(maintenance.closedAt).toLocaleString("es-CL")}</time></p>
        <p>Resultado: {maintenance.closingNotes}</p>
      </> : action ? <MaintenanceActionForm key={action} equipmentId={equipmentId} maintenanceId={maintenanceId} closing={action === "close"} busy={busy} onSaved={saved} onCancel={() => setAction("")} /> : <div className="form-actions flex-wrap">
        <Button variant="outline" onClick={() => { setNotice(""); setAction("note"); }}>Añadir observación</Button>
        <Button onClick={() => { setNotice(""); setAction("close"); }}>Cerrar mantención</Button>
      </div>}
      <h4>Bitácora de observaciones</h4>
      {state.items.length ? <ol>{state.items.map(note => <li key={note.id}>
        <p><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString("es-CL")}</time></p><p>{note.content}</p>
      </li>)}</ol> : <p>No hay observaciones de seguimiento.</p>}
      <ListPagination page={page} pages={state.pages} disabled={state.loading || Boolean(action)} label="Páginas de observaciones" onChange={setPage} />
    </>}
    <Button type="button" variant="outline" disabled={Boolean(action)} onClick={onBack}>Volver a mantenciones</Button>
  </section>;
}
