"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getClientes, getTiposEvento, updateEvento } from "@/services/eventos";

function toDatetimeLocal(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EventoEditDialog({ evento, open, onOpenChange, onSaved }) {
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
  const [location, setLocation] = useState("");
  const [needs, setNeeds] = useState("");

  useEffect(() => {
    if (evento && open) {
      setError("");
      setTitle(evento.title || "");
      setClientId(evento.clientId || evento.client?.id || "");
      setEventTypeId(String(evento.eventTypeId || evento.eventType?.id || ""));
      setStartsAt(toDatetimeLocal(evento.startsAt));
      setEndsAt(toDatetimeLocal(evento.endsAt));
      setAttendees(evento.attendees !== undefined ? String(evento.attendees) : "");
      setLocation(evento.location || "");
      setNeeds(evento.needs || "");

      Promise.all([getClientes(), getTiposEvento()])
        .then(([cList, tList]) => {
          setClientes(cList);
          setTipos(tList);
        })
        .catch(() => setError("Error al cargar clientes o tipos de evento."));
    }
  }, [evento, open]);

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
      const updated = await updateEvento(evento.id, {
        title: title.trim(),
        clientId: String(clientId).trim(),
        eventTypeId: parseInt(eventTypeId, 10),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        attendees: parseInt(attendees, 10),
        location: location.trim() || null,
        needs: needs.trim() || null,
      });

      onOpenChange(false);
      onSaved?.(updated);
    } catch (err) {
      setError(err.message || "Error al actualizar el evento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-title">Título del evento</Label>
            <Input
              id="edit-title"
              placeholder="Ej: Gala Anual 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={3}
              maxLength={160}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-client">Cliente</Label>
              <select
                id="edit-client"
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
              <Label htmlFor="edit-eventType">Tipo de evento</Label>
              <select
                id="edit-eventType"
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
              <Label htmlFor="edit-startsAt">Fecha/Hora inicio</Label>
              <Input
                id="edit-startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-endsAt">Fecha/Hora término</Label>
              <Input
                id="edit-endsAt"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-attendees">Cantidad de asistentes</Label>
            <Input
              id="edit-attendees"
              type="number"
              min={1}
              max={100000}
              placeholder="Ej: 150"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-location">Lugar / Espacio (opcional)</Label>
            <Input
              id="edit-location"
              placeholder="Ej: Salón Principal"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-needs">Necesidades o notas (opcional)</Label>
            <Input
              id="edit-needs"
              placeholder="Ej: Iluminación cálida y microfonía"
              value={needs}
              onChange={(e) => setNeeds(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
