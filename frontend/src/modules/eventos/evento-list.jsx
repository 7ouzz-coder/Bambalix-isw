"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEventos } from "@/services/eventos";

export function EventoList({ revision }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getEventos()
      .then((data) => {
        setEventos(data);
        setError("");
      })
      .catch((err) => setError("Error al cargar la lista de eventos."))
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
    <div className="rounded-md border mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Inicio</TableHead>
            <TableHead>Término</TableHead>
            <TableHead className="text-right">Asistentes</TableHead>
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
              <TableCell className="text-right">{e.attendees}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
