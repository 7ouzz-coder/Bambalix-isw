"use client";
import { useSession } from "./sesion/session-gate";
import { ArrowUpRight, Boxes, Calendar, CircleDollarSign, FileText, Users, Truck } from "lucide-react";

const modules = [
  { id: "equipos", label: "Equipos", href: "/colaboradores", Icon: Boxes },
  { id: "vehiculos", label: "Vehículos", href: "/vehiculos", Icon: Truck },
  { id: "eventos", label: "Eventos", href: "/colaboradores?module=eventos", Icon: Calendar },
  { id: "clientes", label: "Clientes", href: "/clientes", Icon: Users },
  { id: "cotizaciones", label: "Cotizaciones", href: "/cotizaciones", Icon: FileText },
  { id: "solicitudes", label: "Solicitudes", href: "/solicitudes", Icon: FileText },
  { id: "pagos", label: "Pagos", href: "/pagos", Icon: CircleDollarSign },
];

export function WorkspaceNavigation({ activeModule }) {
  const user = useSession();
  const area = id => ["equipos", "vehiculos"].includes(id) ? "recursos" : id;
  return <nav className="primary-navigation" aria-label="Principal">
    {modules.filter(item => !user || user.permissions.includes(`${area(item.id)}:leer`)).map(({ id, label, href, Icon }) => <a
      key={id}
      href={href}
      aria-current={activeModule === id ? "page" : undefined}
      className={`nav-item${activeModule === id ? " active font-bold" : ""}`}
    >
      <Icon aria-hidden="true" />{label}<ArrowUpRight aria-hidden="true" />
    </a>)}
  </nav>;
}
