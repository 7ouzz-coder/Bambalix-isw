const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export async function getClientes() {
  const res = await fetch(`${API_BASE}/clients`);
  if (!res.ok) throw new Error("Error al obtener lista de clientes");
  return res.json();
}

export async function getTiposEvento() {
  const res = await fetch(`${API_BASE}/events/types`);
  if (!res.ok) throw new Error("Error al obtener tipos de evento");
  return res.json();
}

export async function getEventos() {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error("Error al obtener lista de eventos");
  return res.json();
}

export async function createEvento(data) {
  const res = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message || body.error || "Error al registrar el evento");
  }
  return body;
}
