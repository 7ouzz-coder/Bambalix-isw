import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const cotizacionMock = {
  id: "quote_100",
  code: "COT-2026-100",
  total: 500000,
  status: "APROBADA",
  payments: [
    { id: "pay_prev_1", amount: 200000, status: "VERIFICADO", method: "TRANSFERENCIA" },
  ],
};

function setup() {
  const db = {
    quote: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id === "quote_100") return cotizacionMock;
        return null;
      }),
    },
    payment: {
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: "pay_new_1",
        ...data,
      })),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id === "pay_registrado") {
          return {
            id: "pay_registrado",
            quoteId: "quote_100",
            amount: 150000,
            method: "TRANSFERENCIA",
            status: "REGISTRADO",
            quote: cotizacionMock,
          };
        }
        if (where.id === "pay_ya_verificado") {
          return {
            id: "pay_ya_verificado",
            quoteId: "quote_100",
            amount: 200000,
            method: "TRANSFERENCIA",
            status: "VERIFICADO",
            quote: cotizacionMock,
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

describe("Requisito 3: Registrar y verificar pagos", () => {
  describe("Registro de recepción (POST /api/v1/payments)", () => {
    it("registra la recepción de un pago en efectivo con estado REGISTRADO", async () => {
      const { api, db } = setup();

      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_100",
        method: "efectivo",
        amount: 100000,
        reference: "Recibo de caja #4521",
        registeredBy: "Recepción Vitacura",
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("REGISTRADO");
      expect(response.body.amount).toBe(100000);
      expect(response.body.method).toBe("EFECTIVO");
      expect(db.payment.create).toHaveBeenCalled();
    });

    it("registra la recepción de un pago por transferencia", async () => {
      const { api, db } = setup();

      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_100",
        method: "transferencia",
        amount: 150000,
        reference: "Transf. BancoEstado #987654321",
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("REGISTRADO");
      expect(response.body.method).toBe("TRANSFERENCIA");
    });

    it("rechaza métodos no permitidos (ej. pasarelas externas no autorizadas)", async () => {
      const { api } = setup();

      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_100",
        method: "webpay_plus",
        amount: 50000,
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("EFECTIVO o TRANSFERENCIA");
    });

    it("rechaza montos negativos o cero", async () => {
      const { api } = setup();

      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_100",
        method: "efectivo",
        amount: 0,
      });

      expect(response.status).toBe(400);
    });

    it("rechaza si el monto excede el saldo pendiente de la cotización", async () => {
      const { api, db } = setup();
      // Total es 500.000, ya hay 200.000 verificados -> saldo pendiente es 300.000
      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_100",
        method: "efectivo",
        amount: 300001, // Supera por 1 peso
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("supera el saldo pendiente");
      expect(db.payment.create).not.toHaveBeenCalled();
    });

    it("retorna 404 si la cotización no existe", async () => {
      const { api } = setup();

      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_inexistente",
        method: "efectivo",
        amount: 50000,
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("Cotización no encontrada");
    });
  });

  describe("Verificación de pagos (POST /api/v1/payments/:id/verify)", () => {
    it("verifica un pago registrado y registra fecha y verificador", async () => {
      const { api, db } = setup();

      const response = await api
        .post("/api/v1/payments/pay_registrado/verify")
        .set("x-user-name", "Tesorera Maria")
        .send({});

      expect(response.status).toBe(200);
      expect(db.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay_registrado" },
          data: expect.objectContaining({
            status: "VERIFICADO",
            verifiedBy: "Tesorera Maria",
          }),
        })
      );
    });

    it("impide que un mismo pago se contabilice o verifique dos veces", async () => {
      const { api, db } = setup();

      // Intento de verificar un pago que ya está VERIFICADO
      const response = await api
        .post("/api/v1/payments/pay_ya_verificado/verify")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("ya fue verificado previamente");
      expect(db.payment.update).not.toHaveBeenCalled();
    });

    it("retorna 404 si el registro de pago no existe", async () => {
      const { api } = setup();

      const response = await api.post("/api/v1/payments/pay_fantasma/verify").send({});
      expect(response.status).toBe(404);
    });
  });

  describe("Resumen financiero y saldos (GET /api/v1/payments/quote/:quoteId/summary)", () => {
    it("calcula saldos considerando solo los pagos verificados", async () => {
      const { api } = setup();

      const response = await api.get("/api/v1/payments/quote/quote_100/summary");

      expect(response.status).toBe(200);
      expect(response.body.totalCotizacion).toBe(500000);
      expect(response.body.totalVerificado).toBe(200000);
      expect(response.body.saldoPendiente).toBe(300000);
      expect(response.body.estadoFinanciero).toBe("ABONADO");
    });
  });
});
