import { createClientSchema, updateClientSchema } from "../schemas/clientes.schema.js";

function formatearErroresZod(error) {
  if (Array.isArray(error?.issues)) {
    return error.issues.map((i) => i.message).filter(Boolean).join("; ");
  }
  return "Datos del cliente inválidos";
}

export function validateCreateClient(req, res, next) {
  const parseResult = createClientSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: formatearErroresZod(parseResult.error),
      issues: parseResult.error.issues,
    });
  }
  req.validatedBody = parseResult.data;
  next();
}

export function validateUpdateClient(req, res, next) {
  const parseResult = updateClientSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: formatearErroresZod(parseResult.error),
      issues: parseResult.error.issues,
    });
  }
  req.validatedBody = parseResult.data;
  next();
}
