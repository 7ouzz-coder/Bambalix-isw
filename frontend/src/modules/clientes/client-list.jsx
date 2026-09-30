"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientRequest } from "@/services/clientes";

export function ClientList({ revision }) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    clientRequest({ signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(items => {
        if (!Array.isArray(items)) throw new Error("El servidor respondió con un listado inválido");
        if (!controller.signal.aborted) setState({ loading: false, items, error: "" });
      }).catch(error => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], error: error.message });
      });
    return () => controller.abort();
  }, [revision, attempt]);

  return <section className="equipment-ledger" aria-labelledby="clients-list-heading" aria-busy={state.loading}>
    <div className="ledger-header"><div><h2 id="clients-list-heading">Clientes registrados</h2><p>{state.loading ? "Consultando clientes…" : state.error ? "No se pudo consultar el listado" : `${state.items.length} ${state.items.length === 1 ? "cliente registrado" : "clientes registrados"}`}</p></div>
      <Button variant="outline" disabled={state.loading} onClick={() => setAttempt(previous => previous + 1)}><RefreshCw aria-hidden="true" />Actualizar</Button></div>
    {state.loading ? <div className="list-loading" role="status">Cargando clientes…<div /><div /><div /></div> : state.error ?
      <div className="list-state"><p className="error-message" role="alert">{state.error}</p><Button variant="outline" onClick={() => setAttempt(previous => previous + 1)}>Intentar nuevamente</Button></div> : state.items.length === 0 ?
      <div className="list-state"><div className="empty-icon"><Users aria-hidden="true" /></div><h3>Aún no hay clientes</h3><p>Registra el primer contacto para comenzar.</p></div> :
      <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Correo</TableHead><TableHead>RUT</TableHead><TableHead>Teléfono</TableHead></TableRow></TableHeader>
        <TableBody>{state.items.map(client => <TableRow key={client.id}><TableCell className="equipment-name">{client.name}</TableCell><TableCell>{client.email}</TableCell><TableCell>{client.rut || "—"}</TableCell><TableCell>{client.phone || "—"}</TableCell></TableRow>)}</TableBody></Table>}
  </section>;
}