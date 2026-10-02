import { apiRequest } from "./api";

export function clientRequest(options = {}) {
  return apiRequest("/clients", options);
}

export function validateClient({ name = "", email = "", rut = "", phone = "", address = "" } = {}) {
  const errors = {};
  const normalizedName = name.trim();
  const normalizedEmail = email.trim();
  if (normalizedName.length < 2 || normalizedName.length > 120) errors.name = "Escribe entre 2 y 120 caracteres";
  if (normalizedEmail.length === 0) errors.email = "El correo es obligatorio";
  else if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.email = "Escribe un correo válido de hasta 254 caracteres";
  if (rut.trim().length > 20) errors.rut = "El RUT admite hasta 20 caracteres";
  if (phone.trim().length > 40) errors.phone = "El teléfono admite hasta 40 caracteres";
  if (address.trim().length > 240) errors.address = "La dirección admite hasta 240 caracteres";
  return errors;
}
