import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { updateEvento, coordinarReprogramacion } from "../services/eventos.service.js";

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

  describe("GET /api/v1/events/public", () => {
    it("retorna exclusivamente campos públicos autorizados y no expone clientes, notas o asistentes (200)", async () => {
      const mockPublicEventos = [
        {
          id: 1,
          title: "Festival Abierto",
          startsAt: new Date("2026-12-01T10:00:00Z"),
          endsAt: new Date("2026-12-01T12:00:00Z"),
          location: "Parque Central",
          eventType: { id: 1, name: "Comunitario" },
        },
      ];
      mockDb.event.findMany.mockResolvedValue(mockPublicEventos);

      const response = await request(app).get("/api/v1/events/public");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      const ev = response.body[0];
      expect(ev.title).toBe("Festival Abierto");
      expect(ev.location).toBe("Parque Central");
      expect(ev.client).toBeUndefined();
      expect(ev.clientId).toBeUndefined();
      expect(ev.needs).toBeUndefined();
      expect(ev.attendees).toBeUndefined();
      expect(mockDb.event.findMany).toHaveBeenCalledWith({
        where: {},
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          location: true,
          eventType: { select: { id: true, name: true } },
        },
        orderBy: { startsAt: "asc" },
      });
    });

    it("filtra eventos públicos por periodo semiabierto (200)", async () => {
      const from = "2026-12-01T00:00:00.000Z";
      const to = "2026-12-02T00:00:00.000Z";
      mockDb.event.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/v1/events/public?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

      expect(response.status).toBe(200);
      expect(mockDb.event.findMany).toHaveBeenCalledWith({
        where: {
          startsAt: { lt: new Date(to) },
          endsAt: { gt: new Date(from) },
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          location: true,
          eventType: { select: { id: true, name: true } },
        },
        orderBy: { startsAt: "asc" },
      });
    });

    it("valida periodos en la consulta pública y rechaza rango invertido con 400", async () => {
      const response = await request(app)
        .get("/api/v1/events/public?from=2026-12-01T15:00:00.000Z&to=2026-12-01T10:00:00.000Z");
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("El periodo de consulta debe tener fechas 'from' y 'to' válidas");
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

    it("rechaza con 400 y no toca la base de datos si el ID tiene sufijo alfanumérico (ej: 5abc)", async () => {
      const response = await request(app)
        .patch("/api/v1/events/5abc")
        .set("Origin", webOrigin)
        .send({ title: "Título de prueba" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("ID de evento inválido");
      expect(mockDb.event.findUnique).not.toHaveBeenCalled();
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("rechaza con 400 si el ID tiene decimales (ej: 5.5)", async () => {
      const response = await request(app)
        .patch("/api/v1/events/5.5")
        .set("Origin", webOrigin)
        .send({ title: "Título de prueba" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("ID de evento inválido");
      expect(mockDb.event.findUnique).not.toHaveBeenCalled();
    });

    it("rechaza con 400 si el ID es 0 o negativo", async () => {
      const resZero = await request(app)
        .patch("/api/v1/events/0")
        .set("Origin", webOrigin)
        .send({ title: "Título de prueba" });
      expect(resZero.status).toBe(400);
      expect(resZero.body.message).toBe("ID de evento inválido");

      const resNeg = await request(app)
        .patch("/api/v1/events/-1")
        .set("Origin", webOrigin)
        .send({ title: "Título de prueba" });
      expect(resNeg.status).toBe(400);
      expect(resNeg.body.message).toBe("ID de evento inválido");
      expect(mockDb.event.findUnique).not.toHaveBeenCalled();
    });

    it("rechaza con 400 si el ID está fuera del rango entero de 32 bits", async () => {
      const response = await request(app)
        .patch("/api/v1/events/99999999999999999999")
        .set("Origin", webOrigin)
        .send({ title: "Título de prueba" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("ID de evento fuera de rango");
      expect(mockDb.event.findUnique).not.toHaveBeenCalled();
    });

    it("ejecuta bloqueo de fila FOR UPDATE antes de consultar y validar el evento", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.event.findFirst.mockResolvedValue(null);
      mockDb.event.update.mockResolvedValue({
        ...existingEvento,
        title: "Edición Protegida",
        client: { id: "client-1", name: "Empresa Uno" },
        eventType: { id: 2, name: "Social" },
      });

      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ title: "Edición Protegida" });

      expect(response.status).toBe(200);
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });

    it("detecta conflicto de espacio usando identidad canónica estable (acentos y espacios redundantes)", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.event.findFirst.mockResolvedValue(null);
      mockDb.event.findMany.mockResolvedValue([
        {
          id: 88,
          title: "Evento en Salón",
          location: "Salón Principal",
          startsAt: new Date("2026-11-20T19:00:00.000Z"),
          endsAt: new Date("2026-11-20T22:00:00.000Z"),
        },
      ]);

      // Se envía con escritura libre distinta: sin tilde y con espacios adicionales "salon   principal"
      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ location: "  salon   principal  ", startsAt: "2026-11-20T19:30:00.000Z" });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("Conflicto de programación");
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("propaga el error si falla el bloqueo de PostgreSQL en lugar de silenciarlo", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.$queryRaw.mockRejectedValue(new Error("Deadlock detected in lock"));

      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ title: "Edición con fallo de bloqueo" });

      expect(response.status).toBe(500);
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("rechaza la reprogramación completa si el validador de recursos asignados falla", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      const onScheduleChangeMock = vi.fn().mockRejectedValue(new Error("Conflicto de equipos: equipo asignado no disponible"));

      await expect(
        updateEvento(
          mockDb,
          5,
          { startsAt: "2026-11-21T18:00:00.000Z", endsAt: "2026-11-21T23:00:00.000Z" },
          { onScheduleChange: onScheduleChangeMock }
        )
      ).rejects.toThrow("Conflicto de equipos: equipo asignado no disponible");

      expect(onScheduleChangeMock).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          eventId: 5,
          expectedSchedule: {
            startsAt: existingEvento.startsAt,
            endsAt: existingEvento.endsAt,
          },
          newSchedule: {
            startsAt: new Date("2026-11-21T18:00:00.000Z"),
            endsAt: new Date("2026-11-21T23:00:00.000Z"),
          },
        })
      );
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("permite omitir el bloqueo inicial del evento si un coordinador externo ya adquirió los bloqueos en orden (skipEventLock)", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.event.update.mockResolvedValue({
        ...existingEvento,
        title: "Reprogramado por Coordinador",
      });

      const onScheduleChangeMock = vi.fn().mockResolvedValue(true);

      await updateEvento(
        mockDb,
        5,
        {
          title: "Reprogramado por Coordinador",
          startsAt: "2026-11-21T18:00:00.000Z",
          endsAt: "2026-11-21T23:00:00.000Z",
        },
        {
          skipEventLock: true,
          onScheduleChange: onScheduleChangeMock,
        }
      );

      // No debe haber llamado al SELECT FOR UPDATE del evento al inicio porque el coordinador externo ya lo adquirió
      expect(mockDb.$queryRaw).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining("FOR UPDATE")])
      );
      expect(onScheduleChangeMock).toHaveBeenCalled();
      expect(mockDb.event.update).toHaveBeenCalled();
    });

    it("responde 409 y no modifica el evento si se intenta cambiar el horario sin validador de recursos conectado", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);

      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ startsAt: "2026-11-21T18:00:00.000Z", endsAt: "2026-11-21T23:00:00.000Z" });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("No se puede cambiar el horario sin validar las asignaciones de equipos");
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("rechaza con 400 si el cliente intenta inyectar campos no reconocidos o de estado comercial (status, etc.)", async () => {
      const response = await request(app)
        .patch("/api/v1/events/5")
        .set("Origin", webOrigin)
        .send({ status: "CONFIRMADO" });

      expect(response.status).toBe(400);
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });
  });

  describe("Coordinador de Reprogramación (coordinarReprogramacion)", () => {
    const existingEvento = {
      id: 10,
      title: "Concierto Primavera",
      clientId: "client-1",
      eventTypeId: 2,
      startsAt: new Date("2026-11-20T18:00:00.000Z"),
      endsAt: new Date("2026-11-20T23:00:00.000Z"),
      attendees: 100,
      location: "Teatro Municipal",
      needs: "Sonido en vivo",
    };

    const validInput = {
      expectedStartsAt: "2026-11-20T18:00:00.000Z",
      expectedEndsAt: "2026-11-20T23:00:00.000Z",
      startsAt: "2026-11-21T18:00:00.000Z",
      endsAt: "2026-11-21T23:00:00.000Z",
      assignments: [
        {
          id: "asig-1",
          expectedStartsAt: "2026-11-20T17:00:00.000Z",
          expectedEndsAt: "2026-11-21T00:00:00.000Z",
          startsAt: "2026-11-21T17:00:00.000Z",
          endsAt: "2026-11-22T00:00:00.000Z",
        },
      ],
    };

    it("rechaza con 409 si la función de reprogramación de Recursos no está provista o disponible", async () => {
      await expect(
        coordinarReprogramacion(mockDb, 10, validInput)
      ).rejects.toThrow("La integración con Recursos y operación no está disponible");
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("ejecuta la coordinación exitosamente respetando el orden y propagando la transacción", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      mockDb.event.update.mockResolvedValue({
        ...existingEvento,
        startsAt: new Date(validInput.startsAt),
        endsAt: new Date(validInput.endsAt),
      });

      const mockPlan = {
        assignments: [{ id: "asig-1", startsAt: new Date(validInput.assignments[0].startsAt) }],
      };
      const reprogramarFnMock = vi.fn().mockResolvedValue(mockPlan);

      const result = await coordinarReprogramacion(mockDb, 10, validInput, {
        reprogramarAsignacionesFn: reprogramarFnMock,
      });

      // 1. Debe haber llamado primero a reprogramarAsignaciones con la misma tx y el payload exacto
      expect(reprogramarFnMock).toHaveBeenCalledWith(
        mockDb,
        10,
        expect.objectContaining({
          expectedStartsAt: validInput.expectedStartsAt,
          expectedEndsAt: validInput.expectedEndsAt,
          startsAt: validInput.startsAt,
          endsAt: validInput.endsAt,
          assignments: validInput.assignments,
        })
      );

      // 2. No debe haber llamado al SELECT FOR UPDATE redundante de eventos al inicio
      expect(mockDb.$queryRaw).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining("FOR UPDATE")])
      );

      // 3. El evento debe haberse actualizado
      expect(mockDb.event.update).toHaveBeenCalled();
      expect(result.event).toBeDefined();
      expect(result.recursosPlan).toBe(mockPlan);
    });

    it("revierte y rechaza si el servicio de Recursos detecta conflicto o falla", async () => {
      const reprogramarFnMock = vi.fn().mockRejectedValue(new Error("Conflicto de equipos: equipo no disponible"));

      await expect(
        coordinarReprogramacion(mockDb, 10, validInput, {
          reprogramarAsignacionesFn: reprogramarFnMock,
        })
      ).rejects.toThrow("Conflicto de equipos: equipo no disponible");

      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("revierte si las fechas esperadas no coinciden con las registradas en el evento (datos desactualizados)", async () => {
      mockDb.event.findUnique.mockResolvedValue({
        ...existingEvento,
        startsAt: new Date("2026-11-20T19:00:00.000Z"), // Discrepancia con expectedStartsAt
      });

      const reprogramarFnMock = vi.fn().mockResolvedValue({ assignments: [] });

      await expect(
        coordinarReprogramacion(mockDb, 10, validInput, {
          reprogramarAsignacionesFn: reprogramarFnMock,
        })
      ).rejects.toThrow("Las fechas esperadas no coinciden con las registradas en el evento");

      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it("revierte la transacción si Eventos detecta conflicto de espacio posterior a Recursos", async () => {
      mockDb.event.findUnique.mockResolvedValue(existingEvento);
      // Simula conflicto en el espacio con otro evento
      mockDb.event.findFirst.mockResolvedValue({
        id: 99,
        title: "Otro Evento Ocupando Teatro",
        location: "Teatro Municipal",
        startsAt: new Date("2026-11-21T18:00:00.000Z"),
        endsAt: new Date("2026-11-21T23:00:00.000Z"),
      });

      const reprogramarFnMock = vi.fn().mockResolvedValue({ assignments: [] });

      await expect(
        coordinarReprogramacion(
          mockDb,
          10,
          { ...validInput, location: "Teatro Municipal" },
          { reprogramarAsignacionesFn: reprogramarFnMock }
        )
      ).rejects.toThrow("Conflicto de programación: el espacio «Teatro Municipal»");

      expect(mockDb.event.update).not.toHaveBeenCalled();
    });
  });
});

