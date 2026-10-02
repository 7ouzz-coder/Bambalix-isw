"use client";

import { useEffect, useState } from "react";
import { EquipmentWorkspace } from "@/modules/equipos/equipment-workspace";
import { EventoWorkspace } from "@/modules/eventos/evento-workspace";
import { WorkspaceLayout } from "@/components/workspace-layout";

export default function Home() {
  const [activeTab, setActiveTab] = useState("equipos");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("module") === "eventos") {
      setActiveTab("eventos");
    }
  }, []);

  return <WorkspaceLayout
    activeModule={activeTab}
    breadcrumb={activeTab === "equipos" ? "Recursos y operación / Equipos" : "Eventos y agenda / Registrar eventos"}
  >
    {activeTab === "equipos" ? <EquipmentWorkspace /> : <EventoWorkspace />}
  </WorkspaceLayout>;
}
