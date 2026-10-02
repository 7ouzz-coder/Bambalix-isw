import { Layers3 } from "lucide-react";
import { WorkspaceNavigation } from "./workspace-navigation";

export function WorkspaceLayout({ activeModule, breadcrumb, footer, children }) {
  return <div className="workspace">
    <aside className="sidebar">
      <a href="/" className="brand" aria-label="Bambalix, inicio">
        <Layers3 aria-hidden="true" />Bambalix<span>®</span>
      </a>
      <p className="nav-label">ESPACIO DE TRABAJO</p>
      <WorkspaceNavigation activeModule={activeModule} />
      <div className="sidebar-foot">
        <span className="small-line" />
        <p>Detrás de cada evento,<br />todo en su lugar.</p>
        <small>Bambalix</small>
      </div>
    </aside>
    <main className="main-content">
      <header className="topbar"><span>{breadcrumb}</span></header>
      {children}
      <footer className="page-footer"><span>BAMBALIX</span>{footer ? <span>{footer}</span> : null}</footer>
    </main>
  </div>;
}
