"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { equipmentStatusSchema } from "@/schemas/equipos.schema";
import { getEquipmentStatusHistoryPage, updateEquipmentStatus } from "@/services/equipos";
import { ListPagination } from "@/components/list-pagination";

export const equipmentStatusLabels = {
  UNREVIEWED: "Sin revisar",
  OPERATIONAL: "Operativo",
  MAINTENANCE: "En mantención",
  DAMAGED: "Dañado",
};

function EquipmentStatusPanel({ equipment, onSaved, onClose, busy }) {
  const [history, setHistory] = useState({ loading: true, items: [], total: 0, pages: 1, error: "" });
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(equipmentStatusSchema),
    defaultValues: { status: equipment.status === "UNREVIEWED" ? "" : equipment.status, reason: "", revision: equipment.revision },
    mode: "onTouched",
  });
  const selectedStatus = watch("status");

  useEffect(() => {
    const controller = new AbortController();
    setHistory(previous => ({ ...previous, loading: true, error: "" }));
    getEquipmentStatusHistoryPage(equipment.id, { page }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(result => {
        if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.pages) || result.pages < 1 || !Number.isInteger(result.page) || result.page < 1 || result.page > result.pages)
          throw new Error("No se pudo consultar el historial");
        if (!controller.signal.aborted) {
          setHistory({ loading: false, items: result.items, total: result.total, pages: result.pages, error: "" });
          if (result.page !== page) setPage(result.page);
        }
      }).catch(failure => {
        if (!controller.signal.aborted) setHistory({ loading: false, items: [], total: 0, pages: 1, error: failure.message });
      });
    return () => controller.abort();
  }, [equipment.id, attempt, page]);

  async function submit(data) {
    if (busy.current) return;
    busy.current = true;
    setError("");
    try {
      const updated = await updateEquipmentStatus(equipment.id, data);
      onSaved(updated);
      onClose();
    } catch (failure) {
      for (const field of ["status", "reason"]) {
        if (failure.fields?.[field]) setFieldError(field, { type: "server", message: failure.fields[field] }, { shouldFocus: true });
      }
      setError(failure.message);
    } finally {
      busy.current = false;
    }
  }

  return <>
    <form noValidate className="equipment-form" onSubmit={handleSubmit(submit)}>
      <p className="form-note">Estado actual: {equipmentStatusLabels[equipment.status] || "Sin revisar"}. No indica disponibilidad para una fecha.</p>
      <div className="field">
        <Label htmlFor="equipment-new-status">Estado *</Label>
        <select id="equipment-new-status" className="equipment-category-filter" {...register("status")} disabled={isSubmitting} required aria-invalid={Boolean(errors.status)} aria-describedby={errors.status ? "equipment-status-error" : undefined}>
          <option value="">Selecciona un estado</option>
          {["OPERATIONAL", "MAINTENANCE", "DAMAGED"].map(status => <option key={status} value={status}>{equipmentStatusLabels[status]}</option>)}
        </select>
        {errors.status && <p id="equipment-status-error" className="field-error">{errors.status.message}</p>}
      </div>
      <div className="field">
        <Label htmlFor="equipment-status-reason">Motivo del cambio *</Label>
        <textarea id="equipment-status-reason" className="equipment-status-reason" {...register("reason")} rows={3} maxLength={500} disabled={isSubmitting} required aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? "equipment-reason-error" : undefined} />
        {errors.reason && <p id="equipment-reason-error" className="field-error">{errors.reason.message}</p>}
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="form-actions">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || selectedStatus === equipment.status}>{isSubmitting ? "Guardando…" : "Guardar estado"}</Button>
      </div>
    </form>
    <section className="equipment-status-history" aria-labelledby="equipment-history-heading" aria-busy={history.loading}>
      <h3 id="equipment-history-heading">Historial de estados</h3>
      {!history.loading && !history.error && <p role="status">{history.total} {history.total === 1 ? "cambio registrado" : "cambios registrados"}</p>}
      {history.loading ? <p role="status">Consultando historial…</p> : history.error ? <><p role="alert" className="error-message">{history.error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Reintentar historial</Button></> : history.items.length === 0 ? <p>Aún no hay cambios de estado.</p> : <ol>{history.items.map(change => <li key={change.id}>
        <p>{equipmentStatusLabels[change.previousStatus]} → {equipmentStatusLabels[change.status]}</p>
        <p>{change.reason}</p>
        <time dateTime={change.createdAt}>{new Date(change.createdAt).toLocaleString("es-CL")}</time>
      </li>)}</ol>}
      {!history.error && <ListPagination page={page} pages={history.pages} disabled={history.loading || isSubmitting} label="Páginas del historial de estados" onChange={setPage} />}
    </section>
  </>;
}

export function EquipmentStatusDialog({ equipment, onSaved }) {
  const [open, setOpen] = useState(false);
  const busy = useRef(false);
  function changeOpen(value) {
    if (!busy.current) setOpen(value);
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button variant="outline" aria-label={`Estado e historial de ${equipment.name}`}>Estado e historial</Button></DialogTrigger>
    <DialogContent className="equipment-dialog" showCloseButton={false} onEscapeKeyDown={event => { if (busy.current) event.preventDefault(); }} onPointerDownOutside={event => { if (busy.current) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Estado del equipo</DialogTitle><DialogDescription>{equipment.name} · {equipment.code || "Sin código"}</DialogDescription></DialogHeader>
      {open && <EquipmentStatusPanel equipment={equipment} onSaved={onSaved} onClose={() => setOpen(false)} busy={busy} />}
    </DialogContent>
  </Dialog>;
}
