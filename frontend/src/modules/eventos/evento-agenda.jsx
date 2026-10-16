"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, MapPin, Users, RefreshCw, Pencil, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEventos } from "@/services/eventos";
import { EventoEditDialog } from "./evento-edit-dialog";

function toDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 23, 59, 59);
  return {
    from: toDatetimeLocal(start),
    to: toDatetimeLocal(end),
  };
}

export function EventoAgenda({ revision, onEventoUpdated }) {
  const defaultDates = getDefaultPeriod();
  const [from, setFrom] = useState(defaultDates.from);
  const [to, setTo] = useState(defaultDates.to);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingEvento, setEditingEvento] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchAgenda = useCallback(async (fromDate, toDate) => {
    if (!fromDate || !toDate) {
      setError("Selecciona tanto la fecha de inicio como la de término.");
      return;
    }
    const f = new Date(fromDate);
    const t = new Date(toDate);
    if (t <= f) {
      setError("La fecha de término debe ser posterior a la de inicio.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getEventos({
        from: f.toISOString(),
        to: t.toISOString(),
      });
      setEventos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error al consultar la agenda");
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgenda(from, to);
  }, [fetchAgenda, revision]);

  function handleSearch(e) {
    e.preventDefault();
    fetchAgenda(from, to);
  }

  function handlePreset(days) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 23, 59, 59);
    const fStr = toDatetimeLocal(start);
    const tStr = toDatetimeLocal(end);
    setFrom(fStr);
    setTo(tStr);
    fetchAgenda(fStr, tStr);
  }

  function formatTimeRange(startsAt, endsAt) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const startTime = start.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    const endTime = end.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

    // Si cruza medianoche a otro día
    if (start.toDateString() !== end.toDateString()) {
      const endDate = end.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
      return `${startTime} — ${endTime} (+1 día, ${endDate})`;
    }
    return `${startTime} — ${endTime}`;
  }

  function formatDayHeader(dateStr) {
    const d = new Date(dateStr);
    const formatted = d.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // Agrupar eventos por día de inicio
  const grouped = eventos.reduce((acc, ev) => {
    const dayKey = new Date(ev.startsAt).toDateString();
    if (!acc[dayKey]) acc[dayKey] = { dayDate: ev.startsAt, items: [] };
    acc[dayKey].items.push(ev);
    return acc;
  }, {});

  const dayGroups = Object.values(grouped);

  return (
    <div className="space-y-6 mt-4">
      {/* Selector de periodo */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Periodo de consulta
            </span>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground mr-1">Rápido:</span>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handlePreset(1)}>
                Hoy
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handlePreset(7)}>
                7 días
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handlePreset(30)}>
                30 días
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="agenda-from" className="text-xs">Desde (inicio del periodo)</Label>
              <Input
                id="agenda-from"
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="agenda-to" className="text-xs">Hasta (fin del periodo)</Label>
              <Input
                id="agenda-to"
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>
            <div>
              <Button type="submit" disabled={loading} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Consultando…" : "Consultar agenda"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados agrupados por día */}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Consultando eventos del periodo en el servidor…</p>
      ) : dayGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-foreground">No hay eventos en este periodo</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ningún evento registrado intersecta con el rango seleccionado. Modifica las fechas para ampliar la búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">
            Se encontraron {eventos.length} {eventos.length === 1 ? "evento" : "eventos"} en el periodo seleccionado.
          </p>
          {dayGroups.map((group) => (
            <div key={group.dayDate} className="space-y-2">
              <div className="sticky top-0 bg-background/90 backdrop-blur-sm py-1.5 border-b font-medium text-sm text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3>{formatDayHeader(group.dayDate)}</h3>
                <span className="text-xs text-muted-foreground font-normal">
                  ({group.items.length} {group.items.length === 1 ? "evento" : "eventos"})
                </span>
              </div>

              <div className="grid gap-2">
                {group.items.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{ev.title}</span>
                        {ev.eventType && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                            {ev.eventType.name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground/80">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {formatTimeRange(ev.startsAt, ev.endsAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Cliente: <strong className="text-foreground/90 font-medium">{ev.client?.name || "—"}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          Espacio: <span className="text-foreground/90">{ev.location || "Sin espacio asignado"}</span>
                        </span>
                        <span>{ev.attendees} asistentes</span>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setEditingEvento(ev);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EventoEditDialog
        evento={editingEvento}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={(updated) => {
          setEventos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          onEventoUpdated?.(updated);
        }}
      />
    </div>
  );
}
