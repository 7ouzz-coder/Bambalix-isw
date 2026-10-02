import { apiRequest } from "./api";

export function equipmentRequest(options = {}) {
  return apiRequest("/operations/resources", options);
}

export function validateEquipment({ name, category, code }) {
  const errors = {};
  if (name.trim().length < 2 || name.trim().length > 120) errors.name = "Escribe entre 2 y 120 caracteres";
  if (category.trim().length < 2 || category.trim().length > 80) errors.category = "Escribe entre 2 y 80 caracteres";
  if (code.trim().length > 60) errors.code = "El código admite hasta 60 caracteres";
  return errors;
}
