import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { quoteService } from "../src/services/cotizaciones.service.js";

afterEach(() => vi.restoreAllMocks());

const clienteMock = {
  id: "cli_100",
  name: "Empresa Eventos",
  email: "contacto@eventos.cl",
};
const eventoMock = {
  id: 200,
  title: "Aniversario Corporativo",
  clientId: "cli_100",
};
const eventoOtroCliente = { id: 300, title: "Boda Juan", clientId: "cli_otro" };

function setup() {
  const db = {
    $transaction: vi.fn().mockImplementation(async (callback) => {
      return callback(db);
    }),
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
        items: data.items.create.map((it, idx) => ({
          id: `item_${idx + 1}`,
          ...it,
        })),
      })),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id === "quote_borrador") {
          return {
            id: "quote_borrador",
            code: "COT-2026-1001",
            clientId: "cli_100",
            eventId: 200,
            status: "BORRADOR",
            total: 350000,
            notes: "Notas comerciales",
            client: clienteMock,
            event: eventoMock,
            items: [],
          };
        }
        if (where.id === "quote_en_revision") {
          return {
            id: "quote_en_revision",
            code: "COT-2026-1002",
            clientId: "cli_100",
            eventId: 200,
            status: "EN_REVISION",
            total: 350000,
            client: clienteMock,
            event: eventoMock,
            items: [],
          };
        }
        if (where.id === "quote_aprobada") {
          return {
            id: "quote_aprobada",
            code: "COT-2026-1003",
            clientId: "cli_100",
            eventId: 200,
            status: "APROBADA",
            total: 350000,
            client: clienteMock,
            event: eventoMock,
            items: [],
          };
        }
        return null;
      }),
      updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
        // Simular updateMany condicional estricto
        if (where.id === "quote_borrador" && where.status === "BORRADOR") {
          return { count: 1 };
        }
        if (
          where.id === "quote_en_revision" &&
          where.status === "EN_REVISION"
        ) {
          return { count: 1 };
        }
        return { count: 0 };
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({
        id: where.id,
        ...data,
      })),
    },
  };

  return {
    db,
    api: request(createApp({ db, webOrigin: "http://localhost:3000" })),
  };
}

