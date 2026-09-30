import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith("_test")) throw new Error("Usa una base exclusiva de pruebas cuyo nombre termine en _test");

it.skipIf(!url)("persiste, consulta y rechaza códigos duplicados en PostgreSQL", async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const code = `TEST-${randomUUID()}`;
  const api = request(createApp({ db, webOrigin: "http://localhost:3000" }));
  const body = { name: "Equipo de integración", category: "Pruebas", code, mode: "UNIT", quantity: 1 };
  try {
    const created = await api.post("/api/v1/operations/resources").send(body);
    expect(created.status).toBe(201);
    expect((await db.resource.findUnique({ where: { code } })).name).toBe(body.name);
    expect((await api.get("/api/v1/operations/resources")).body.some(item => item.code === code)).toBe(true);
    expect((await api.post("/api/v1/operations/resources").send(body)).status).toBe(409);
  } finally {
    await db.resource.deleteMany({ where: { code } });
    await db.$disconnect();
  }
});
