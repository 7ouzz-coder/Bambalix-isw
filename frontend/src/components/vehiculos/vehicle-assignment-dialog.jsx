"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AssignmentEventPicker } from "@/components/equipos/assignment-event-picker";
import { listVehicleAssignments, createVehicleAssignment } from "@/services/vehiculos";
import { assignmentFormSchema } from "@/schemas/asignaciones.schema";

export function VehicleAssignmentDialog({ vehicle, onChanged }) {
  const [open, setOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [items, setItems] = useState([]);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setItems(await listVehicleAssignments(vehicle.id));
  }
  function changeOpen(value) {
    setOpen(value);
    setError("");
    if (value) load().catch(failure => setError(failure.message));
  }
  async function submit(event) {
    event.preventDefault();
    const validation = assignmentFormSchema.safeParse({ eventId: selectedEvent?.id, startsAt: start, endsAt: end });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Selecciona un evento y un período válido."); return;
    }
    setBusy(true); setError("");
    try {
      await createVehicleAssignment(vehicle.id, { eventId: selectedEvent.id, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() });
      setSelectedEvent(null); setStart(""); setEnd("");
      await load();
      onChanged?.();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button variant="outline">Asignaciones</Button></DialogTrigger>
    <DialogContent className="equipment-dialog">
      <DialogHeader><DialogTitle>Asignaciones de {vehicle.name}</DialogTitle><DialogDescription>El período debe cubrir el evento y los tiempos de traslado y montaje necesarios.</DialogDescription></DialogHeader>
      <form className="equipment-form" onSubmit={submit}>
        <AssignmentEventPicker selected={selectedEvent} onSelect={setSelectedEvent} disabled={busy} />
        <div className="field"><Label htmlFor="vehicle-assignment-start">Inicio de ocupación</Label><Input id="vehicle-assignment-start" type="datetime-local" required value={start} onChange={e => setStart(e.target.value)} /></div>
        <div className="field"><Label htmlFor="vehicle-assignment-end">Término de ocupación</Label><Input id="vehicle-assignment-end" type="datetime-local" required value={end} onChange={e => setEnd(e.target.value)} /></div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Asignar vehículo"}</Button>
      </form>
      <h3>Asignaciones registradas</h3>
      {items.length === 0 ? <p>Sin asignaciones registradas.</p> : <ul>{items.map(item => <li key={item.id}>{item.event.title} · {new Date(item.startsAt).toLocaleString("es-CL")} - {new Date(item.endsAt).toLocaleString("es-CL")}</li>)}</ul>}
    </DialogContent>
  </Dialog>;
}
