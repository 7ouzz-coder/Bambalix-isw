import { z } from "zod";
import { maintenanceSchema, maintenancePageSchema, maintenanceIdSchema, maintenanceNoteSchema, maintenanceCloseSchema } from "../schemas/mantenciones.schema.js";

export function validarMantencion(req, res, next) {
  const result = maintenanceSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({
    message: "Revisa las fechas y el motivo de la mantención",
    fields: z.flattenError(result.error).fieldErrors,
  });
  req.body = result.data;
  next();
}

export function validarPaginaMantenciones(req, res, next) {
  const result = maintenancePageSchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ message: "Revisa la página de mantenciones" });
  res.locals.maintenancePage = result.data;
  next();
}

export function validarIdMantencion(req, res, next) {
  const result = maintenanceIdSchema.safeParse(req.params.maintenanceId);
  if (!result.success) return res.status(400).json({ message: "El identificador de mantención no es válido" });
  res.locals.maintenanceId = result.data;
  next();
}

function validarAccion(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({
      message: "Escribe una observación de entre 3 y 500 caracteres",
      fields: z.flattenError(result.error).fieldErrors,
    });
    res.locals.maintenanceAction = result.data;
    next();
  };
}

export const validarNotaMantencion = validarAccion(maintenanceNoteSchema);
export const validarCierreMantencion = validarAccion(maintenanceCloseSchema);
