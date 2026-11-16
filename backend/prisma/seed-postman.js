import "dotenv/config";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/database/prisma.js";
import { createInternalUser } from "../src/services/sesiones.service.js";

const profiles = new Map([
  ["angel", { role: "PRODUCCION", permissions: [] }],
  ["guillermo", { role: "OPERACIONES", permissions: ["recursos:leer", "recursos:editar"] }],
  ["gabriel", { role: "PRODUCCION", permissions: [
    "cotizaciones:leer", "cotizaciones:editar", "pagos:leer", "pagos:registrar",
  ] }],
]);

async function seedPostman() {
  const member = process.argv[2]?.trim().toLowerCase().replace(/^á/, "a");
  const profile = profiles.get(member);
  if (!profile) throw new Error("Uso: npm run seed:postman -- guillermo|angel|gabriel");

  const [destination] = await prisma.$queryRaw`SELECT current_database() AS name`;
  if (destination.name !== "usergps21_db") {
    throw new Error("La conexión debe apuntar a usergps21_db.");
  }

  const email = `postman-${member}-${randomBytes(6).toString("hex")}@example.test`;
  const password = randomBytes(24).toString("hex");
  const eventType = await prisma.$transaction(async (tx) => {
    const existingType = await tx.eventType.findFirst({ orderBy: { id: "asc" } });
    const type = existingType ?? await tx.eventType.upsert({
      where: { name: "Seminario QA" },
      create: { name: "Seminario QA" },
      update: {},
    });

    await createInternalUser(tx, {
      name: `Postman QA ${member}`,
      email,
      password,
      role: profile.role,
      permissions: [
        "clientes:leer", "clientes:editar", "eventos:leer", "eventos:editar",
        ...profile.permissions,
      ],
    });
    return type;
  });

  console.log(`Tipo de evento: ${eventType.name} (ID ${eventType.id})`);
  console.log(`emailPrueba: ${email}`);
  console.log(`passwordPrueba: ${password}`);
}

try {
  await seedPostman();
} catch (error) {
  if (error.code || error.name.startsWith("Prisma")) {
    console.error("No se pudo preparar Postman. Revisa la conexión y el estado de las migraciones.");
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
