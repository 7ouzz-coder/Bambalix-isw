"use client";

import { useState } from "react";
import { Layers3 } from "lucide-react";
import { QuoteForm } from "./quote-form";
import { QuoteList } from "./quote-list";
import { WorkspaceNavigation } from "@/components/workspace-navigation";

export function QuoteWorkspace() {
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="Bambalix, inicio">
          <Layers3 aria-hidden="true" />
          Bambalix<span>®</span>
        </a>
        <p className="nav-label">ESPACIO DE TRABAJO</p>
        <WorkspaceNavigation activeModule="cotizaciones" />
        <div className="sidebar-foot">
          <span className="small-line" />
          <p>
            Detrás de cada evento,
            <br />
            todo en su lugar.
          </p>
          <small>Comercial y cotizaciones</small>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <span>
            Comercial <span className="crumb">/ Cotizaciones</span>
          </span>
        </header>
        <section className="inventory-section" aria-labelledby="quotes-heading">
          <p className="eyebrow">PROPUESTAS / COTIZACIONES</p>
          <div className="page-heading">
            <div>
              <h1 id="quotes-heading">
                Propuestas claras,
                <br className="desktop-break" /> acuerdos firmes.
              </h1>
              <p>Elabora cotizaciones vinculadas a clientes y eventos, con revisión y aprobación gerencial.</p>
            </div>
            <QuoteForm
              onSaved={(quote) => {
                setNotice(`Cotización «${quote.code || quote.id}» creada en estado Borrador.`);
                setRevision((prev) => prev + 1);
              }}
            />
          </div>
          {notice ? (
            <p className="success-message" role="status">
              {notice}
            </p>
          ) : null}
          <QuoteList
            revision={revision}
            onStatusChanged={(msg) => {
              setNotice(msg);
              setRevision((prev) => prev + 1);
            }}
          />
        </section>
        <footer className="page-footer">
          <span>BAMBALIX</span>
          <span>Gestión de cotizaciones</span>
        </footer>
      </main>
    </div>
  );
}
