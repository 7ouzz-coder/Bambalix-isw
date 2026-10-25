"use client";

import { useEffect, useState } from "react";
import { Boxes, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEquipmentPage, getEquipmentCategories } from "@/services/equipos";
import { ListPagination } from "@/components/list-pagination";
import { EquipmentStatusDialog, equipmentStatusLabels } from "@/components/equipos/equipment-status-dialog";
import { EquipmentEditDialog } from "@/components/equipos/equipment-edit-dialog";
import { EquipmentMaintenanceDialog } from "@/components/equipos/equipment-maintenance-dialog";
import { EquipmentAssignmentDialog } from "@/components/equipos/equipment-assignment-dialog";

export function EquipmentList({ revision }) {
  const [state, setState] = useState({ loading: true, items: [], total: 0, pages: 1, error: "" });
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [values, setValues] = useState({ name: "", code: "", category: "", status: "" });
  const [filters, setFilters] = useState({ name: "", code: "", category: "", status: "" });
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = Boolean(filters.name || filters.code || filters.category || filters.status);

  useEffect(() => { setPage(1); }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    setCategoryError("");
    getEquipmentCategories({ signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(items => {
        if (!Array.isArray(items) || !items.every(item => typeof item === "string")) throw new Error("No se pudieron consultar las categorías");
        if (!controller.signal.aborted) setCategories(items);
      }).catch(() => {
        if (!controller.signal.aborted) setCategoryError("No se pudieron cargar las categorías. Pulsa Actualizar para reintentar.");
      });
    return () => controller.abort();
  }, [revision, attempt]);

  function search(event) {
    event.preventDefault();
    setFilters({ ...values, name: values.name.trim(), code: values.code.trim() });
    setPage(1); setNotice("");
  }

  function clearFilters() {
    setValues({ name: "", code: "", category: "", status: "" });
    setFilters({ name: "", code: "", category: "", status: "" });
    setPage(1); setNotice("");
  }
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    getEquipmentPage({ ...filters, page }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(result => {
        if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.pages) || result.pages < 1 || !Number.isInteger(result.page) || result.page < 1 || result.page > result.pages)
          throw new Error("El servidor respondió con un listado inválido");
        if (!controller.signal.aborted) {
          setState({ loading: false, items: result.items, total: result.total, pages: result.pages, error: "" });
          if (result.page !== page) setPage(result.page);
        }
      }).catch(error => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], total: 0, pages: 1, error: error.message });
      });
    return () => controller.abort();
  }, [revision, attempt, filters, page]);

  return <section className="equipment-ledger" aria-labelledby="list-heading" aria-busy={state.loading}>
    <div className="ledger-header"><div><h2 id="list-heading">Equipos registrados</h2><p role="status">{state.loading ? "Consultando inventario…" : state.error ? "No se pudo consultar el inventario" : `${state.total} ${state.total === 1 ? "equipo encontrado" : "equipos encontrados"}`}</p></div>
      <Button variant="outline" disabled={state.loading} onClick={() => setAttempt(previous => previous + 1)}><RefreshCw aria-hidden="true" />Actualizar</Button></div>
    <form className="equipment-filters equipment-inventory-filters" onSubmit={search}>
      <div className="field"><Label htmlFor="equipment-name-search">Nombre del equipo</Label><Input id="equipment-name-search" type="search" maxLength={120} placeholder="Buscar por nombre" value={values.name} onChange={event => setValues(previous => ({ ...previous, name: event.target.value }))} /></div>
      <div className="field"><Label htmlFor="equipment-code-search">Código interno</Label><Input id="equipment-code-search" type="search" maxLength={60} placeholder="Buscar por código" value={values.code} onChange={event => setValues(previous => ({ ...previous, code: event.target.value }))} /></div>
      <div className="field"><Label htmlFor="equipment-category-filter">Categoría</Label><select id="equipment-category-filter" className="equipment-category-filter" value={values.category} onChange={event => setValues(previous => ({ ...previous, category: event.target.value }))}><option value="">Todas las categorías</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></div>
      <div className="field"><Label htmlFor="equipment-status-filter">Estado operativo</Label><select id="equipment-status-filter" className="equipment-category-filter" value={values.status} onChange={event => setValues(previous => ({ ...previous, status: event.target.value }))}><option value="">Todos los estados</option>{Object.entries(equipmentStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></div>
      <div className="equipment-filter-actions"><Button type="submit" disabled={state.loading}>Buscar</Button><Button type="button" variant="outline" onClick={clearFilters} disabled={state.loading || (!values.name && !values.code && !values.category && !values.status && !filtered)}>Limpiar</Button></div>
      {categoryError && <p className="field-error" role="alert">{categoryError}</p>}
    </form>
    {notice && <p role="status" className="equipment-status-notice">{notice}</p>}
    {state.loading ? <div className="list-loading" role="status">Cargando equipos…<div /><div /><div /></div> : state.error ?
      <div className="list-state"><p className="error-message" role="alert">{state.error}</p><Button variant="outline" onClick={() => setAttempt(previous => previous + 1)}>Intentar nuevamente</Button></div> : state.items.length === 0 ?
      <div className="list-state"><div className="empty-icon"><Boxes aria-hidden="true" /></div><h3>{filtered ? "No se encontraron equipos" : "Tu inventario comienza aquí"}</h3><p>{filtered ? "Prueba otro nombre, código, categoría o estado, o limpia los filtros." : <>Aún no hay equipos registrados.<br />Agrega el primero con «Registrar equipo».</>}</p></div> :
      <Table><TableHeader><TableRow><TableHead>Equipo</TableHead><TableHead>Categoría</TableHead><TableHead>Código interno</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
        <TableBody>{state.items.map(item => <TableRow key={item.id}><TableCell className="equipment-name">{item.name}</TableCell><TableCell>{item.category}</TableCell><TableCell><span className={item.code ? "equipment-code" : "muted-code"}>{item.code || "Sin código"}</span></TableCell><TableCell>{equipmentStatusLabels[item.status] || "Sin revisar"}</TableCell><TableCell><div className="equipment-row-actions"><EquipmentStatusDialog equipment={item} onSaved={updated => {
          setAttempt(previous => previous + 1);
          setNotice(`Estado de «${updated.name}» actualizado correctamente.`);
        }} /><EquipmentEditDialog equipment={item} onSaved={updated => { setNotice(`Ficha de «${updated.name}» actualizada correctamente.`); setAttempt(previous => previous + 1); }} /><EquipmentMaintenanceDialog equipment={item} /><EquipmentAssignmentDialog equipment={item} /></div></TableCell></TableRow>)}</TableBody></Table>}
    {!state.error && <ListPagination page={page} pages={state.pages} disabled={state.loading} label="Páginas de equipos" onChange={next => { setPage(next); setNotice(""); }} />}
    <div className="ledger-foot">El estado operativo no indica disponibilidad para una fecha.</div>
  </section>;
}
