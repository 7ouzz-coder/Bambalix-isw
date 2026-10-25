import { createPaymentSchema } from "../schemas/pagos.schema.js";

function formatearErroresZod(error) {
  if (Array.isArray(error?.issues)) {
    return error.issues.map((i) => i.message).filter(Boolean).join("; ");
  }
  return "Datos del pago inválidos";
}

export function validateCreatePayment(req, res, next) {
  const parseResult = createPaymentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: formatearErroresZod(parseResult.error),
      issues: parseResult.error.issues,
    });
  }
  req.validatedBody = parseResult.data;
  next();
}
