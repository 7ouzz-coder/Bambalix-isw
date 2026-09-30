"use client";

import { useState } from "react";
import { ArrowUpRight, Layers3, Users, Boxes } from "lucide-react";
import { ClientForm } from "./client-form";
import { ClientList } from "./client-list";

export function ClientWorkspace() {
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  return <div className="workspace">
    <aside className="sidebar"><a href="/" className="brand" aria-label="Bambalix, inicio"><Layers3 aria-hidden="true" />Bambalix<span>®</span></a>
      <p className="nav-label">ESPACIO DE TRABAJO</p>
      <nav aria-label="Principal">
        <a href="/" className="nav-item"><Boxes aria-hidden="true" />Equipos<ArrowUpRight aria-hidden="true" /></a>
        <a href="/clientes" aria-current="page" className="nav-item"><Users aria-hidden="true" />Clientes<ArrowUpRight aria-hidden="true" /></a>
      </nav>
      <div className="sidebar-foot"><span className="small-line" /><p>Detrás de cada evento,<br />todo en su lugar.</p><small>Recursos y operación</small></div>
    </aside>
    <main className="main-content"><header className="topbar"><span>Recursos y operación <span className="crumb">/ Clientes</span></span><span className="demo-label">Avance inicial · Local</span></header>
      <section className="inventory-section" aria-labelledby="clients-heading">
        <p className="eyebrow">CONTACTOS / CLIENTES</p>
        <div className="page-heading"><div><h1 id="clients-heading">Relaciones que<br className="desktop-break" /> empiezan aquí.</h1><p>Registra y consulta los datos de tus clientes.</p></div>
          <ClientForm onSaved={client => { setNotice(`Cliente «${client.name}» registrado correctamente.`); setRevision(previous => previous + 1); }} /></div>
        {notice ? <p className="success-message" role="status">{notice}</p> : null}
        <ClientList revision={revision} />
      </section>
      <footer className="page-footer"><span>BAMBALIX</span><span>Registro de clientes</span></footer>
    </main>
  </div>;
}