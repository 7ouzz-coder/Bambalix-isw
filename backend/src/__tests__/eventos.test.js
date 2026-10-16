import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

describe("Módulo Eventos - Rutas y Servicios", () => {
  let mockDb;
  let app;
  const webOrigin = "http://localhost:3000";

  beforeEach(() => {
    mockDb = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn((fn) => fn(mockDb)),
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
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
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
    });

    it("rechaza con 409 si ya existe un evento en el mismo espacio durante el periodo solicitado", async () => {
      mockDb.client.findUnique.mockResolvedValue({ id: "client-123", name: "Empresa Uno" });
      mockDb.eventType.findUnique.mockResolvedValue({ id: 1, name: "Corporativo" });
      mockDb.event.findFirst.mockResolvedValue({
        id: 99,
        title: "Evento Previo",
        location: "Salón Principal",
        startsAt: new Date("2026-11-20T17:00:00.000Z"),
        endsAt: new Date("2026-11-20T21:00:00.000Z"),
      });

      const response = await request(app)
        .post("/api/v1/events")
        .set("Origin", webOrigin)
        .send(validPayload);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("Conflicto de programación");
      expect(response.body.message).toContain("Salón Principal");
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
        where: {},
        include: {
          client: { select: { id: true, name: true } },
          eventType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("filtra eventos por periodo semiabierto [from, to) y ordena cronológicamente (200)", async () => {
      const from = "2026-11-20T00:00:00.000Z";
      const to = "2026-11-21T00:00:00.000Z";
      const mockEventos = [
        {
          id: 2,
          title: "Evento en periodo",
          client: { id: "c1", name: "Cliente Uno" },
          eventType: { id: 1, name: "Social" },
          startsAt: new Date("2026-11-20T15:00:00Z"),
          endsAt: new Date("2026-11-20T18:00:00Z"),
          attendees: 50,
        },
      ];
      mockDb.event.findMany.mockResolvedValue(mockEventos);

      const response = await request(app)
        .get(`/api/v1/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Evento en periodo");
      expect(response.body[0].startsAt).toBe("2026-11-20T15:00:00.000Z");
      expect(response.body[0].endsAt).toBe("2026-11-20T18:00:00.000Z");
      expect(mockDb.event.findMany).toHaveBeenCalledWith({
        where: {
          startsAt: { lt: new Date(to) },
          endsAt: { gt: new Date(from) },
        },
        include: {
          client: { select: { id: true, name: true } },
          eventType: { select: { id: true, name: true } },
        },
        orderBy: { startsAt: "asc" },
      });
    });

    it("rechaza con 400 si se envía from pero falta to", async () => {
      const response = await request(app).get("/api/v1/events?from=2026-11-20T00:00:00.000Z");
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("El periodo de consulta debe tener fechas 'from' y 'to' válidas");
    });

    it("rechaza con 400 si to es igual o anterior a from", async () => {
      const response = await request(app)
        .get("/api/v1/events?from=2026-11-20T18:00:00.000Z&to=2026-11-20T17:00:00.000Z");
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("El periodo de consulta debe tener fechas 'from' y 'to' válidas");
    });

    it("rechaza con 400 si from no es una fecha válida", async () => {
      const response = await request(app)
        .get("/api/v1/events?from=invalido&to=2026-11-20T17:00:00.000Z");
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("La fecha de inicio 'from' no es válida");
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

  describe("PATCH /api/v1/events/:id", () => {
    const existingEvento = {
      id: 5,
      title: "Gala Original",
      clientId: "client-1",
      eventTypeId: 2,
      startsAt: new Date("2026-11-20T18:00:00.000Z"),
      endsAt: new Date("2026-11-20T23:00:00.000Z"),
      attendees: 100,
      location: "Salón A",
      needs: "Audio básico",
    };

    it("actualiza un evento exitosamente (200) manteniendo el mismo ID y relaciones", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.event.update.mockResolvedValue({
        ...existingEvento,
        title: "Gala Editada",
        attendees: 120,
        client: { id: "client-1", name: "Empresa Uno" },
        eventType: { id: 2, name: "Social" },
      });

      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ title: "Gala Editada", attendees: 120 });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(5);
      expect(response.body.title).toBe("Gala Editada");
      expect(response.body.attendees).toBe(120);
      expect(mockDb.event.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: expect.objectContaining({ title: "Gala Editada", attendees: 120 }),
        include: {
          client: { select: { id: true, name: true } },
          eventType: { select: { id: true, name: true } },
        },
      });
    });

    it("devuelve 404 si el evento no existe", async () => {
      mockDb.event.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch("/api/v1/events/999")
        .set("Origin", webOrigin)
        .send({ title: "Nuevo Título" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Evento no encontrado");
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("devuelve 404 si se intenta cambiar a un cliente inexistente", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.client.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ clientId: "cliente-inexistente" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Cliente no encontrado");
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("devuelve 404 si se intenta cambiar a un tipo de evento inexistente", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.eventType.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ eventTypeId: 999 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Tipo de evento no encontrado");
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("rechaza con 400 si el ID en la URL no es un número entero válido", async () => {
      const response = await request(app)
        .patch("/api/v1/events/no-es-numero")
        .set("Origin", webOrigin)
        .send({ title: "Nuevo Título" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("ID de evento inválido");
    });

    it("rechaza con 400 si el título editado tiene menos de 3 caracteres", async () => {
      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ title: "ab" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("El título debe tener al menos 3 caracteres");
    });

    it("rechaza con 400 si la fecha de término es anterior al inicio al editar fechas", async () => {
      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({
          startsAt: "2026-11-20T21:00:00.000Z",
          endsAt: "2026-11-20T19:00:00.000Z",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("La fecha de término debe ser posterior al inicio");
    });

    it("rechaza con 409 al editar si el nuevo horario o espacio colisiona con otro evento", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.event.findFirst.mockResolvedValue({
        id: 77,
        title: "Evento Colisionante",
        location: "Salón A",
        startsAt: new Date("2026-11-20T19:00:00.000Z"),
        endsAt: new Date("2026-11-20T22:00:00.000Z"),
      });

      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ location: "Salón A", startsAt: "2026-11-20T19:30:00.000Z" });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("Conflicto de programación");
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("permite editar sin cambiar horario ni espacio sin colisionar consigo mismo (200)", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.event.findFirst.mockResolvedValue(null);
      mockDb.event.update.mockResolvedValue({
        ...existingEvento,
        title: "Nuevo Título Mismo Horario",
        client: { id: "client-1", name: "Empresa Uno" },
        eventType: { id: 2, name: "Social" },
      });

      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ title: "Nuevo Título Mismo Horario" });

      expect(response.status).toBe(200);
      expect(mockDb.event.update).toHaveBeenCalled();
    });
  });
});
