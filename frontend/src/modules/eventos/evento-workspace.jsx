"use client";

import { useState } from "react";
import { EventoForm } from "./evento-form";
import { EventoList } from "./evento-list";

export function EventoWorkspace() {
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  return (
    <section className="inventory-section" aria-labelledby="events-heading">
      <p className="eyebrow">EVENTOS Y AGENDA / REGISTRO DE EVENTOS</p>
      <div className="page-heading">
        <div>
          <h1 id="events-heading">Registro de eventos.</h1>
          <p>Asocia eventos a clientes y define su horario y cantidad de asistentes.</p>
        </div>
        <EventoForm
          onSaved={(evento) => {
            setNotice(`Evento «${evento.title}» registrado correctamente.`);
            setRevision((prev) => prev + 1);
          }}
        />
      </div>
      {notice ? <p className="success-message" role="status">{notice}</p> : null}
      <EventoList revision={revision} />
    </section>
  );
}
