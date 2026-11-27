import { listFiltersSchema } from "../schemas/pagos.schema.js";
import { createPaymentSchema, paymentVerifierSchema } from "../schemas/pagos.schema.js";

export function requirePaymentVerifier(req, res, next) {
  const result = paymentVerifierSchema.safeParse(req.user);
  if (!result.success) {
    return res.status(401).json({ message: "Se requiere una sesión interna válida para verificar pagos" });
  }
  if (req.user.role !== "GERENTE") return res.status(403).json({ message: "Solo el gerente puede verificar abonos" });
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

export function validateListFilters(req, res, next) {
  const result = listFiltersSchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ message: "Revisa los filtros de consulta" });
  res.locals.listFilters = result.data;
  next();
}

const receiptSignatures = {
  "image/png": "89504e470d0a1a0a",
  "image/jpeg": "ffd8ff",
  "application/pdf": "255044462d",
};
const maxReceiptBytes = 2 * 1024 * 1024;

export function validatePaymentReceipt(req, res, next) {
  if (!req.is("application/vnd.bambalix.payment+json")) return next();
  const { receipt, ...payment } = req.body ?? {};
  const signature = Object.hasOwn(receiptSignatures, receipt?.mime) && receiptSignatures[receipt.mime];
  const encoded = receipt?.base64;
  if (!signature || typeof encoded !== "string" || !encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    return res.status(400).json({ message: "Adjunta un PDF, JPEG o PNG válido" });
  }
  const content = Buffer.from(encoded, "base64");
  if (content.length > maxReceiptBytes) return res.status(413).json({ message: "El comprobante supera los 2 MB" });
  if (content.toString("base64") !== encoded || !content.toString("hex", 0, signature.length / 2).startsWith(signature)) {
    return res.status(400).json({ message: "El comprobante no coincide con el formato indicado" });
  }
  res.locals.paymentReceipt = { mime: receipt.mime, content };
  req.body = payment;
  next();
}
