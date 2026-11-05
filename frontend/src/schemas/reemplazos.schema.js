import { z } from "zod";

const reason = z.string().trim().min(3, "Escribe al menos 3 caracteres").max(500, "Admite hasta 500 caracteres");
export const replacementFormSchema = z.object({
  alternative: z.enum(["REGISTERED", "EXTERNAL"]),
  proposedResourceId: z.string().max(100),
  externalAlternative: z.string().trim().max(240, "Admite hasta 240 caracteres"),
  reason,
  estimatedCost: z.string().trim().refine(value => value === "" || /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value), "Usa un importe no negativo con hasta dos decimales"),
}).strict().superRefine((data, ctx) => {
  if (data.alternative === "REGISTERED" && !data.proposedResourceId)
    ctx.addIssue({ code: "custom", path: ["proposedResourceId"], message: "Selecciona el equipo propuesto" });
  if (data.alternative === "EXTERNAL" && data.externalAlternative.length < 3)
    ctx.addIssue({ code: "custom", path: ["externalAlternative"], message: "Describe la alternativa externa con al menos 3 caracteres" });
});
export const replacementDecisionFormSchema = z.object({ reason }).strict();
