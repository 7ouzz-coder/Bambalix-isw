import { z } from "zod";

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError || error?.name === "ZodError" || Array.isArray(error?.issues)) {
        const issues = error.issues || error.errors || [];
        const mensaje = issues.map((e) => e.message).filter(Boolean).join("; ");
        return res.status(400).json({ message: mensaje || "Datos de evento inválidos" });
      }
      next(error);
    }
  };
}
