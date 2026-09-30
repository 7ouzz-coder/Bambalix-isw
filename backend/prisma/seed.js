import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("Cargando datos de prueba...");

  // Clientes ficticios para la selección de Ángel / Gabriel
  const clientes = await Promise.all([
    prisma.client.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: "Cliente Demo Uno", email: "demo1@ejemplo.cl", phone: "+56912345678" },
    }),
    prisma.client.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, name: "Cliente Demo Dos", email: "demo2@ejemplo.cl", phone: "+56987654321" },
    }),
    prisma.client.upsert({
      where: { id: 3 },
      update: {},
      create: { id: 3, name: "Cliente Demo Tres", email: "demo3@ejemplo.cl" },
    }),
  ]);
  console.log(`  ${clientes.length} clientes cargados.`);

  // Tipos de evento
  const tipos = await Promise.all([
    prisma.eventType.upsert({
      where: { name: "Cumpleaños" },
      update: {},
      create: { name: "Cumpleaños" },
    }),
    prisma.eventType.upsert({
      where: { name: "Corporativo" },
      update: {},
      create: { name: "Corporativo" },
    }),
    prisma.eventType.upsert({
      where: { name: "Social" },
      update: {},
      create: { name: "Social" },
    }),
    prisma.eventType.upsert({
      where: { name: "Otro" },
      update: {},
      create: { name: "Otro" },
    }),
  ]);
  console.log(`  ${tipos.length} tipos de evento cargados.`);

  console.log("Datos de prueba cargados exitosamente.");
}

seed()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
