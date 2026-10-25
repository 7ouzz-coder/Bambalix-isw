const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function requestEquipment(path, options) {
  try {
    const response = await fetch(`${API_URL}/api/v1/operations/resources${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: options.signal || AbortSignal.timeout(10000),
      cache: "no-store",
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("El servidor no devolvió una respuesta válida. Intenta nuevamente");
    }
    if (!response.ok) {
      const error = new Error(data?.message || "No se pudo completar la solicitud");
      error.status = response.status;
      error.fields = {};
      for (const [field, messages] of Object.entries(data?.fields || {})) {
        if (Array.isArray(messages) && typeof messages[0] === "string") error.fields[field] = messages[0];
      }
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw error;
    if (error instanceof TypeError || error.name === "TimeoutError")
      throw new Error("No se pudo conectar con el servidor. Comprueba que esté encendido");
    throw error;
  }
}

export function equipmentRequest({ filters = {}, ...options } = {}) {
  const params = new URLSearchParams();
  if (filters.name) params.set("name", filters.name);
  if (filters.code) params.set("code", filters.code);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  return requestEquipment(query ? `?${query}` : "", options);
}

export function getEquipmentCategories(options = {}) {
  return requestEquipment("/categories", options);
}

export function getEquipmentPage({ name, code, category, status, page = 1, pageSize = 20 } = {}, options = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (name) params.set("name", name);
  if (code) params.set("code", code);
  if (category) params.set("category", category);
  if (status) params.set("status", status);
  return requestEquipment(`/page?${params}`, options);
}

export function updateEquipmentStatus(id, data) {
  return requestEquipment(`/${encodeURIComponent(id)}/status`, {
    method: "PATCH", body: JSON.stringify(data),
  });
}

export function updateEquipment(id, data) {
  return requestEquipment(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getEquipmentStatusHistory(id, options = {}) {
  return requestEquipment(`/${encodeURIComponent(id)}/status-history`, options);
}

export function getEquipmentStatusHistoryPage(id, { page = 1, pageSize = 10 } = {}, options = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return requestEquipment(`/${encodeURIComponent(id)}/status-history/page?${params}`, options);
}

export function createEquipmentMaintenance(id, data) {
  return requestEquipment(`/${encodeURIComponent(id)}/maintenances`, {
    method: "POST", body: JSON.stringify(data),
  });
}

export function getEquipmentMaintenances(id, { page = 1, pageSize = 10 } = {}, options = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return requestEquipment(`/${encodeURIComponent(id)}/maintenances?${params}`, options);
}

function maintenancePath(id, maintenanceId) {
  return `/${encodeURIComponent(id)}/maintenances/${encodeURIComponent(maintenanceId)}`;
}

export function getMaintenanceNotes(id, maintenanceId, { page = 1, pageSize = 10 } = {}, options = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return requestEquipment(`${maintenancePath(id, maintenanceId)}/notes?${params}`, options);
}

export function addMaintenanceNote(id, maintenanceId, content) {
  return requestEquipment(`${maintenancePath(id, maintenanceId)}/notes`, { method: "POST", body: JSON.stringify({ content }) });
}

export function closeEquipmentMaintenance(id, maintenanceId, closingNotes) {
  return requestEquipment(`${maintenancePath(id, maintenanceId)}/close`, { method: "PATCH", body: JSON.stringify({ closingNotes }) });
}

export function getAssignmentEvents({ page = 1, search = "" } = {}, options = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (search) params.set("search", search);
  return requestEquipment(`/assignment-events?${params}`, options);
}

export function getEquipmentAssignments(id, { page = 1 } = {}, options = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  return requestEquipment(`/${encodeURIComponent(id)}/assignments?${params}`, options);
}

export function createEquipmentAssignment(id, data) {
  return requestEquipment(`/${encodeURIComponent(id)}/assignments`, { method: "POST", body: JSON.stringify(data) });
}

export function releaseEquipmentAssignment(id, assignmentId, reason) {
  return requestEquipment(`/${encodeURIComponent(id)}/assignments/${encodeURIComponent(assignmentId)}/release`, {
    method: "PATCH", body: JSON.stringify({ reason }),
  });
}

function replacementsPath(id, assignmentId) {
  return `/${encodeURIComponent(id)}/assignments/${encodeURIComponent(assignmentId)}/replacements`;
}

export function getEquipmentReplacements(id, assignmentId, { page = 1 } = {}, options = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  return requestEquipment(`${replacementsPath(id, assignmentId)}?${params}`, options);
}

export function createEquipmentReplacement(id, assignmentId, data) {
  return requestEquipment(replacementsPath(id, assignmentId), { method: "POST", body: JSON.stringify(data) });
}

export function decideEquipmentReplacement(id, assignmentId, replacementId, data) {
  return requestEquipment(`${replacementsPath(id, assignmentId)}/${encodeURIComponent(replacementId)}/decision`, {
    method: "PATCH", body: JSON.stringify(data),
  });
}
