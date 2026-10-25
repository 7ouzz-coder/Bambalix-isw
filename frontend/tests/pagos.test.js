import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPayments,
  getQuoteFinancialSummary,
  paymentFormSchema,
  registerPayment,
  verifyPayment,
} from "../src/services/pagos";

afterEach(() => vi.unstubAllGlobals());

describe("Servicio y validaciones de Pagos en frontend", () => {
  it("valida el esquema paymentFormSchema correctamente", () => {
    const pagoEfectivoValido = paymentFormSchema.safeParse({
      quoteId: "quote_100",
      method: "EFECTIVO",
      amount: "150000",
      reference: "Recibo #001",
    });
    expect(pagoEfectivoValido.success).toBe(true);

    const pagoTransferenciaValido = paymentFormSchema.safeParse({
      quoteId: "quote_100",
      method: "TRANSFERENCIA",
      amount: 250000,
      reference: "Operación #123456",
    });
    expect(pagoTransferenciaValido.success).toBe(true);

    const pagoMetodoInvalido = paymentFormSchema.safeParse({
      quoteId: "quote_100",
      method: "BITCOIN",
      amount: 10000,
    });
    expect(pagoMetodoInvalido.success).toBe(false);

    const pagoMontoNegativo = paymentFormSchema.safeParse({
      quoteId: "quote_100",
      method: "EFECTIVO",
      amount: -500,
    });
    expect(pagoMontoNegativo.success).toBe(false);
  });

  it("envía solicitud POST para registrar la recepción de un pago", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "pay_1", status: "REGISTRADO", amount: 150000 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      quoteId: "quote_100",
      method: "TRANSFERENCIA",
      amount: 150000,
      reference: "Transf. #9988",
    };

    const res = await registerPayment(payload);
    expect(res.id).toBe("pay_1");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/payments$/);
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("envía solicitud POST para verificar un pago sin cabeceras simuladas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "pay_1", status: "VERIFICADO", verifiedBy: "Finanzas" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await verifyPayment("pay_1");
    expect(res.status).toBe("VERIFICADO");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/payments\/pay_1\/verify$/);
  });

  it("obtiene el resumen financiero de una cotización", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalCotizacion: 500000,
        totalVerificado: 200000,
        saldoPendiente: 300000,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const summary = await getQuoteFinancialSummary("quote_100");
    expect(summary.totalCotizacion).toBe(500000);
    expect(summary.saldoPendiente).toBe(300000);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/payments\/quote\/quote_100\/summary$/);
  });
});
