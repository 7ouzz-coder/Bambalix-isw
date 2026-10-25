import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approveQuote,
  createQuote,
  getQuotes,
  quoteFormSchema,
  submitQuoteForReview,
} from "../src/services/cotizaciones";
import { getQuotePreview } from "../src/lib/cotizaciones.js";

afterEach(() => vi.unstubAllGlobals());

describe("Servicio y validaciones de Cotizaciones en frontend", () => {
  it.each(["0.001", "1.005", "-1"])(
    "rechaza el precio inválido %s",
    (unitPrice) => {
      expect(
        quoteFormSchema.safeParse({
          clientId: "cli_100",
          eventId: 200,
          items: [{ concept: "Servicio sonido", quantity: 1, unitPrice }],
        }).success,
      ).toBe(false);
    },
  );

  it("acepta precios con dos decimales y conserva ítems sin costo", () => {
    expect(
      quoteFormSchema.safeParse({
        clientId: "cli_100",
        eventId: 200,
        items: [
          { concept: "Servicio sonido", quantity: 1, unitPrice: "10.25" },
          { concept: "Ítem incluido", quantity: 1, unitPrice: 0 },
        ],
      }).success,
    ).toBe(true);
  });

  it("calcula la vista previa por centavos sin errores flotantes", () => {
    expect(
      getQuotePreview([
        { quantity: 3, unitPrice: "0.10" },
        { quantity: 1, unitPrice: "0.20" },
      ]),
    ).toEqual({ subtotals: [0.3, 0.2], total: 0.5 });
  });

  it.each([
    { quantity: 1, unitPrice: "1.005" },
    { quantity: 1.5, unitPrice: "10" },
    { quantity: 0, unitPrice: "10" },
    { quantity: 1, unitPrice: "texto" },
    { quantity: 100000, unitPrice: 999999999.99 },
  ])(
    "no muestra un total engañoso para datos inválidos o fuera de precisión segura",
    (item) => {
      expect(getQuotePreview([item])).toEqual({
        subtotals: [null],
        total: null,
      });
    },
  );
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
      json: async () => ({
        id: "quote_test_1",
        status: "BORRADOR",
        total: 100000,
      }),
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
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /\/api\/v1\/quotes\/quote_1\/submit-review$/,
    );
  });

  it("envía solicitud de aprobación de gerente sin inyectar cabeceras simuladas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "quote_1",
        status: "APROBADA",
        approvedBy: "Gerente Autorizado",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await approveQuote("quote_1");
    expect(res.status).toBe("APROBADA");
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /\/api\/v1\/quotes\/quote_1\/approve$/,
    );
    expect(fetchMock.mock.calls[0][1].headers["x-user-role"]).toBeUndefined();
  });
});
