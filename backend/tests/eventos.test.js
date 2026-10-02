import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";

const testUrl = process.env.TEST_DATABASE_URL || "postgresql://postgres:1345@localhost:5432/bambalix_test?schema=public";
if (testUrl && !new URL(testUrl).pathname.endsWith("_test")) {
  throw new Error("Usa una base exclusiva de pruebas cuyo nombre termine en _test");
}

const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
const app = createApp({ db: prisma, webOrigin: "http://localhost:3000" });

describe("POST /api/v1/events", () => {
  let clienteId;
  let tipoEventoId;
  const createdEventIds = [];

  beforeAll(async () => {
    const cliente = await prisma.client.create({
      data: { name: "Cliente Test Vitest", email: "testvitest@ejemplo.cl" },
    });
    clienteId = cliente.id;

    const tipo = await prisma.eventType.upsert({
      where: { name: "Test Vitest" },
      update: {},
      create: { name: "Test Vitest" },
    });
    tipoEventoId = tipo.id;
  });

  afterAll(async () => {
    if (createdEventIds.length > 0) {
      await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
    }
    if (clienteId) {
      await prisma.client.deleteMany({ where: { id: clienteId } });
    }
    if (tipoEventoId) {
      await prisma.eventType.deleteMany({ where: { id: tipoEventoId } });
    }
    await prisma.$disconnect();
  });

  it("crea un evento válido y responde 201", async () => {
    const res = await request(app)
      .post("/api/v1/events")
      .set("Origin", "http://localhost:3000")
      .send({
        title: "Evento de prueba Vitest",
        clientId: clienteId,
        eventTypeId: tipoEventoId,
        startsAt: "2026-11-01T10:00:00-03:00",
        endsAt: "2026-11-01T14:00:00-03:00",
        attendees: 50,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.title).toBe("Evento de prueba Vitest");
    expect(res.body.client.id).toBe(clienteId);
    expect(res.body.eventType.id).toBe(tipoEventoId);
    expect(res.body.attendees).toBe(50);
    createdEventIds.push(res.body.id);
  });

  it("rechaza con 400 cuando la fecha de término es anterior o igual al inicio", async () => {
    const resAnterior = await request(app)
      .post("/api/v1/events")
      .set("Origin", "http://localhost:3000")
      .send({
        title: "Evento fecha anterior",
        clientId: clienteId,
        eventTypeId: tipoEventoId,
        startsAt: "2026-11-01T14:00:00-03:00",
        endsAt: "2026-11-01T10:00:00-03:00",
        attendees: 50,
      });

    expect(resAnterior.status).toBe(400);
    expect(resAnterior.body.message).toContain("posterior al inicio");

    const resIgual = await request(app)
      .post("/api/v1/events")
      .set("Origin", "http://localhost:3000")
      .send({
        title: "Evento fecha igual",
        clientId: clienteId,
        eventTypeId: tipoEventoId,
        startsAt: "2026-11-01T10:00:00-03:00",
        endsAt: "2026-11-01T10:00:00-03:00",
        attendees: 50,
      });

    expect(resIgual.status).toBe(400);
    expect(resIgual.body.message).toContain("posterior al inicio");
  });

  it("rechaza con 400 cuando los datos Zod son inválidos (sin throw 500)", async () => {
    const res = await request(app)
      .post("/api/v1/events")
      .set("Origin", "http://localhost:3000")
      .send({
        title: "AB", // < 3 caracteres
        clientId: clienteId,
        eventTypeId: tipoEventoId,
        startsAt: "2026-11-01T10:00:00-03:00",
        endsAt: "2026-11-01T14:00:00-03:00",
        attendees: -5, // < 1 asistente
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("rechaza con 404 cuando el cliente no existe", async () => {
    const res = await request(app)
      .post("/api/v1/events")
      .set("Origin", "http://localhost:3000")
      .send({
        title: "Evento cliente inexistente",
        clientId: "non-existent-client-id-xyz",
        eventTypeId: tipoEventoId,
        startsAt: "2026-11-01T10:00:00-03:00",
        endsAt: "2026-11-01T14:00:00-03:00",
        attendees: 50,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Cliente no encontrado");
  });
});
