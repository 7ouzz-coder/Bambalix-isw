const labels = {
  OPERATIONAL: ["Operativo", "green"], AVAILABLE: ["Disponible", "green"],
  MAINTENANCE: ["En mantención", "yellow"], OCCUPIED: ["Ocupado", "red"],
  DAMAGED: ["Dañado", "red"], UNREVIEWED: ["Sin revisar", "neutral"],
};

export function CurrentStatus({ status }) {
  const [label, color] = labels[status] || ["Sin información", "neutral"];
  return <span className={`resource-status resource-status--${color}`}>{label}</span>;
}
