const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function requestVehicles(query = "", options = {}) {
  try {
    const response = await fetch(`${API_URL}/api/v1/operations/vehicles${query}`, {
      ...options, headers: { "Content-Type": "application/json" },
      signal: options.signal || AbortSignal.timeout(10000), cache: "no-store",
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("El servidor no devolvió una respuesta válida"); }
    if (!response.ok) {
      const error = new Error(data?.message || "No se pudo completar la solicitud");
      error.status = response.status;
      error.code = data?.code;
      error.fields = data?.fields || {};
      throw error;
    }
    return data;
  } catch (error) {
    if (error instanceof TypeError || error.name === "TimeoutError") throw new Error("No se pudo conectar con el servidor");
    throw error;
  }
}

export function listVehicles(filters = {}, options = {}) {
  const { q, type } = typeof filters === "string" ? { q: filters } : filters;
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (type) query.set("type", type);
  return requestVehicles(query.size ? `?${query}` : "", options);
}

export function getVehicleTypes(options = {}) {
  return requestVehicles("/types", options);
}

export function listVehiclePage({ q, type, page = 1, pageSize = 20 } = {}, options = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) query.set("q", q);
  if (type) query.set("type", type);
  return requestVehicles(`/page?${query}`, options);
}

export function createVehicle(data) {
  return requestVehicles("", { method: "POST", body: JSON.stringify(data) });
}

export function updateVehicle(id, data) {
  return requestVehicles(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
}
