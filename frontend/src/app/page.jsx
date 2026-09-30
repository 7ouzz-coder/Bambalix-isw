"use client";

import { useState } from "react";
import { Boxes, Calendar, Layers3, ArrowUpRight } from "lucide-react";
import { EquipmentForm } from "@/modules/equipos/equipment-form";
import { EquipmentList } from "@/modules/equipos/equipment-list";
import { EventoWorkspace } from "@/modules/eventos/evento-workspace";

export default function Home() {
  const [activeTab, setActiveTab] = useState("equipos");
  const [equiposNotice, setEquiposNotice] = useState("");
  const [equiposRevision, setEquiposRevision] = useState(0);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="Bambalix, inicio">
          <Layers3 aria-hidden="true" />
          Bambalix<span>®</span>
        </a>
        <p className="nav-label">ESPACIO DE TRABAJO</p>
        <nav aria-label="Principal">
          <button
            type="button"
            onClick={() => setActiveTab("equipos")}
            className={`nav-item ${activeTab === "equipos" ? "active font-bold" : ""}`}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
          >
            <Boxes aria-hidden="true" />
            Equipos (Guillermo)
            <ArrowUpRight aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("eventos")}
            className={`nav-item ${activeTab === "eventos" ? "active font-bold" : ""}`}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", marginTop: "0.5rem" }}
          >
            <Calendar aria-hidden="true" />
            Eventos (Ángel)
            <ArrowUpRight aria-hidden="true" />
          </button>
        </nav>
        <div className="sidebar-foot">
          <span className="small-line" />
          <p>
            Detrás de cada evento,
            <br />
            todo en su lugar.
          </p>
          <small>Bambalix — Avance Inicial</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>
            {activeTab === "equipos" ? "Recursos y operación / Equipos" : "Eventos y agenda / Registrar eventos"}
          </span>
          <span className="demo-label">Avance inicial · Local</span>
        </header>

        {activeTab === "equipos" ? (
          <section className="inventory-section" aria-labelledby="equipment-heading">
            <p className="eyebrow">INVENTARIO / EQUIPOS INDIVIDUALES</p>
            <div className="page-heading">
              <div>
                <h1 id="equipment-heading">
                  Todo empieza
                  <br className="desktop-break" /> por el equipo.
                </h1>
                <p>Registra y consulta tus equipos en un solo lugar.</p>
              </div>
              <EquipmentForm
                onSaved={(equipment) => {
                  setEquiposNotice(`Equipo «${equipment.name}» registrado correctamente.`);
                  setEquiposRevision((prev) => prev + 1);
                }}
              />
            </div>
            {equiposNotice ? <p className="success-message" role="status">{equiposNotice}</p> : null}
            <EquipmentList revision={equiposRevision} />
          </section>
        ) : (
          <EventoWorkspace />
        )}

        <footer className="page-footer">
          <span>BAMBALIX</span>
          <span>Avance inicial de desarrollo</span>
        </footer>
      </main>
    </div>
  );
}
