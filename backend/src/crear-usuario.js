import "dotenv/config";
import { readFile } from "node:fs/promises";
import { prisma } from "./database/prisma.js";
import { createInternalUser } from "./services/sesiones.service.js";

// El archivo se prepara fuera del repositorio con permisos 600 y se elimina después.
const file = process.argv[2];
if (!file) throw new Error("Indica la ruta al archivo privado de alta de usuario");
try {
  const input = JSON.parse(await readFile(file, "utf8"));
  if (input.permissions?.length) throw new Error("La asignación de permisos permanece pendiente");
  const user = await createInternalUser(prisma, input);
  console.info(`Cuenta creada sin permisos: ${user.email}`);
} catch { console.error("No se pudo crear la cuenta. Revisa los datos, la conexión y que el correo no esté registrado"); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
