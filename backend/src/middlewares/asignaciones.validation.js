import { z } from "zod";
import { assignmentSchema, assignmentPageSchema, assignmentEventsSchema, availabilitySchema, releaseSchema, assignmentIdSchema } from "../schemas/asignaciones.schema.js";

function validate(schema, source, key) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return res.status(400).json({
      message: "Revisa los datos de la asignación", fields: z.flattenError(result.error).fieldErrors,
    });
    res.locals[key] = result.data;
    next();
  };
}

export const validarAsignacion = validate(assignmentSchema, "body", "assignmentData");
export const validarPaginaAsignaciones = validate(assignmentPageSchema, "query", "assignmentPage");
export const validarEventosAsignacion = validate(assignmentEventsSchema, "query", "assignmentEvents");
export const validarDisponibilidad = validate(availabilitySchema, "query", "availabilityPeriod");
export const validarLiberacion = validate(releaseSchema, "body", "releaseData");
export function validarIdAsignacion(req, res, next) {
  const result = assignmentIdSchema.safeParse(req.params.assignmentId);
  if (!result.success) return res.status(400).json({ message: "El identificador de la asignación no es válido" });
  res.locals.assignmentId = result.data;
  next();
}
