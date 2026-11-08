import { Layers3 } from "lucide-react";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { RequestInbox } from "@/modules/solicitudes/request-inbox";
export default function RequestsPage() {
  return <div className="workspace"><aside className="sidebar">
    <a href="/" className="brand" aria-label="Bambalix, inicio"><Layers3 aria-hidden="true"/>Bambalix</a>
    <p className="nav-label">ESPACIO DE TRABAJO</p><WorkspaceNavigation activeModule="solicitudes"/>
  </aside><main className="main-content"><header className="topbar"><span>Solicitudes</span></header>
    <div className="inventory-section"><RequestInbox/></div>
  </main></div>;
}
