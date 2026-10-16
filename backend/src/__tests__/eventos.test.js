import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

describe("Módulo Eventos - Rutas y Servicios", () => {
  let mockDb;
  let app;
  const webOrigin = "http://localhost:3000";

  beforeEach(() => {
    mockDb = {
      $queryRaw: vi.fn(),
      client: {
        findUnique: vi.fn(),
      },
      eventType: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      event: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      equipment: {
        findMany: vi.fn(),
      },
    };
    app = createApp({ db: mockDb, webOrigin });
  });

  describe("POST /api/v1/events", () => {
    const validPayload = {
      title: "Gala Anual 2026",
      clientId: "client-123",
      eventTypeId: 1,
      startsAt: "2026-11-20T18:00:00.000Z",
      endsAt: "2026-11-20T23:00:00.000Z",
      attendees: 150,
      location: "Salón Principal",
      needs: "Iluminación cálida y microfonía",
    };

    it("crea un evento exitosamente (201) cuando los datos y entidades existen", async () => {
      mockDb.client.findUnique.mockResolvedValue({ id: "client-123", name: "Empresa Uno" });
      mockDb.eventType.findUnique.mockResolvedValue({ id: 1, name: "Corporativo" });
      mockDb.event.create.mockResolvedValue({
        id: 10,
        ...validPayload,
        startsAt: new Date(validPayload.startsAt),
        endsAt: new Date(validPayload.endsAt),
        client: { id: "client-123", name: "Empresa Uno" },
        eventType: { id: 1, name: "Corporativo" },
      });

      const response = await request(app)
        .post("/api/v1/events")
        .set("Origin", webOrigin)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(10);
      expect(response.body.title).toBe("Gala Anual 2026");
      expect(mockDb.client.findUnique).toHaveBeenCalledWith({ where: { id: "client-123" } });
      expect(mockDb.eventType.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("rechaza con 400 si el título tiene menos de 3 caracteres", async () => {
      const response = await request(app)
        .post("/api/v1/events")
        .set("Origin", webOrigin)
        .send({ ...validPayload, title: "ab" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("El título debe tener al menos 3 caracteres");
    });

    it("rechaza con 400 si la fecha de término es igual o anterior al inicio", async () => {
      const response = await request(app)
        .post("/api/v1/events")
        .set("Origin", webOrigin)
        .send({
          ...validPayload,
          startsAt: "2026-11-20T20:00:00.000Z",
          endsAt: "2026-11-20T19:00:00.000Z",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("La fecha de término debe ser posterior al inicio");
    });

    it("rechaza con 400 si los asistentes son menores a 1", async () => {
      const response = await request(app)
        .post("/api/v1/events")
        .set("Origin", webOrigin)
        .send({ ...validPayload, attendees: 0 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Debe haber al menos 1 asistente");
    });

    it("rechaza con 400 si los asistentes superan 100.000", async () => {
      const response = await request(app)
        .post("/api/v1/events")
        .set("Origin", webOrigin)
        .send({ ...validPayload, attendees: 100001 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Los asistentes no pueden superar 100.000");
    });

    it("devuelve 404 si el cliente no existe", async () => {
      mockDb.client.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/events")
        .set("Origin", webOrigin)
        .send(validPayload);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Cliente no encontrado");
      expect(mockDb.event.create).not.toHaveBeenCalled();
    });

    it("devuelve 404 si el tipo de evento no existe", async () => {
      mockDb.client.findUnique.mockResolvedValue({ id: "client-123", name: "Empresa Uno" });
      mockDb.eventType.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/events")
        .set("Origin", webOrigin)
        .send(validPayload);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Tipo de evento no encontrado");
      expect(mockDb.event.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/events", () => {
    it("retorna lista de eventos con cliente y tipo (200)", async () => {
      const mockEventos = [
        {
          id: 1,
          title: "Evento A",
          client: { id: "c1", name: "Cliente Uno" },
          eventType: { id: 1, name: "Social" },
          startsAt: new Date("2026-12-01T10:00:00Z"),
          endsAt: new Date("2026-12-01T12:00:00Z"),
          attendees: 30,
        },
      ];
      mockDb.event.findMany.mockResolvedValue(mockEventos);

      const response = await request(app).get("/api/v1/events");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Evento A");
      expect(mockDb.event.findMany).toHaveBeenCalledWith({
        include: {
          client: { select: { id: true, name: true } },
          eventType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("GET /api/v1/events/types", () => {
    it("retorna tipos de eventos ordenados por nombre (200)", async () => {
      const mockTypes = [
        { id: 1, name: "Corporativo" },
        { id: 2, name: "Social" },
      ];
      mockDb.eventType.findMany.mockResolvedValue(mockTypes);

      const response = await request(app).get("/api/v1/events/types");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTypes);
      expect(mockDb.eventType.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      });
    });
  });
});
