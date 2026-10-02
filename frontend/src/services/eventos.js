const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = rawApiUrl.endsWith("/api/v1") ? rawApiUrl : `${rawApiUrl.replace(/\/$/, "")}/api/v1`;

function handleNetworkError(error) {
  if (error instanceof TypeError || error.name === "TimeoutError") {
    throw new Error("No se pudo conectar con el servidor. Comprueba que esté encendido");
  }
  throw error;
}

export async function getClientes() {
  try {
    const res = await fetch(`${API_BASE}/clients`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Error al obtener lista de clientes");
    }
    return res.json();
  } catch (error) {
    handleNetworkError(error);
  }
}

export async function getTiposEvento() {
  try {
    const res = await fetch(`${API_BASE}/events/types`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Error al obtener tipos de evento");
    }
    return res.json();
  } catch (error) {
    handleNetworkError(error);
  }
}

export async function getEventos() {
  try {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Error al obtener lista de eventos");
    }
    return res.json();
  } catch (error) {
    handleNetworkError(error);
  }
}

export async function createEvento(data) {
  let res;
  try {
    res = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (error) {
    handleNetworkError(error);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error || "Error al registrar el evento");
  }
  return body;
}
