"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getClientes, getTiposEvento, createEvento } from "@/services/eventos";

export function EventoForm({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [eventTypeId, setEventTypeId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [attendees, setAttendees] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      Promise.all([getClientes(), getTiposEvento()])
        .then(([cList, tList]) => {
          setClientes(cList);
          setTipos(tList);
        })
        .catch(() => setError("Error al cargar clientes o tipos de evento."));
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title || !clientId || !eventTypeId || !startsAt || !endsAt || !attendees) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (end <= start) {
      setError("La fecha de término debe ser posterior al inicio.");
      return;
    }

    setLoading(true);
    try {
      const evento = await createEvento({
        title: title.trim(),
        clientId: parseInt(clientId, 10),
        eventTypeId: parseInt(eventTypeId, 10),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        attendees: parseInt(attendees, 10),
      });

      setTitle("");
      setClientId("");
      setEventTypeId("");
      setStartsAt("");
      setEndsAt("");
      setAttendees("");
      setOpen(false);
      onSaved?.(evento);
    } catch (err) {
      setError(err.message || "Error al registrar el evento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-medium">
          <Plus className="mr-1 h-4 w-4" /> Registrar evento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar nuevo evento</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Título del evento</Label>
            <Input
              id="title"
              placeholder="Ej: Cumpleaños de María"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={3}
              maxLength={160}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="client">Cliente</Label>
              <select
                id="client"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="eventType">Tipo de evento</Label>
              <select
                id="eventType"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={eventTypeId}
                onChange={(e) => setEventTypeId(e.target.value)}
                required
              >
                <option value="">Seleccionar...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="startsAt">Fecha/Hora inicio</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="endsAt">Fecha/Hora término</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="attendees">Cantidad de asistentes</Label>
            <Input
              id="attendees"
              type="number"
              min={1}
              max={100000}
              placeholder="Ej: 50"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
