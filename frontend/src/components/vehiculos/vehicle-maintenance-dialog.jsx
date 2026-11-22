"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { listVehicleMaintenances, createVehicleMaintenance } from "@/services/vehiculos";
import { maintenanceFormSchema } from "@/schemas/mantenciones.schema";

export function VehicleMaintenanceDialog({ vehicle, onChanged }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  async function load() {
    try { setItems(await listVehicleMaintenances(vehicle.id)); }
    catch (failure) { setError(failure.message); }
  }
  function changeOpen(value) {
    setOpen(value);
    setError("");
    if (value) load();
  }
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const validation = maintenanceFormSchema.safeParse({ startsAt: fields.get("startsAt"), endsAt: fields.get("endsAt"), reason });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Revisa las fechas y el motivo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { startsAt, endsAt, reason: validatedReason } = validation.data;
      await createVehicleMaintenance(vehicle.id, {
        startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), reason: validatedReason,
      });
      form.reset(); setReason("");
      await load();
      onChanged?.();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button variant="outline">Mantenciones</Button></DialogTrigger>
    <DialogContent className="equipment-dialog">
      <DialogHeader><DialogTitle>Mantenciones de {vehicle.name}</DialogTitle><DialogDescription>Registra el período y motivo de la mantención.</DialogDescription></DialogHeader>
      <form className="equipment-form" onSubmit={submit}>
        <div className="field"><Label htmlFor="vehicle-maintenance-start">Inicio</Label><Input id="vehicle-maintenance-start" type="datetime-local" name="startsAt" required /></div>
        <div className="field"><Label htmlFor="vehicle-maintenance-end">Término</Label><Input id="vehicle-maintenance-end" type="datetime-local" name="endsAt" required /></div>
        <div className="field"><Label htmlFor="vehicle-maintenance-reason">Motivo</Label><Input id="vehicle-maintenance-reason" required minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Registrar mantención"}</Button>
      </form>
      <h3>Historial</h3>
      {items.length === 0 ? <p>Sin mantenciones registradas.</p> : <ul>{items.map(item => <li key={item.id}>{new Date(item.startsAt).toLocaleString("es-CL")} - {new Date(item.endsAt).toLocaleString("es-CL")} · {item.reason}</li>)}</ul>}
    </DialogContent>
  </Dialog>;
}
