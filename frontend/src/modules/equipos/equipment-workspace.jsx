"use client";

import { useState } from "react";
import { EquipmentForm } from "./equipment-form";
import { EquipmentList } from "./equipment-list";

export function EquipmentWorkspace() {
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  return <section className="inventory-section" aria-labelledby="equipment-heading">
    <p className="eyebrow">INVENTARIO / EQUIPOS INDIVIDUALES</p>
    <div className="page-heading">
      <div>
        <h1 id="equipment-heading">Todo empieza<br className="desktop-break" /> por el equipo.</h1>
        <p>Registra y consulta tus equipos en un solo lugar.</p>
      </div>
      <EquipmentForm onSaved={equipment => {
        setNotice(`Equipo «${equipment.name}» registrado correctamente.`);
        setRevision(previous => previous + 1);
      }} />
    </div>
    {notice ? <p className="success-message" role="status">{notice}</p> : null}
    <EquipmentList revision={revision} />
  </section>;
}
