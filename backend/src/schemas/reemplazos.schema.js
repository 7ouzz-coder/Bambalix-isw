import { z } from "zod";
import { equipmentHistoryPageSchema } from "./equipos.schema.js";

export const replacementIdSchema = z.string().trim().min(1).max(100);
export const replacementSchema = z.object({
  proposedResourceId: replacementIdSchema.nullable().optional().default(null),
  externalAlternative: z.string().trim().min(3).max(240).nullable().optional().default(null),
  reason: z.string().trim().min(3).max(500),
  estimatedCost: z.string().trim().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Usa un importe no negativo con hasta dos decimales")
    .nullable().optional().default(null),
}).strict().refine(data => Boolean(data.proposedResourceId) !== Boolean(data.externalAlternative), {
  path: ["proposedResourceId"], message: "Selecciona un equipo o describe una alternativa externa, no ambos",
});
export const replacementDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().min(3).max(500),
}).strict();
export const replacementPageSchema = equipmentHistoryPageSchema;

// Contrato para una identidad que ya haya validado el servidor compartido.
export const replacementActorSchema = z.object({
  id: replacementIdSchema,
  role: z.string().trim().min(1).max(40).transform(value => value.toUpperCase()),
});
