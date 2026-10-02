"use client";

import { useState } from "react";
import { ClientForm } from "./client-form";
import { ClientList } from "./client-list";

export function ClientWorkspace() {
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  return (
      <section className="inventory-section" aria-labelledby="clients-heading">
        <p className="eyebrow">CONTACTOS / CLIENTES</p>
        <div className="page-heading"><div><h1 id="clients-heading">Relaciones que<br className="desktop-break" /> empiezan aquí.</h1><p>Registra y consulta los datos de tus clientes.</p></div>
          <ClientForm onSaved={client => { setNotice(`Cliente «${client.name}» registrado correctamente.`); setRevision(previous => previous + 1); }} /></div>
        {notice ? <p className="success-message" role="status">{notice}</p> : null}
        <ClientList revision={revision} />
      </section>
  );
}
