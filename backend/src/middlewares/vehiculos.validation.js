import { z } from "zod";
import { vehicleSchema, vehicleUpdateSchema, vehicleFiltersSchema, vehicleIdSchema, vehiclePageSchema } from "../schemas/vehiculos.schema.js";

export function validarVehiculo(req, res, next) {
  const result = vehicleSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: "Revisa los datos del vehículo", fields: z.flattenError(result.error).fieldErrors });
  req.body = result.data;
  next();
}

export function validarFiltrosVehiculos(req, res, next) {
  const result = vehicleFiltersSchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ message: "Revisa la búsqueda de vehículos" });
  res.locals.vehicleFilters = result.data;
  next();
}

export function validarEdicionVehiculo(req, res, next) {
  const result = vehicleUpdateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: "Revisa los datos y la versión del vehículo", fields: z.flattenError(result.error).fieldErrors });
  req.body = result.data;
  next();
}

export function validarIdVehiculo(req, res, next) {
  const result = vehicleIdSchema.safeParse(req.params);
  if (!result.success) return res.status(400).json({ message: "El identificador del vehículo no es válido" });
  res.locals.vehicleId = result.data.id;
  next();
}

export function validarPaginaVehiculos(req, res, next) {
  const result = vehiclePageSchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ message: "Revisa los filtros y la página de vehículos" });
  res.locals.vehiclePage = result.data;
  next();
}
