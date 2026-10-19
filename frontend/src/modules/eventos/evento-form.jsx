"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getClientes, getTiposEvento, createEvento } from "@/services/eventos";
import { eventoFormSchema } from "@/schemas/eventos.schema";

const defaultValues = {
  title: "",
  clientId: "",
  eventTypeId: "",
  startsAt: "",
  endsAt: "",
  attendees: "",
  location: "",
  needs: "",
};

export function EventoForm({ onSaved }) {
  const [open, setOpen] = useState(false);
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
    defaultValues,
  });

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

  async function onSubmit(data) {
    setError("");
    const start = new Date(data.startsAt);
    const end = new Date(data.endsAt);

    setLoading(true);
    try {
      const evento = await createEvento({
        title: data.title.trim(),
        clientId: String(data.clientId).trim(),
        eventTypeId: parseInt(data.eventTypeId, 10),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        attendees: parseInt(data.attendees, 10),
        location: data.location?.trim() || undefined,
        needs: data.needs?.trim() || undefined,
      });

      reset(defaultValues);
      setOpen(false);
      onSaved?.(evento);
    } catch (err) {
      // Conservar los datos ingresados en el formulario y mostrar el mensaje de error
      setError(err.message || "Error al registrar el evento.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset(defaultValues);
      setError("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="font-medium">
          <Plus className="mr-1 h-4 w-4" /> Registrar evento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar nuevo evento</DialogTitle>
        </DialogHeader>
        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="title">Título del evento *</Label>
            <Input
              id="title"
              placeholder="Ej: Cumpleaños de María"
              {...register("title")}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && (
              <p className="text-xs text-red-500" id="title-error">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="client">Cliente *</Label>
              <select
                id="client"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("clientId")}
                aria-invalid={Boolean(errors.clientId)}
                aria-describedby={errors.clientId ? "client-error" : undefined}
              >
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="text-xs text-red-500" id="client-error">
                  {errors.clientId.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="eventType">Tipo de evento *</Label>
              <select
                id="eventType"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("eventTypeId")}
                aria-invalid={Boolean(errors.eventTypeId)}
                aria-describedby={errors.eventTypeId ? "eventType-error" : undefined}
              >
                <option value="">Seleccionar...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.eventTypeId && (
                <p className="text-xs text-red-500" id="eventType-error">
                  {errors.eventTypeId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="startsAt">Fecha/Hora inicio *</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                {...register("startsAt")}
                aria-invalid={Boolean(errors.startsAt)}
                aria-describedby={errors.startsAt ? "startsAt-error" : undefined}
              />
              {errors.startsAt && (
                <p className="text-xs text-red-500" id="startsAt-error">
                  {errors.startsAt.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="endsAt">Fecha/Hora término *</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                {...register("endsAt")}
                aria-invalid={Boolean(errors.endsAt)}
                aria-describedby={errors.endsAt ? "endsAt-error" : undefined}
              />
              {errors.endsAt && (
                <p className="text-xs text-red-500" id="endsAt-error">
                  {errors.endsAt.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="attendees">Cantidad de asistentes *</Label>
            <Input
              id="attendees"
              type="number"
              min={1}
              max={100000}
              placeholder="Ej: 50"
              {...register("attendees")}
              aria-invalid={Boolean(errors.attendees)}
              aria-describedby={errors.attendees ? "attendees-error" : undefined}
            />
            {errors.attendees && (
              <p className="text-xs text-red-500" id="attendees-error">
                {errors.attendees.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="location">Lugar / Espacio (opcional)</Label>
            <Input
              id="location"
              placeholder="Ej: Salón Principal"
              {...register("location")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="needs">Necesidades o notas (opcional)</Label>
            <Input
              id="needs"
              placeholder="Ej: Iluminación cálida y microfonía"
              {...register("needs")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