describe("Requisito 2: Elaboración de cotizaciones", () => {
  describe("Creación y cálculo estricto en backend (POST /api/v1/quotes)", () => {
    it("crea cotización calculando el total de los ítems en backend", async () => {
      const { api, db } = setup();

      const payload = {
        clientId: "cli_100",
        eventId: 200,
        notes: "Cotización para congreso anual",
        items: [
          {
            concept: "Consola de iluminación DMX",
            quantity: 2,
            unitPrice: 45000,
          },
          { concept: "Foco Par LED 54x3W", quantity: 4, unitPrice: 15000 },
        ],
      };

      const response = await api.post("/api/v1/quotes").send(payload);

      expect(response.status).toBe(201);
      // (2 * 45000) + (4 * 15000) = 150000
      expect(response.body.total).toBe("150000");
      expect(response.body.status).toBe("BORRADOR");
      expect(db.$transaction).toHaveBeenCalled();
    });

    it("atrapa y rechaza montos que desbordan el límite Decimal de PostgreSQL", async () => {
      const { api, db } = setup();

      const payload = {
        clientId: "cli_100",
        eventId: 200,
        items: [
          // Cantidad enorme con precio enorme que desborda 9999999999.99
          { concept: "Item desbordante", quantity: 1, unitPrice: 100000000000 },
        ],
      };

      const response = await api.post("/api/v1/quotes").send(payload);
      expect(response.status).toBe(400);
      expect(db.quote.create).not.toHaveBeenCalled();
    });

    it("rechaza si el cliente o evento no existen o no coinciden", async () => {
      const { api } = setup();

      const resCliente = await api.post("/api/v1/quotes").send({
        clientId: "cli_inexistente",
        eventId: 200,
        items: [{ concept: "Parlante", quantity: 1, unitPrice: 50000 }],
      });
      expect(resCliente.status).toBe(404);

      const resCruce = await api.post("/api/v1/quotes").send({
        clientId: "cli_100",
        eventId: 300, // Evento de cli_otro
        items: [{ concept: "Parlante", quantity: 1, unitPrice: 50000 }],
      });
      expect(resCruce.status).toBe(400);
      expect(resCruce.body.message).toContain("no pertenece al cliente");
    });
  });

  describe("Precisión monetaria y códigos comerciales", () => {
    const payload = {
      clientId: "cli_100",
      eventId: 200,
      items: [{ concept: "Servicio de sonido", quantity: 3, unitPrice: 0.1 }],
    };

    it("conserva exactamente 3 por 0.10 sin redondear precios de entrada", async () => {
      const { api } = setup();
      const response = await api.post("/api/v1/quotes").send(payload);
      expect(response.status).toBe(201);
      expect(response.body.total).toBe("0.3");
      expect(response.body.items[0].subtotal).toBe("0.3");
      expect(response.body.items[0].unitPrice).toBe("0.1");
    });

    it.each([0.001, 1.005, -1])(
      "rechaza un precio inválido %s antes de escribir",
      async (unitPrice) => {
        const { api, db } = setup();
        const response = await api
          .post("/api/v1/quotes")
          .send({ ...payload, items: [{ ...payload.items[0], unitPrice }] });
        expect(response.status).toBe(400);
        expect(db.quote.create).not.toHaveBeenCalled();
      },
    );

    it("rechaza un total fuera de la columna aunque el precio individual sea válido", async () => {
      const { api, db } = setup();
      const response = await api
        .post("/api/v1/quotes")
        .send({
          ...payload,
          items: [
            { ...payload.items[0], unitPrice: 999999999.99, quantity: 11 },
          ],
        });
      expect(response.status).toBe(400);
      expect(db.quote.create).not.toHaveBeenCalled();
    });

    it("acepta un importe cercano al máximo sin perder centavos", async () => {
      const { api } = setup();
      const response = await api
        .post("/api/v1/quotes")
        .send({
          ...payload,
          items: [
            { ...payload.items[0], unitPrice: 999999999.99, quantity: 10 },
          ],
        });
      expect(response.status).toBe(201);
      expect(response.body.total).toBe("9999999999.9");
    });

    it("genera otro código al encontrar un duplicado y abre una transacción nueva", async () => {
      const { api, db } = setup();
      vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.5);
      db.quote.create.mockRejectedValueOnce({
        code: "P2002",
        meta: { target: ["code"] },
      });
      const response = await api.post("/api/v1/quotes").send(payload);
      expect(response.status).toBe(201);
      expect(db.$transaction).toHaveBeenCalledTimes(2);
      const codes = db.quote.create.mock.calls.map(([args]) => args.data.code);
      expect(codes[0]).not.toBe(codes[1]);
      expect(response.body.code).toBe(codes[1]);
    });

    it("limita los intentos de código y devuelve un conflicto recuperable", async () => {
      const { api, db } = setup();
      db.quote.create.mockRejectedValue({
        code: "P2002",
        meta: { target: ["code"] },
      });
      const response = await api.post("/api/v1/quotes").send(payload);
      expect(response.status).toBe(409);
      expect(response.body.message).toContain("código único");
      expect(db.quote.create).toHaveBeenCalledTimes(3);
    });

    it("no reintenta errores de unicidad ajenos al código", async () => {
      const { api, db } = setup();
      db.quote.create.mockRejectedValue({
        code: "P2002",
        meta: { target: ["id"] },
      });
      const response = await api.post("/api/v1/quotes").send(payload);
      expect(response.status).toBe(409);
      expect(db.quote.create).toHaveBeenCalledTimes(1);
    });

    it("no acepta un total enviado por el navegador", async () => {
      const { api, db } = setup();
      const response = await api
        .post("/api/v1/quotes")
        .send({ ...payload, total: 1 });
      expect(response.status).toBe(400);
      expect(db.quote.create).not.toHaveBeenCalled();
    });
  });

  describe("Máquina de estados estricta y concurrencia", () => {
    it("permite pasar de BORRADOR a EN_REVISION de forma segura", async () => {
      const { api, db } = setup();
      const response = await api.post(
        "/api/v1/quotes/quote_borrador/submit-review",
      );
      expect(response.status).toBe(200);
      expect(db.quote.updateMany).toHaveBeenCalledWith({
        where: { id: "quote_borrador", status: "BORRADOR" },
        data: { status: "EN_REVISION" },
      });
    });

    it("rechaza enviar a revisión una cotización que ya no está en BORRADOR (protección concurrente)", async () => {
      const { api } = setup();
      // quote_en_revision ya está en EN_REVISION, no debe poder enviarse de nuevo
      const response = await api.post(
        "/api/v1/quotes/quote_en_revision/submit-review",
      );
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Transición inválida");
    });

    it("prohíbe terminantemente saltar directamente de BORRADOR a APROBADA", async () => {
      const { api } = setup();
      // Intento de aprobar quote_borrador (debe fallar la transición)
      const response = await api.post("/api/v1/quotes/quote_borrador/approve");
      // Debe fallar con 403 (falta auth de gerente) o 400 (transición inválida)
      expect([400, 403]).toContain(response.status);
    });
  });

  describe("Aprobación gerencial y autenticación segura", () => {
    it("deniega la aprobación si se intentan inyectar cabeceras simuladas (x-user-role)", async () => {
      const { api, db } = setup();
      const response = await api
        .post("/api/v1/quotes/quote_en_revision/approve")
        .set("x-user-role", "gerente")
        .set("x-user-name", "Hacker")
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.message).toContain(
        "no se permite la simulación de permisos mediante cabeceras",
      );
      expect(db.quote.updateMany).not.toHaveBeenCalled();
    });

    it("deniega por defecto si no existe sesión autenticada en el servidor", async () => {
      const { api, db } = setup();
      const response = await api
        .post("/api/v1/quotes/quote_en_revision/approve")
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Aprobación bloqueada");
      expect(db.quote.updateMany).not.toHaveBeenCalled();
    });
  });
});
