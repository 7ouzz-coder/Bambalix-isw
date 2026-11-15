"use client";

import { useEffect, useId, useState } from "react";
import { getEquipmentPage } from "@/services/equipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/list-pagination";

export function ReplacementEquipmentPicker({ equipmentId, value, onChange, disabled, error }) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [state, setState] = useState({ loading: true, items: [], pages: 1, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    getEquipmentPage({ code: query, page, pageSize: 10, status: "OPERATIONAL" }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(result => {
        if (!Array.isArray(result?.items) || !Number.isInteger(result.pages) || result.pages < 1 || !Number.isInteger(result.page) || result.page < 1 || result.page > result.pages)
          throw new Error("No se pudieron consultar los equipos");
        if (!controller.signal.aborted) {
          setState({ loading: false, items: result.items.filter(item => item.id !== equipmentId), pages: result.pages, error: "" });
          if (result.page !== page) setPage(result.page);
        }
      }).catch(failure => { if (!controller.signal.aborted) setState({ loading: false, items: [], pages: 1, error: failure.message }); });
    return () => controller.abort();
  }, [equipmentId, query, page, attempt]);
  function searchEquipment() { setPage(1); setQuery(search.trim()); setAttempt(value => value + 1); }
  return <div className="field">
    <Label htmlFor={`${id}-code`}>Buscar por código interno</Label>
    <Input id={`${id}-code`} type="search" maxLength={60} value={search} disabled={disabled} onChange={event => setSearch(event.target.value)}
      onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); searchEquipment(); } }} />
    <Button type="button" variant="outline" disabled={disabled || state.loading} onClick={searchEquipment}>Buscar equipo</Button>
    <Label htmlFor={`${id}-equipment`}>Equipo propuesto *</Label>
    <select id={`${id}-equipment`} className="equipment-category-filter" value={value} disabled={disabled || state.loading || Boolean(state.error)}
      onChange={event => { setChosen(state.items.find(item => item.id === event.target.value) || null); onChange(event.target.value); }} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
      <option value="">Selecciona un equipo</option>
      {value && !state.items.some(item => item.id === value) && <option value={value}>{chosen ? `${chosen.code} · ${chosen.name}` : "Equipo seleccionado"}</option>}
      {state.items.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
    </select>
    {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    {state.loading ? <p role="status">Consultando equipos…</p> : state.error ? <><p role="alert" className="error-message">{state.error}</p><Button type="button" variant="outline" disabled={disabled} onClick={() => setAttempt(value => value + 1)}>Reintentar</Button></> : !state.items.length ? <p>No hay otros equipos operativos en esta página.</p> : null}
    {!state.error && <ListPagination page={page} pages={state.pages} disabled={disabled || state.loading} label="Páginas de equipos propuestos" onChange={setPage} />}
    <p className="form-note">Se comprobará la disponibilidad para el periodo completo al guardar y al aprobar.</p>
  </div>;
}
