"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEventos } from "@/services/eventos";
import { EventoEditDialog } from "./evento-edit-dialog";

export function EventoList({ revision, onEventoUpdated }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingEvento, setEditingEvento] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getEventos()
      .then((data) => {
        setEventos(data);
        setError("");
      })
      .catch(() => setError("Error al cargar la lista de eventos."))
      .finally(() => setLoading(false));
  }, [revision]);

  function formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleEditClick(evento) {
    setEditingEvento(evento);
    setEditOpen(true);
  }

  function handleSaved(updated) {
    setEventos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    onEventoUpdated?.(updated);
  }

  if (loading) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Cargando eventos...</p>;
  }

  if (error) {
    return <p className="py-4 text-center text-sm text-red-500">{error}</p>;
  }

  if (eventos.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No hay eventos registrados.</p>;
  }

  return (
    <>
      <div className="rounded-md border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Término</TableHead>
              <TableHead>Lugar</TableHead>
              <TableHead className="text-right">Asistentes</TableHead>
              <TableHead className="text-center w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventos.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.title}</TableCell>
                <TableCell>{e.client?.name || "-"}</TableCell>
                <TableCell>{e.eventType?.name || "-"}</TableCell>
                <TableCell>{formatDate(e.startsAt)}</TableCell>
                <TableCell>{formatDate(e.endsAt)}</TableCell>
                <TableCell>{e.location || "—"}</TableCell>
                <TableCell className="text-right">{e.attendees}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => handleEditClick(e)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EventoEditDialog
        evento={editingEvento}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
    </>
  );
}

