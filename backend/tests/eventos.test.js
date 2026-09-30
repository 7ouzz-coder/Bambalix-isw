import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";

const prisma = new PrismaClient();
const app = createApp({ db: prisma, webOrigin: "http://localhost:3000" });

describe("POST /api/v1/events", () => {
  let clienteId;
  let tipoEventoId;

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
    await prisma.event.deleteMany({});
    await prisma.client.deleteMany({ where: { id: clienteId } });
    await prisma.eventType.deleteMany({ where: { id: tipoEventoId } });
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
  });

  it("rechaza con 400 cuando la fecha de término es anterior al inicio", async () => {
    const res = await request(app)
      .post("/api/v1/events")
      .set("Origin", "http://localhost:3000")
      .send({
        title: "Evento fecha inválida",
        clientId: clienteId,
        eventTypeId: tipoEventoId,
        startsAt: "2026-11-01T14:00:00-03:00",
        endsAt: "2026-11-01T10:00:00-03:00",
        attendees: 50,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("posterior al inicio");
  });

  it("rechaza con 404 cuando el cliente no existe", async () => {
    const res = await request(app)
      .post("/api/v1/events")
      .set("Origin", "http://localhost:3000")
      .send({
        title: "Evento cliente inexistente",
        clientId: 99999,
        eventTypeId: tipoEventoId,
        startsAt: "2026-11-01T10:00:00-03:00",
        endsAt: "2026-11-01T14:00:00-03:00",
        attendees: 50,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Cliente no encontrado");
  });
});
