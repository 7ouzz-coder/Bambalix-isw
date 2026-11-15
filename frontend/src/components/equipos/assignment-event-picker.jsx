"use client";

import { useEffect, useId, useState } from "react";
import { getAssignmentEvents } from "@/services/equipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/list-pagination";

export function AssignmentEventPicker({ selected, onSelect, disabled, error }) {
  const id = useId();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, items: [], pages: 1, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    getAssignmentEvents({ page, search: query }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(result => {
        if (!Array.isArray(result?.items) || !Number.isInteger(result.pages) || result.pages < 1 || !Number.isInteger(result.page) || result.page < 1 || result.page > result.pages)
          throw new Error("No se pudieron consultar los eventos");
        if (!controller.signal.aborted) {
          setState({ loading: false, items: result.items, pages: result.pages, error: "" });
          if (result.page !== page) setPage(result.page);
        }
      }).catch(failure => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], pages: 1, error: failure.message });
      });
    return () => controller.abort();
  }, [page, query, attempt]);

  return <div className="field">
    <Label htmlFor={`${id}-search`}>Buscar evento</Label>
    <Input id={`${id}-search`} type="search" maxLength={160} value={search} disabled={disabled} onChange={event => setSearch(event.target.value)} onKeyDown={event => {
      if (event.key === "Enter") { event.preventDefault(); setPage(1); setQuery(search.trim()); setAttempt(value => value + 1); }
    }} />
    <Button type="button" variant="outline" disabled={disabled || state.loading} onClick={() => { setPage(1); setQuery(search.trim()); setAttempt(value => value + 1); }}>Buscar eventos</Button>
    <Label htmlFor={`${id}-event`}>Evento *</Label>
    <select id={`${id}-event`} className="equipment-category-filter" value={selected ? String(selected.id) : ""} disabled={disabled || state.loading || Boolean(state.error)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => onSelect(state.items.find(item => String(item.id) === event.target.value) || null)}>
      <option value="">Selecciona un evento</option>
      {selected && !state.items.some(item => item.id === selected.id) && <option value={selected.id}>{selected.title} · #{selected.id}</option>}
      {state.items.map(item => <option key={item.id} value={item.id}>{item.title} · #{item.id}</option>)}
    </select>
    {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    {state.loading ? <p role="status">Consultando eventos…</p> : state.error ? <><p role="alert" className="error-message">{state.error}</p><Button type="button" variant="outline" disabled={disabled} onClick={() => setAttempt(value => value + 1)}>Reintentar</Button></> : state.items.length === 0 ? <p>No se encontraron eventos.</p> : null}
    {!state.error && <ListPagination page={page} pages={state.pages} disabled={disabled || state.loading} label="Páginas de eventos para asignar" onChange={setPage} />}
  </div>;
}
