import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { paymentService } from "../src/services/pagos.service.js";

const cotizacionMock = {
  id: "quote_100",
  code: "COT-2026-100",
  total: 500000,
  status: "APROBADA",
  payments: [
    {
      id: "pay_prev_1",
      amount: 200000,
      status: "VERIFICADO",
      method: "TRANSFERENCIA",
    },
    {
      id: "pay_prev_2",
      amount: 50000,
      status: "REGISTRADO",
      method: "EFECTIVO",
    }, // no verificado
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
      updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
        if (where.id === "pay_registrado" && where.status === "REGISTRADO") {
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
  };

  db.$queryRaw = vi.fn().mockResolvedValue([{ id: "quote_100" }]);
  db.$transaction = vi.fn((callback) => callback(db));

  return {
    db,
    api: request(createApp({ db, webOrigin: "http://localhost:3000" })),
  };
}

describe("Requisito 3: Registrar y verificar pagos", () => {
  describe("Registro de recepción (POST /api/v1/payments)", () => {
    it("registra pago en efectivo con estado REGISTRADO sin alterar saldo disponible aún", async () => {
      const { api, db } = setup();

      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_100",
        method: "efectivo",
        amount: 100000,
        reference: "Recibo caja #4521",
        registeredBy: "Recepción",
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("REGISTRADO");
      expect(response.body.amount).toBe("100000");
      expect(response.body.method).toBe("EFECTIVO");
      expect(db.payment.create).toHaveBeenCalled();
    });

    it("rechaza métodos no permitidos como pasarelas bancarias o tarjetas de crédito", async () => {
      const { api } = setup();

      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_100",
        method: "tarjeta_credito",
        amount: 50000,
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("EFECTIVO o TRANSFERENCIA");
    });

    it("rechaza si el monto excede el saldo pendiente real (total - pagos verificados)", async () => {
      const { api, db } = setup();
      // Total: 500.000, Verificados: 200.000 -> Saldo pendiente: 300.000
      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_100",
        method: "efectivo",
        amount: 300001,
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("supera el saldo pendiente");
      expect(db.payment.create).not.toHaveBeenCalled();
    });

    it("rechaza montos que desbordan el límite Decimal de base de datos", async () => {
      const { api, db } = setup();

      const response = await api.post("/api/v1/payments").send({
        quoteId: "quote_100",
        method: "efectivo",
        amount: 1000000000000,
      });

      expect(response.status).toBe(400);
      expect(db.payment.create).not.toHaveBeenCalled();
    });
  });

  describe("Verificación e idempotencia (POST /api/v1/payments/:id/verify)", () => {
    it("rechaza una verificación sin sesión aunque se envíen identidad y rol en cabeceras", async () => {
      const { api, db } = setup();
      const response = await api
        .post("/api/v1/payments/pay_registrado/verify")
        .set("x-user-name", "Gerente")
        .set("x-user-role", "gerente")
        .send({ id: "gerente", authenticated: true });
      expect(response.status).toBe(401);
      expect(db.payment.updateMany).not.toHaveBeenCalled();
    });

    it("no autoriza la operación solo por tener una identidad autenticada", async () => {
      const { db } = setup();
      await expect(
        paymentService(db).verificar("pay_registrado", {
          id: "usuario_interno",
          authenticated: true,
        }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("verifica un pago registrado exitosamente", async () => {
      const { db } = setup();
      await paymentService(db, {
        authorizePaymentVerification: async () => true,
      }).verificar("pay_registrado", {
        id: "usuario_interno",
        authenticated: true,
      });
      expect(db.$queryRaw).toHaveBeenCalled();
      expect(db.payment.updateMany).toHaveBeenCalledWith({
        where: {
          id: "pay_registrado",
          quoteId: "quote_100",
          status: "REGISTRADO",
        },
        data: expect.objectContaining({
          status: "VERIFICADO",
          verifiedBy: "usuario_interno",
        }),
      });
    });

    it("impide verificar un pago 2 veces (idempotencia y protección de saldo)", async () => {
      const { db } = setup();
      await expect(
        paymentService(db, {
          authorizePaymentVerification: async () => true,
        }).verificar("pay_ya_verificado", {
          id: "usuario_interno",
          authenticated: true,
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining("ya fue verificado previamente"),
      });
      expect(db.payment.updateMany).not.toHaveBeenCalled();
    });

    it("retorna 404 para un pago inexistente", async () => {
      const { db } = setup();
      await expect(
        paymentService(db, {
          authorizePaymentVerification: async () => true,
        }).verificar("pay_inexistente", {
          id: "usuario_interno",
          authenticated: true,
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  it.each([0.001, 1.005, 0, -1])(
    "rechaza el importe inválido %s sin escribir en la base",
    async (amount) => {
      const { api, db } = setup();
      const response = await api
        .post("/api/v1/payments")
        .send({ quoteId: "quote_100", method: "EFECTIVO", amount });
      expect(response.status).toBe(400);
      expect(db.payment.create).not.toHaveBeenCalled();
    },
  );

  describe("Cálculo de saldos financieros (GET /api/v1/payments/quote/:quoteId/summary)", () => {
    it("calcula saldo pendiente considerando SOLO los pagos verificados", async () => {
      const { api } = setup();

      const response = await api.get(
        "/api/v1/payments/quote/quote_100/summary",
      );

      expect(response.status).toBe(200);
      expect(response.body.totalCotizacion).toBe(500000);
      expect(response.body.totalVerificado).toBe(200000); // Solo pay_prev_1 (200k)
      expect(response.body.totalRegistradoPendiente).toBe(50000); // pay_prev_2 (50k registrado pero no verificado)
      expect(response.body.saldoPendiente).toBe(300000); // 500k - 200k = 300k
      expect(response.body.estadoFinanciero).toBe("ABONADO");
    });
  });
});
