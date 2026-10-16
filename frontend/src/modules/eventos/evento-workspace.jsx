"use client";

import { useState } from "react";
import { Calendar, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventoForm } from "./evento-form";
import { EventoList } from "./evento-list";
import { EventoAgenda } from "./evento-agenda";

export function EventoWorkspace() {
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [activeView, setActiveView] = useState("agenda"); // "agenda" | "lista"

  return (
    <section className="inventory-section" aria-labelledby="events-heading">
      <p className="eyebrow">EVENTOS Y AGENDA</p>
      <div className="page-heading">
        <div>
          <h1 id="events-heading">
            {activeView === "agenda" ? "Agenda de eventos." : "Registro y listado de eventos."}
          </h1>
          <p>
            {activeView === "agenda"
              ? "Consulta los eventos que intersectan con cualquier periodo seleccionado."
              : "Asocia eventos a clientes y define su horario y cantidad de asistentes."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EventoForm
            onSaved={(evento) => {
              setNotice(`Evento «${evento.title}» registrado correctamente.`);
              setRevision((prev) => prev + 1);
            }}
          />
        </div>
      </div>

      {notice ? <p className="success-message" role="status">{notice}</p> : null}

      {/* Selector de vista: Agenda vs Lista */}
      <div className="flex items-center gap-2 border-b pb-2 mb-4">
        <Button
          type="button"
          variant={activeView === "agenda" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("agenda")}
        >
          <Calendar className="h-4 w-4 mr-1.5" />
          Agenda por periodo
        </Button>
        <Button
          type="button"
          variant={activeView === "lista" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("lista")}
        >
          <List className="h-4 w-4 mr-1.5" />
          Todos los eventos
        </Button>
      </div>

      {activeView === "agenda" ? (
        <EventoAgenda
          revision={revision}
          onEventoUpdated={(evento) => {
            setNotice(`Evento «${evento.title}» actualizado correctamente.`);
            setRevision((prev) => prev + 1);
          }}
        />
      ) : (
        <EventoList
          revision={revision}
          onEventoUpdated={(evento) => {
            setNotice(`Evento «${evento.title}» actualizado correctamente.`);
            setRevision((prev) => prev + 1);
          }}
        />
      )}
    </section>
  );
}

