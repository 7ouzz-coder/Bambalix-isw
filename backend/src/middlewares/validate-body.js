import { z } from "zod";

export function validateBody(schema, message) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      if (message) return res.status(400).json({
        message,
        fields: z.flattenError(result.error).fieldErrors,
      });
      return res.status(400).json({
        message: result.error.issues.map(issue => issue.message).filter(Boolean).join("; ") || "Datos de evento inválidos",
      });
    }
    req.body = result.data;
    next();
  };
}
