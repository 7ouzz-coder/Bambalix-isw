"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getClientes, getTiposEvento, updateEvento } from "@/services/eventos";
import { eventoFormSchema } from "@/schemas/eventos.schema";

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(eventoFormSchema),
  });

  useEffect(() => {
    if (evento && open) {
      setError("");
      reset({
        title: evento.title || "",
        clientId: evento.clientId || evento.client?.id || "",
        eventTypeId: String(evento.eventTypeId || evento.eventType?.id || ""),
        startsAt: toDatetimeLocal(evento.startsAt),
        endsAt: toDatetimeLocal(evento.endsAt),
        attendees: evento.attendees !== undefined ? String(evento.attendees) : "",
        location: evento.location || "",
        needs: evento.needs || "",
      });

      Promise.all([getClientes(), getTiposEvento()])
        .then(([cList, tList]) => {
          setClientes(cList);
          setTipos(tList);
        })
        .catch(() => setError("Error al cargar clientes o tipos de evento."));
    }
  }, [evento, open, reset]);

  async function onSubmit(data) {
    if (!evento?.id) return;
    setError("");
    const start = new Date(data.startsAt);
    const end = new Date(data.endsAt);

    setLoading(true);
    try {
      const updated = await updateEvento(evento.id, {
        title: data.title.trim(),
        clientId: String(data.clientId).trim(),
        eventTypeId: parseInt(data.eventTypeId, 10),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        attendees: parseInt(data.attendees, 10),
        location: data.location?.trim() || null,
        needs: data.needs?.trim() || null,
      });

      onOpenChange(false);
      onSaved?.(updated);
    } catch (err) {
      // Conservar datos y mostrar error (ej: 409 conflicto de espacio)
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
        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="edit-title">Título del evento *</Label>
            <Input
              id="edit-title"
              placeholder="Ej: Gala Anual 2026"
              {...register("title")}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "edit-title-error" : undefined}
            />
            {errors.title && (
              <p className="text-xs text-red-500" id="edit-title-error">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-client">Cliente *</Label>
              <select
                id="edit-client"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("clientId")}
                aria-invalid={Boolean(errors.clientId)}
                aria-describedby={errors.clientId ? "edit-client-error" : undefined}
              >
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="text-xs text-red-500" id="edit-client-error">
                  {errors.clientId.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-eventType">Tipo de evento *</Label>
              <select
                id="edit-eventType"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("eventTypeId")}
                aria-invalid={Boolean(errors.eventTypeId)}
                aria-describedby={errors.eventTypeId ? "edit-eventType-error" : undefined}
              >
                <option value="">Seleccionar...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.eventTypeId && (
                <p className="text-xs text-red-500" id="edit-eventType-error">
                  {errors.eventTypeId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-startsAt">Fecha/Hora inicio *</Label>
              <Input
                id="edit-startsAt"
                type="datetime-local"
                {...register("startsAt")}
                aria-invalid={Boolean(errors.startsAt)}
                aria-describedby={errors.startsAt ? "edit-startsAt-error" : undefined}
              />
              {errors.startsAt && (
                <p className="text-xs text-red-500" id="edit-startsAt-error">
                  {errors.startsAt.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-endsAt">Fecha/Hora término *</Label>
              <Input
                id="edit-endsAt"
                type="datetime-local"
                {...register("endsAt")}
                aria-invalid={Boolean(errors.endsAt)}
                aria-describedby={errors.endsAt ? "edit-endsAt-error" : undefined}
              />
              {errors.endsAt && (
                <p className="text-xs text-red-500" id="edit-endsAt-error">
                  {errors.endsAt.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-attendees">Cantidad de asistentes *</Label>
            <Input
              id="edit-attendees"
              type="number"
              min={1}
              max={100000}
              placeholder="Ej: 50"
              {...register("attendees")}
              aria-invalid={Boolean(errors.attendees)}
              aria-describedby={errors.attendees ? "edit-attendees-error" : undefined}
            />
            {errors.attendees && (
              <p className="text-xs text-red-500" id="edit-attendees-error">
                {errors.attendees.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-location">Lugar / Espacio (opcional)</Label>
            <Input
              id="edit-location"
              placeholder="Ej: Salón Principal"
              {...register("location")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-needs">Necesidades o notas (opcional)</Label>
            <Input
              id="edit-needs"
              placeholder="Ej: Iluminación cálida y microfonía"
              {...register("needs")}
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
