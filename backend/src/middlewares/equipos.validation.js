import { z } from "zod";
import { equipmentSchema, equipmentFiltersSchema, equipmentIdSchema, equipmentStatusSchema, equipmentUpdateSchema, equipmentPageSchema, equipmentHistoryPageSchema } from "../schemas/equipos.schema.js";

export function validarEquipo(req, res, next) {
  const result = equipmentSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({
    message: "Revisa el nombre, la categoría y el código del equipo",
    fields: z.flattenError(result.error).fieldErrors,
  });
  req.body = result.data;
  next();
}

export function validarFiltrosEquipos(req, res, next) {
  const result = equipmentFiltersSchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({
    message: "Revisa el nombre, el código, la categoría y el estado del filtro",
    fields: z.flattenError(result.error).fieldErrors,
  });
  res.locals.equipmentFilters = result.data;
  next();
}

export function validarIdEquipo(req, res, next) {
  const result = equipmentIdSchema.safeParse(req.params);
  if (!result.success)
    return res.status(400).json({ message: "El identificador del equipo no es válido" });
  res.locals.equipmentId = result.data.id;
  next();
}

export function validarPaginaEquipos(req, res, next) {
  const result = equipmentPageSchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ message: "Revisa los filtros y la página del inventario" });
  res.locals.equipmentPage = result.data;
  next();
}

export function validarEstadoEquipo(req, res, next) {
  const result = equipmentStatusSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({
    message: "Revisa el estado, el motivo y la versión del equipo",
    fields: z.flattenError(result.error).fieldErrors,
  });
  req.body = result.data;
  next();
}

export function validarPaginaHistorialEquipo(req, res, next) {
  const result = equipmentHistoryPageSchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ message: "Revisa la página del historial" });
  res.locals.equipmentHistoryPage = result.data;
  next();
}

export function validarEdicionEquipo(req, res, next) {
  const result = equipmentUpdateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({
    message: "Revisa los datos y la versión del equipo",
    fields: z.flattenError(result.error).fieldErrors,
  });
  req.body = result.data;
  next();
}
