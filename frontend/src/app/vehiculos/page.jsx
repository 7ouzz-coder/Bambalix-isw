"use client";

import { useEffect, useState } from "react";
import { Layers3 } from "lucide-react";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { VehicleForm } from "@/components/vehiculos/vehicle-form";
import { ListPagination } from "@/components/list-pagination";
import { listVehiclePage, getVehicleTypes } from "@/services/vehiculos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function VehiclesPage() {
  const [state, setState] = useState({ loading: true, items: [], total: 0, pages: 1, error: "" });
  const [page, setPage] = useState(1);
  const [value, setValue] = useState("");
  const [type, setType] = useState("");
  const [filters, setFilters] = useState({ q: "", type: "" });
  const [catalog, setCatalog] = useState({ items: [], loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: "" }));
    listVehiclePage({ ...filters, page }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(result => {
        if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.pages) || result.pages < 1 || !Number.isInteger(result.page) || result.page < 1 || result.page > result.pages)
          throw new Error("No se pudo consultar el listado");
        if (!controller.signal.aborted) {
          setState({ loading: false, items: result.items, total: result.total, pages: result.pages, error: "" });
          if (result.page !== page) setPage(result.page);
        }
      }).catch(error => { if (!controller.signal.aborted) setState({ loading: false, items: [], total: 0, pages: 1, error: error.message }); });
    return () => controller.abort();
  }, [filters, page, revision]);
  useEffect(() => {
    const controller = new AbortController();
    setCatalog(previous => ({ ...previous, loading: true, error: "" }));
    getVehicleTypes({ signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(items => {
        if (!Array.isArray(items) || !items.every(item => typeof item === "string")) throw new Error("No se pudieron consultar los tipos de vehículo");
        if (!controller.signal.aborted) setCatalog({ items, loading: false, error: "" });
      }).catch(error => {
        if (!controller.signal.aborted) setCatalog({ items: [], loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [revision]);
  return <div className="workspace">
    <aside className="sidebar"><a href="/" className="brand" aria-label="Bambalix, inicio"><Layers3 aria-hidden="true" />Bambalix<span>®</span></a><p className="nav-label">ESPACIO DE TRABAJO</p><WorkspaceNavigation activeModule="vehiculos" /><div className="sidebar-foot"><p>Detrás de cada evento,<br />todo en su lugar.</p><small>Bambalix</small></div></aside>
    <main className="main-content"><header className="topbar">Recursos y operación / Vehículos</header>
      <section className="inventory-section" aria-labelledby="vehicles-heading"><div className="page-heading"><div><h1 id="vehicles-heading">Vehículos</h1><p>Registra y consulta la flota de la empresa.</p></div><VehicleForm onSaved={vehicle => { setNotice(`Vehículo «${vehicle.name}» registrado correctamente.`); setPage(1); setRevision(previous => previous + 1); }} /></div>
        {notice && <p role="status" className="success-message">{notice}</p>}
        <section className="equipment-ledger" aria-labelledby="vehicles-list-heading" aria-busy={state.loading}><div className="ledger-header"><div><h2 id="vehicles-list-heading">Vehículos registrados</h2><p role="status">{state.loading ? "Consultando vehículos…" : state.error ? "No se pudo consultar el listado" : `${state.total} ${state.total === 1 ? "vehículo encontrado" : "vehículos encontrados"}`}</p></div><Button variant="outline" disabled={state.loading} onClick={() => setRevision(previous => previous + 1)}>Actualizar</Button></div>
          <form className="equipment-filters" onSubmit={event => { event.preventDefault(); setFilters({ q: value.trim(), type }); setPage(1); setNotice(""); }}>
            <div className="field"><Label htmlFor="vehicles-search">Nombre o patente</Label><Input id="vehicles-search" type="search" maxLength={120} value={value} onChange={event => setValue(event.target.value)} /></div>
            <div className="field"><Label htmlFor="vehicles-type">Tipo de vehículo</Label>
              <select id="vehicles-type" className="equipment-category-filter" value={type} disabled={catalog.loading || Boolean(catalog.error)} onChange={event => setType(event.target.value)}>
                <option value="">Todos los tipos</option>
                {type && !catalog.items.includes(type) && <option value={type}>{type}</option>}
                {catalog.items.map(item => <option value={item} key={item}>{item}</option>)}
              </select>
            </div>
            <div className="equipment-filter-actions"><Button type="submit" disabled={state.loading}>Buscar</Button><Button type="button" variant="outline" disabled={state.loading || (!value && !type && !filters.q && !filters.type)} onClick={() => { setValue(""); setType(""); setFilters({ q: "", type: "" }); setPage(1); setNotice(""); }}>Limpiar</Button></div>
            {catalog.error && <p className="field-error" role="alert">No se pudieron cargar los tipos. Usa Actualizar para reintentar.</p>}
          </form>
          {state.loading ? <p className="list-state" role="status">Cargando vehículos…</p> : state.error ? <div className="list-state"><p className="error-message" role="alert">{state.error}</p><Button onClick={() => setRevision(previous => previous + 1)}>Reintentar</Button></div> : !state.items.length ? <p className="list-state">{filters.q || filters.type ? "No se encontraron vehículos con esos filtros." : "Aún no hay vehículos registrados."}</p> :
            <Table>
              <TableHeader><TableRow><TableHead>Vehículo</TableHead><TableHead>Tipo</TableHead><TableHead>Patente</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
              <TableBody>{state.items.map(vehicle =>
                <TableRow key={vehicle.id}>
                  <TableCell>{vehicle.name}</TableCell><TableCell>{vehicle.type}</TableCell><TableCell>{vehicle.plate}</TableCell>
                  <TableCell><VehicleForm vehicle={vehicle} onSaved={saved => {
                    setNotice(`Ficha de «${saved.name}» actualizada correctamente.`);
                    setRevision(previous => previous + 1);
                  }} /></TableCell>
                </TableRow>
              )}</TableBody>
            </Table>}
          {!state.error && <ListPagination page={page} pages={state.pages} disabled={state.loading} label="Páginas de vehículos" onChange={next => { setPage(next); setNotice(""); }} />}
          <div className="ledger-foot">Este listado no indica disponibilidad por fecha.</div>
        </section>
      </section><footer className="page-footer"><span>BAMBALIX</span></footer>
    </main>
  </div>;
}
