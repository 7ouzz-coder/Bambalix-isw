import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { expect, it } from "vitest";
import { createApp } from "../src/app.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const testRut = `T${randomUUID().replaceAll("-", "").slice(0, 18)}`;

if (databaseUrl) {
  const parsedUrl = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol) || !databaseName.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL debe apuntar exclusivamente a una base PostgreSQL cuyo nombre termine en _test");
  }
}

it.skipIf(!databaseUrl)("persiste, consulta y rechaza un RUT duplicado en PostgreSQL", async () => {
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const api = request(createApp({ db, webOrigin: "http://localhost:3000" }));
  let createdId;
  let connected = false;

  try {
    await db.$connect();
    connected = true;
    const payload = {
      name: "Cliente de integración",
      email: "integracion@bambalix.local",
      rut: testRut,
      phone: "+56 9 9999 8888",
      address: "Dirección de prueba",
    };
    const created = await api.post("/api/v1/clients").send(payload);
    createdId = created.body.id;
    expect(created.status).toBe(201);
    expect(typeof createdId).toBe("string");
    expect(created.body.rut).toBe(testRut);

    const persisted = await db.client.findUnique({ where: { id: createdId } });
    expect(persisted).toMatchObject({ id: createdId, name: payload.name, email: payload.email });

    const listed = await api.get("/api/v1/clients");
    expect(listed.status).toBe(200);
    expect(listed.body.find(client => client.id === createdId)).toMatchObject({
      name: payload.name,
      email: payload.email,
    });

    const duplicate = await api.post("/api/v1/clients").send({ ...payload, name: "Otro cliente" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe("Ya existe un cliente con ese RUT");
  } finally {
    if (connected) {
      const createdClient = createdId
        ? await db.client.findUnique({ where: { id: createdId } })
        : await db.client.findUnique({ where: { rut: testRut } });
      if (createdClient) await db.client.delete({ where: { id: createdClient.id } });
    }
    await db.$disconnect();
  }
});