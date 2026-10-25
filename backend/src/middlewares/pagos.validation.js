import { createPaymentSchema, paymentVerifierSchema } from "../schemas/pagos.schema.js";

export function requirePaymentVerifier(req, res, next) {
  const result = paymentVerifierSchema.safeParse(req.user);
  if (!result.success) {
    return res.status(401).json({ message: "Se requiere una sesión interna válida para verificar pagos" });
  }
  res.locals.paymentVerifier = result.data;
  next();
}

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
