import { apiRequest } from "./api";

export function getClientes() {
  return apiRequest("/clients", {}, "Error al obtener lista de clientes");
}

export function getTiposEvento() {
  return apiRequest("/events/types", {}, "Error al obtener tipos de evento");
}

export function getEventos() {
  return apiRequest("/events", {}, "Error al obtener lista de eventos");
}

export function createEvento(data) {
  return apiRequest("/events", {
    method: "POST",
    body: JSON.stringify(data),
  }, "Error al registrar el evento");
}
