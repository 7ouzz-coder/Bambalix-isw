import { z } from "zod";
import { replacementSchema, replacementDecisionSchema, replacementPageSchema, replacementIdSchema, replacementActorSchema } from "../schemas/reemplazos.schema.js";

function validate(schema, source, key) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return res.status(400).json({ message: "Revisa los datos del reemplazo", fields: z.flattenError(result.error).fieldErrors });
    res.locals[key] = result.data;
    next();
  };
}
export const validarReemplazo = validate(replacementSchema, "body", "replacementData");
export const validarDecisionReemplazo = validate(replacementDecisionSchema, "body", "replacementDecision");
export const validarPaginaReemplazos = validate(replacementPageSchema, "query", "replacementPage");
export function validarIdReemplazo(req, res, next) {
  const result = replacementIdSchema.safeParse(req.params.replacementId);
  if (!result.success) return res.status(400).json({ message: "El identificador del reemplazo no es válido" });
  res.locals.replacementId = result.data;
  next();
}
export function identidadReemplazos(req, res, next) {
  const result = replacementActorSchema.safeParse(req.user);
  res.locals.replacementActor = result.success ? result.data : null;
  next();
}
export function exigirGerenteReemplazos(_req, res, next) {
  const actor = res.locals.replacementActor;
  if (!actor) return res.status(401).json({ message: "Necesitas una sesión de gerente validada por el servidor" });
  if (actor.role !== "GERENTE") return res.status(403).json({ message: "Solo el gerente puede decidir un reemplazo" });
  next();
}
