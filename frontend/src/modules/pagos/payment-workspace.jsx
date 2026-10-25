"use client";

import { useState } from "react";
import { Layers3 } from "lucide-react";
import { PaymentForm } from "./payment-form";
import { PaymentList } from "./payment-list";
import { WorkspaceNavigation } from "@/components/workspace-navigation";

export function PaymentWorkspace() {
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
        <WorkspaceNavigation activeModule="pagos" />
        <div className="sidebar-foot">
          <span className="small-line" />
          <p>
            Detrás de cada evento,
            <br />
            todo en su lugar.
          </p>
          <small>Finanzas y pagos</small>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <span>
            Finanzas <span className="crumb">/ Pagos</span>
          </span>
        </header>
        <section className="inventory-section" aria-labelledby="payments-heading">
          <p className="eyebrow">TESORERÍA / CONTROL DE PAGOS</p>
          <div className="page-heading">
            <div>
              <h1 id="payments-heading">
                Abonos seguros,
                <br className="desktop-break" /> cuentas claras.
              </h1>
              <p>Registra la recepción de abonos en efectivo o transferencia, y verifica los pagos acreditados.</p>
            </div>
            <PaymentForm
              onSaved={(payment) => {
                setNotice(
                  `Recepción de pago por $${Number(payment.amount).toLocaleString("es-CL")} registrada. Pendiente de verificación.`
                );
                setRevision((prev) => prev + 1);
              }}
            />
          </div>
          {notice ? (
            <p className="success-message" role="status">
              {notice}
            </p>
          ) : null}
          <PaymentList revision={revision} />
        </section>
        <footer className="page-footer">
          <span>BAMBALIX</span>
          <span>Control de pagos</span>
        </footer>
      </main>
    </div>
  );
}
