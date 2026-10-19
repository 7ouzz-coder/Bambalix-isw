import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const clienteMock = { id: "cli_100", name: "Empresa Eventos", email: "contacto@eventos.cl" };
const eventoMock = { id: 200, title: "Aniversario Corporativo", clientId: "cli_100" };
const eventoOtroCliente = { id: 300, title: "Boda Juan", clientId: "cli_otro" };

function setup() {
  const db = {
    client: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id === "cli_100") return clienteMock;
        return null;
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    event: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id === 200) return eventoMock;
        if (where.id === 300) return eventoOtroCliente;
        return null;
      }),
    },
    quote: {
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: "quote_1",
        code: data.code,
        clientId: data.clientId,
        eventId: data.eventId,
        status: data.status,
        total: data.total,
        notes: data.notes,
        items: data.items.create.map((it, idx) => ({ id: `item_${idx + 1}`, ...it })),
      })),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id === "quote_1") {
          return {
            id: "quote_1",
            code: "COT-2026-1001",
            clientId: "cli_100",
            eventId: 200,
            status: "BORRADOR",
            total: 350000,
            notes: "Notas comerciales",
            client: clienteMock,
            event: eventoMock,
            items: [
              { id: "item_1", concept: "Sistema de sonido profesional", quantity: 1, unitPrice: 200000, subtotal: 200000 },
              { id: "item_2", concept: "Microfonía inalámbrica", quantity: 2, unitPrice: 75000, subtotal: 150000 },
            ],
          };
        }
        return null;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({
        id: where.id,
        ...data,
      })),
    },
  };

  return { db, api: request(createApp({ db, webOrigin: "http://localhost:3000" })) };
}

describe("Requisito 2: Elaboración de cotizaciones", () => {
  describe("Creación y cálculo estricto en backend (POST /api/v1/quotes)", () => {
    it("crea una cotización válida calculando el total exacto en backend (precios ya con IVA)", async () => {
      const { api, db } = setup();

      const payload = {
        clientId: "cli_100",
        eventId: 200,
        notes: "Cotización para congreso anual",
        // Intentar enviar datos manipulados desde el cliente (approved, status o total falso)
        status: "APROBADA",
        approved: true,
        total: 1, // Total falso enviado por navegador
        items: [
          { concept: "Consola de iluminación DMX", quantity: 2, unitPrice: 45000 },
          { concept: "Foco Par LED 54x3W", quantity: 4, unitPrice: 15000 },
        ],
      };

      const response = await api.post("/api/v1/quotes").send(payload);

      expect(response.status).toBe(201);
      // El total exacto debe ser (2 * 45000) + (4 * 15000) = 90000 + 60000 = 150000
      expect(response.body.total).toBe(150000);
      // El estado inicial debe ser estrictamente BORRADOR ignorando approved: true
      expect(response.body.status).toBe("BORRADOR");
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0].subtotal).toBe(90000);
      expect(response.body.items[1].subtotal).toBe(60000);
      expect(db.quote.create).toHaveBeenCalled();
    });

    it("rechaza si el cliente no existe", async () => {
      const { api } = setup();
      const response = await api.post("/api/v1/quotes").send({
        clientId: "cli_inexistente",
        eventId: 200,
        items: [{ concept: "Parlante", quantity: 1, unitPrice: 50000 }],
      });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain("Cliente no encontrado");
    });

    it("rechaza si el evento no existe", async () => {
      const { api } = setup();
      const response = await api.post("/api/v1/quotes").send({
        clientId: "cli_100",
        eventId: 99999,
        items: [{ concept: "Parlante", quantity: 1, unitPrice: 50000 }],
      });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain("Evento no encontrado");
    });

    it("rechaza si el evento pertenece a otro cliente distinto", async () => {
      const { api } = setup();
      const response = await api.post("/api/v1/quotes").send({
        clientId: "cli_100",
        eventId: 300, // Evento de cli_otro
        items: [{ concept: "Parlante", quantity: 1, unitPrice: 50000 }],
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("no pertenece al cliente");
    });

    it("rechaza si no se incluye ningún ítem", async () => {
      const { api } = setup();
      const response = await api.post("/api/v1/quotes").send({
        clientId: "cli_100",
        eventId: 200,
        items: [],
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("al menos un ítem");
    });

    it("rechaza ítem con cantidad menor a 1 o precio negativo", async () => {
      const { api } = setup();
      const response = await api.post("/api/v1/quotes").send({
        clientId: "cli_100",
        eventId: 200,
        items: [{ concept: "Generador", quantity: 0, unitPrice: -5000 }],
      });
      expect(response.status).toBe(400);
    });
  });

  describe("Listado y detalle (GET /api/v1/quotes)", () => {
    it("obtiene el listado de cotizaciones", async () => {
      const { api } = setup();
      const response = await api.get("/api/v1/quotes");
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("obtiene el detalle de una cotización con sus ítems", async () => {
      const { api } = setup();
      const response = await api.get("/api/v1/quotes/quote_1");
      expect(response.status).toBe(200);
      expect(response.body.id).toBe("quote_1");
      expect(response.body.items).toHaveLength(2);
    });

    it("retorna 404 para una cotización inexistente", async () => {
      const { api } = setup();
      const response = await api.get("/api/v1/quotes/quote_999");
      expect(response.status).toBe(404);
    });
  });

  describe("Envío a revisión (POST /api/v1/quotes/:id/submit-review)", () => {
    it("pasa una cotización de BORRADOR a EN_REVISION", async () => {
      const { api, db } = setup();
      const response = await api.post("/api/v1/quotes/quote_1/submit-review");
      expect(response.status).toBe(200);
      expect(db.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "quote_1" },
          data: { status: "EN_REVISION" },
        })
      );
    });
  });

  describe("Aprobación por parte del gerente (POST /api/v1/quotes/:id/approve)", () => {
    it("deniega aprobación con 403 si el usuario no tiene rol de gerente", async () => {
      const { api, db } = setup();
      // Sin headers de gerente
      const response = await api
        .post("/api/v1/quotes/quote_1/approve")
        .set("x-user-role", "operador")
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("solo un usuario con rol de gerente");
      expect(db.quote.update).not.toHaveBeenCalled();
    });

    it("aprueba la cotización exitosamente si el usuario es gerente autenticado", async () => {
      const { api, db } = setup();
      const response = await api
        .post("/api/v1/quotes/quote_1/approve")
        .set("x-user-role", "gerente")
        .set("x-user-name", "Gabriel Garcia")
        .send({});

      expect(response.status).toBe(200);
      expect(db.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "quote_1" },
          data: expect.objectContaining({
            status: "APROBADA",
            approvedBy: "Gabriel Garcia",
          }),
        })
      );
    });
  });
});
