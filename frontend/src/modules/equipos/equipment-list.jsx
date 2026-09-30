"use client";

import { useEffect, useState } from "react";
import { Boxes, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { equipmentRequest } from "@/services/equipos";

export function EquipmentList({ revision }) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    equipmentRequest({ signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(items => {
        if (!Array.isArray(items)) throw new Error("El servidor respondió con un listado inválido");
        if (!controller.signal.aborted) setState({ loading: false, items, error: "" });
      }).catch(error => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], error: error.message });
      });
    return () => controller.abort();
  }, [revision, attempt]);

  return <section className="equipment-ledger" aria-labelledby="list-heading" aria-busy={state.loading}>
    <div className="ledger-header"><div><h2 id="list-heading">Equipos registrados</h2><p>{state.loading ? "Consultando inventario…" : state.error ? "No se pudo consultar el inventario" : `${state.items.length} ${state.items.length === 1 ? "equipo registrado" : "equipos registrados"}`}</p></div>
      <Button variant="outline" disabled={state.loading} onClick={() => setAttempt(previous => previous + 1)}><RefreshCw aria-hidden="true" />Actualizar</Button></div>
    {state.loading ? <div className="list-loading" role="status">Cargando equipos…<div /><div /><div /></div> : state.error ?
      <div className="list-state"><p className="error-message" role="alert">{state.error}</p><Button variant="outline" onClick={() => setAttempt(previous => previous + 1)}>Intentar nuevamente</Button></div> : state.items.length === 0 ?
      <div className="list-state"><div className="empty-icon"><Boxes aria-hidden="true" /></div><h3>Tu inventario comienza aquí</h3><p>Aún no hay equipos registrados.<br />Agrega el primero con «Registrar equipo».</p></div> :
      <Table><TableHeader><TableRow><TableHead>Equipo</TableHead><TableHead>Categoría</TableHead><TableHead>Código interno</TableHead></TableRow></TableHeader>
        <TableBody>{state.items.map(item => <TableRow key={item.id}><TableCell className="equipment-name">{item.name}</TableCell><TableCell>{item.category}</TableCell><TableCell><span className={item.code ? "equipment-code" : "muted-code"}>{item.code || "Sin código"}</span></TableCell></TableRow>)}</TableBody></Table>}
    <div className="ledger-foot">{state.items.length === 200 ? "Se muestran los primeros 200 equipos. " : ""}Este registro no indica disponibilidad ni estado de mantención.</div>
  </section>;
}
