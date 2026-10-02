import { ArrowUpRight, Boxes, Calendar, Users } from "lucide-react";

const modules = [
  { id: "equipos", label: "Equipos", href: "/", Icon: Boxes },
  { id: "eventos", label: "Eventos", href: "/?module=eventos", Icon: Calendar },
  { id: "clientes", label: "Clientes", href: "/clientes", Icon: Users },
];

export function WorkspaceNavigation({ activeModule }) {
  return <nav className="primary-navigation" aria-label="Principal">
    {modules.map(({ id, label, href, Icon }) => <a
      key={id}
      href={href}
      aria-current={activeModule === id ? "page" : undefined}
      className={`nav-item${activeModule === id ? " active font-bold" : ""}`}
    >
      <Icon aria-hidden="true" />{label}<ArrowUpRight aria-hidden="true" />
    </a>)}
  </nav>;
}