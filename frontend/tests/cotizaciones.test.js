import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approveQuote,
  createQuote,
  getQuotes,
  quoteFormSchema,
  submitQuoteForReview,
} from "../src/services/cotizaciones";

afterEach(() => vi.unstubAllGlobals());

describe("Servicio y validaciones de Cotizaciones en frontend", () => {
  it("valida el esquema quoteFormSchema correctamente", () => {
    const cotizacionValida = quoteFormSchema.safeParse({
      clientId: "cli_100",
      eventId: 200,
      notes: "Nota de prueba",
      items: [
        { concept: "Consola de audio", quantity: 1, unitPrice: 150000 },
        { concept: "Cables XLR", quantity: 6, unitPrice: 5000 },
      ],
    });
    expect(cotizacionValida.success).toBe(true);

    const cotizacionSinItems = quoteFormSchema.safeParse({
      clientId: "cli_100",
      eventId: 200,
      items: [],
    });
    expect(cotizacionSinItems.success).toBe(false);

    const cotizacionConPrecioNegativo = quoteFormSchema.safeParse({
      clientId: "cli_100",
      eventId: 200,
      items: [{ concept: "Foco", quantity: 1, unitPrice: -100 }],
    });
    expect(cotizacionConPrecioNegativo.success).toBe(false);
  });

  it("llama a la API para crear cotizaciones mediante POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "quote_test_1", status: "BORRADOR", total: 100000 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      clientId: "cli_100",
      eventId: 200,
      items: [{ concept: "Microfonía", quantity: 2, unitPrice: 50000 }],
    };

    const res = await createQuote(payload);
    expect(res.id).toBe("quote_test_1");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/quotes$/);
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("envía solicitud de revisión con submitQuoteForReview", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "quote_1", status: "EN_REVISION" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await submitQuoteForReview("quote_1");
    expect(res.status).toBe("EN_REVISION");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/quotes\/quote_1\/submit-review$/);
  });

  it("envía solicitud de aprobación de gerente sin inyectar cabeceras simuladas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "quote_1", status: "APROBADA", approvedBy: "Gerente Autorizado" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await approveQuote("quote_1");
    expect(res.status).toBe("APROBADA");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/quotes\/quote_1\/approve$/);
    expect(fetchMock.mock.calls[0][1].headers["x-user-role"]).toBeUndefined();
  });
});
