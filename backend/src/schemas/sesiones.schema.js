import { z } from "zod";

export const permissions = ["solicitudes:leer", "clientes:leer", "clientes:editar", "eventos:leer", "eventos:editar", "cotizaciones:leer", "cotizaciones:editar", "pagos:leer", "pagos:registrar", "recursos:leer", "recursos:editar"];
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
}).strict();
export const internalUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: loginSchema.shape.email,
  password: z.string().min(12).max(128),
  role: z.enum(["PRODUCCION", "OPERACIONES", "GERENTE"]),
  permissions: z.array(z.enum(permissions)).max(permissions.length).default([]),
}).strict();
