"use client";

import { useState } from "react";
import { Boxes, Layers3, ArrowUpRight } from "lucide-react";
import { EquipmentForm } from "./equipment-form";
import { EquipmentList } from "./equipment-list";

export function EquipmentWorkspace() {
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  return <div className="workspace">
    <aside className="sidebar"><a href="/" className="brand" aria-label="Bambalix, inicio"><Layers3 aria-hidden="true" />Bambalix<span>®</span></a>
      <p className="nav-label">ESPACIO DE TRABAJO</p>
      <nav aria-label="Principal"><a href="/" aria-current="page" className="nav-item"><Boxes aria-hidden="true" />Equipos<ArrowUpRight aria-hidden="true" /></a></nav>
      <div className="sidebar-foot"><span className="small-line" /><p>Detrás de cada evento,<br />todo en su lugar.</p><small>Recursos y operación</small></div>
    </aside>
    <main className="main-content"><header className="topbar"><span>Recursos y operación <span className="crumb">/ Equipos</span></span><span className="demo-label">Avance inicial · Local</span></header>
      <section className="inventory-section" aria-labelledby="equipment-heading">
        <p className="eyebrow">INVENTARIO / EQUIPOS INDIVIDUALES</p>
        <div className="page-heading"><div><h1 id="equipment-heading">Todo empieza<br className="desktop-break" /> por el equipo.</h1><p>Registra y consulta tus equipos en un solo lugar.</p></div><EquipmentForm onSaved={equipment => { setNotice(`Equipo «${equipment.name}» registrado correctamente.`); setRevision(previous => previous + 1); }} /></div>
        {notice ? <p className="success-message" role="status">{notice}</p> : null}
        <EquipmentList revision={revision} />
      </section>
      <footer className="page-footer"><span>BAMBALIX</span><span>Registro individual de equipos</span></footer>
    </main>
  </div>;
}
