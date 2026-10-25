import { createQuoteSchema } from "../schemas/cotizaciones.schema.js";

function formatearErroresZod(error) {
  if (Array.isArray(error?.issues)) {
    return error.issues.map((i) => i.message).filter(Boolean).join("; ");
  }
  return "Datos de la cotización inválidos";
}

export function validateCreateQuote(req, res, next) {
  const parseResult = createQuoteSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: formatearErroresZod(parseResult.error),
      issues: parseResult.error.issues,
    });
  }
  req.validatedBody = parseResult.data;
  next();
}

/**
 * Middleware para requerir autenticación gerencial real.
 * Prohíbe terminantemente confiar en cabeceras inyectables (x-user-role, x-user-name).
 * Si no hay sesión autenticada real en el backend, deniega por defecto con 403.
 */
export function requireManagerAuth(req, res, next) {
  // Prohibir cabeceras simuladas
  if (req.headers["x-user-role"] || req.headers["x-user-name"] || req.headers["x-user-id"]) {
    // Si viene intento de inyección de cabeceras sin sesión real verificada en req.user, rechazar
    if (!req.user || !req.user.authenticated) {
      return res.status(403).json({
        message: "Acceso denegado: no se permite la simulación de permisos mediante cabeceras HTTP",
      });
    }
  }

  // Verificar sesión real
  const sessionUser = req.user || req.session?.user;
  if (!sessionUser || !sessionUser.authenticated || sessionUser.role?.toLowerCase() !== "gerente") {
    return res.status(403).json({
      message: "Aprobación bloqueada: solo un usuario con rol de gerente y sesión autenticada en el servidor puede aprobar cotizaciones",
    });
  }

  req.authenticatedManager = sessionUser;
  next();
}
