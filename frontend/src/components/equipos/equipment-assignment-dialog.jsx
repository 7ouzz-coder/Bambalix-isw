"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getEquipmentAssignments } from "@/services/equipos";
import { AssignmentForm } from "./assignment-form";
import { AssignmentReleaseForm } from "./assignment-release-form";
import { EquipmentReplacements } from "./equipment-replacements";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import styles from "./equipment-replacements.module.css";

function AssignmentPanel({ equipment, busy, onClose }) {
  const id = useId();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [release, setRelease] = useState(null);
  const [replacementAssignment, setReplacementAssignment] = useState(null);
  const [state, setState] = useState({ loading: true, items: [], pages: 1, total: 0, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    getEquipmentAssignments(equipment.id, { page }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(result => {
        if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.pages) || result.pages < 1 || !Number.isInteger(result.page) || result.page < 1 || result.page > result.pages)
          throw new Error("No se pudieron consultar las asignaciones");
        if (!controller.signal.aborted) {
          setState({ loading: false, ...result, error: "" });
          if (result.page !== page) setPage(result.page);
        }
      }).catch(failure => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], pages: 1, total: 0, error: failure.message });
      });
    return () => controller.abort();
  }, [equipment.id, page, attempt]);

  function saved(message) { setNotice(message); setRelease(null); setPage(1); setAttempt(value => value + 1); }
  if (replacementAssignment) return <EquipmentReplacements equipment={equipment} assignment={replacementAssignment} busy={busy} onBack={() => { setReplacementAssignment(null); setAttempt(value => value + 1); }} />;
  return <>
    {release ? <AssignmentReleaseForm key={release.id} equipmentId={equipment.id} assignment={release} busy={busy} onSaved={saved} onCancel={() => setRelease(null)} /> : <AssignmentForm equipment={equipment} busy={busy} onSaved={saved} onClose={onClose} />}
    {notice && <p role="status" className="equipment-status-notice">{notice}</p>}
    <section className="equipment-status-history" aria-labelledby={id} aria-busy={state.loading}>
      <h3 id={id}>Asignaciones del equipo</h3>
      {state.loading ? <p role="status">Consultando asignaciones…</p> : state.error ? <><p role="alert" className="error-message">{state.error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Reintentar</Button></> : <>
        <p role="status">{state.total} {state.total === 1 ? "asignación registrada" : "asignaciones registradas"}</p>
        {state.items.length === 0 ? <p>No hay asignaciones registradas.</p> : <ol>{state.items.map(item => <li key={item.id}>
          <p>{item.event.title} · #{item.event.id}</p>
          <p>Inicio: <time dateTime={item.startsAt}>{new Date(item.startsAt).toLocaleString("es-CL")}</time></p>
          <p>Término: <time dateTime={item.endsAt}>{new Date(item.endsAt).toLocaleString("es-CL")}</time></p>
          <Button type="button" variant="outline" disabled={Boolean(release)} aria-label={`Reemplazos de ${item.event.title}`} onClick={() => { if (!busy.current) { setReplacementAssignment(item); setNotice(""); } }}>Reemplazos</Button>
          {item.releasedAt ? <><p>Liberada: {new Date(item.releasedAt).toLocaleString("es-CL")}</p><p>{item.releaseReason}</p></> : <>
            <p>Asignación activa</p>
            {(new Date(item.startsAt) > new Date(item.event.startsAt) || new Date(item.endsAt) < new Date(item.event.endsAt)) && <p className="field-error">El evento cambió de fecha. Revisa esta asignación antes de usar el equipo.</p>}
            <Button variant="outline" disabled={Boolean(release)} aria-label={`Liberar asignación de ${item.event.title}`} onClick={() => { if (!busy.current) { setRelease(item); setNotice(""); } }}>Liberar equipo</Button>
          </>}
        </li>)}</ol>}
      </>}
      {!state.error && <ListPagination page={page} pages={state.pages} disabled={state.loading || Boolean(release)} label="Páginas de asignaciones" onChange={next => { if (!busy.current) setPage(next); }} />}
    </section>
    {release && <Button variant="outline" onClick={() => { if (!busy.current) onClose(); }}>Cerrar</Button>}
  </>;
}

export function EquipmentAssignmentDialog({ equipment }) {
  const [open, setOpen] = useState(false);
  const busy = useRef(false);
  return <Dialog open={open} onOpenChange={value => { if (!busy.current) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline" aria-label={`Asignaciones de ${equipment.name}`}>Asignaciones</Button></DialogTrigger>
    <DialogContent className={`equipment-dialog ${styles.dialog}`} showCloseButton={false} onEscapeKeyDown={event => { if (busy.current) event.preventDefault(); }} onPointerDownOutside={event => { if (busy.current) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Asignaciones del equipo</DialogTitle><DialogDescription>{equipment.name} · {equipment.code}</DialogDescription></DialogHeader>
      {open && <AssignmentPanel equipment={equipment} busy={busy} onClose={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}
