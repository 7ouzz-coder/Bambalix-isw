"use client";
import { useEffect, useState } from "react";
import { listRequests } from "@/services/solicitudes";
import { Button } from "@/components/ui/button";

export function RequestInbox() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", items: [], total: 0, pages: 1 });
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    listRequests(page, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(result => {
        if (controller.signal.aborted) return;
        setState({ ...result, loading: false, error: "" });
        if (result.page !== page) setPage(result.page);
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ loading: false, error: error.message, items: [], total: 0, pages: 1 });
      });
    return () => controller.abort();
  }, [page, revision]);
  return <section aria-label="Solicitudes recibidas" aria-busy={state.loading}>
    <div className="page-heading"><div><h1>Solicitudes recibidas</h1><p>Consultas enviadas desde la página pública. No confirman una reserva.</p></div>
      <Button variant="outline" disabled={state.loading} onClick={() => setRevision(value => value + 1)}>Actualizar</Button></div>
    {state.loading ? <p role="status">Consultando solicitudes…</p> : state.error ? <div><p role="alert">{state.error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Intentar nuevamente</Button></div> : <>
      <p role="status">{state.total} {state.total === 1 ? "solicitud recibida" : "solicitudes recibidas"}</p>
      {!state.items.length ? <p>Aún no se han recibido solicitudes.</p> : state.items.map(item => <article key={item.id} className="equipment-ledger" style={{ padding: 24, marginTop: 16, overflowWrap: "anywhere" }}>
        <h2>{item.name}</h2><p>{item.service}</p>
        <dl><dt>Correo</dt><dd>{item.email}</dd><dt>Teléfono</dt><dd>{item.phone || "No informado"}</dd>
          <dt>Fecha solicitada</dt><dd><time dateTime={item.requestedDate}>{item.requestedDate.split("-").reverse().join("/")}</time></dd>
          <dt>Recibida</dt><dd><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("es-CL")}</time></dd>
          <dt>Descripción</dt><dd style={{ whiteSpace: "pre-wrap" }}>{item.message}</dd></dl>
      </article>)}
      {state.pages > 1 && <nav aria-label="Páginas de solicitudes" style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 20 }}>
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</Button><span>Página {page} de {state.pages}</span>
        <Button variant="outline" disabled={page >= state.pages} onClick={() => setPage(value => value + 1)}>Siguiente</Button></nav>}
    </>}
  </section>;
}
