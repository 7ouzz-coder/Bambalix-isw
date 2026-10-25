"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ListPagination } from "@/components/list-pagination";
import { maintenanceFormSchema } from "@/schemas/mantenciones.schema";
import { createEquipmentMaintenance, getEquipmentMaintenances } from "@/services/equipos";
import { MaintenanceFollowUp } from "./maintenance-follow-up";

const blank = { startsAt: "", endsAt: "", reason: "" };

function MaintenancePanel({ equipment, busy, onClose }) {
  const id = useId();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState({ loading: true, items: [], total: 0, pages: 1, error: "" });
  const { register, handleSubmit, reset, setError: setFieldError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(maintenanceFormSchema), defaultValues: blank, mode: "onTouched",
  });

  useEffect(() => {
    const controller = new AbortController();
    setHistory(previous => ({ ...previous, loading: true, error: "" }));
    getEquipmentMaintenances(equipment.id, { page }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(result => {
        if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.pages) || result.pages < 1 || !Number.isInteger(result.page) || result.page < 1 || result.page > result.pages)
          throw new Error("No se pudieron consultar las mantenciones");
        if (!controller.signal.aborted) {
          setHistory({ loading: false, items: result.items, total: result.total, pages: result.pages, error: "" });
          if (result.page !== page) setPage(result.page);
        }
      }).catch(failure => {
        if (!controller.signal.aborted) setHistory({ loading: false, items: [], total: 0, pages: 1, error: failure.message });
      });
    return () => controller.abort();
  }, [equipment.id, page, attempt]);

  async function submit(data) {
    if (busy.current) return;
    busy.current = true;
    setError(""); setNotice("");
    try {
      await createEquipmentMaintenance(equipment.id, {
        startsAt: new Date(data.startsAt).toISOString(), endsAt: new Date(data.endsAt).toISOString(), reason: data.reason,
      });
      reset(blank);
      setPage(1); setAttempt(value => value + 1);
      setNotice("Periodo de mantención registrado.");
    } catch (failure) {
      for (const field of ["startsAt", "endsAt", "reason"]) {
        if (failure.fields?.[field]) setFieldError(field, { type: "server", message: failure.fields[field] }, { shouldFocus: true });
      }
      setError(failure.message);
    } finally { busy.current = false; }
  }

  if (selectedId) return <MaintenanceFollowUp key={selectedId} equipmentId={equipment.id} maintenanceId={selectedId} busy={busy}
    onBack={() => setSelectedId(null)} onChanged={() => setAttempt(value => value + 1)} />;

  return <>
    <form noValidate className="equipment-form" onSubmit={handleSubmit(submit)}>
      <p className="form-note">Las fechas se muestran en la hora local de tu dispositivo. Registrar un periodo no cambia por sí solo el estado operativo del equipo.</p>
      {[{ key: "startsAt", label: "Inicio" }, { key: "endsAt", label: "Término" }].map(field => <div className="field" key={field.key}>
        <Label htmlFor={`${id}-${field.key}`}>{field.label} *</Label>
        <Input id={`${id}-${field.key}`} type="datetime-local" {...register(field.key)} disabled={isSubmitting} required aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `${id}-${field.key}-error` : undefined} />
        {errors[field.key] && <p id={`${id}-${field.key}-error`} className="field-error">{errors[field.key].message}</p>}
      </div>)}
      <div className="field">
        <Label htmlFor={`${id}-reason`}>Motivo *</Label>
        <textarea id={`${id}-reason`} className="equipment-status-reason" rows={3} maxLength={500} {...register("reason")} disabled={isSubmitting} required aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? `${id}-reason-error` : undefined} />
        {errors.reason && <p id={`${id}-reason-error`} className="field-error">{errors.reason.message}</p>}
      </div>
      {error && <p role="alert" className="error-message">{error}</p>}
      {notice && <p role="status" className="equipment-status-notice">{notice}</p>}
      <div className="form-actions flex-wrap"><Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Cerrar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Registrar mantención"}</Button></div>
    </form>
    <section className="equipment-status-history" aria-labelledby={`${id}-history`} aria-busy={history.loading}>
      <h3 id={`${id}-history`}>Periodos de mantención</h3>
      {history.loading ? <p role="status">Consultando mantenciones…</p> : history.error ? <><p role="alert" className="error-message">{history.error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Reintentar</Button></> : <>
        <p role="status">{history.total} {history.total === 1 ? "periodo registrado" : "periodos registrados"}</p>
        {history.items.length === 0 ? <p>No hay mantenciones registradas.</p> : <ol>{history.items.map(item => <li key={item.id}>
          <p>Inicio: <time dateTime={item.startsAt}>{new Date(item.startsAt).toLocaleString("es-CL")}</time></p>
          <p>Término: <time dateTime={item.endsAt}>{new Date(item.endsAt).toLocaleString("es-CL")}</time></p>
          <p>{item.reason}</p>
          <p>Estado: {item.closedAt ? "Cerrada" : "Abierta"}</p>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => { setNotice(""); setSelectedId(item.id); }}>Ver seguimiento</Button>
        </li>)}</ol>}
      </>}
      {!history.error && <ListPagination page={page} pages={history.pages} disabled={history.loading || isSubmitting} label="Páginas de mantenciones" onChange={setPage} />}
    </section>
  </>;
}

export function EquipmentMaintenanceDialog({ equipment }) {
  const [open, setOpen] = useState(false);
  const busy = useRef(false);
  return <Dialog open={open} onOpenChange={value => { if (!busy.current) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline" aria-label={`Mantenciones de ${equipment.name}`}>Mantenciones</Button></DialogTrigger>
    <DialogContent className="equipment-dialog" showCloseButton={false} onEscapeKeyDown={event => { if (busy.current) event.preventDefault(); }} onPointerDownOutside={event => { if (busy.current) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Mantenciones del equipo</DialogTitle><DialogDescription>{equipment.name} · {equipment.code || "Sin código"}</DialogDescription></DialogHeader>
      {open && <MaintenancePanel equipment={equipment} busy={busy} onClose={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}
