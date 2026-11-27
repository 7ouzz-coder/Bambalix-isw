import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  isQuoteConfirmed,
  computeEventStatus,
  getEventOccupiedDates,
  listEventosPublicos,
} from "../services/eventos.service.js";
import { registerPublicRequest } from "../services/solicitudes-publicas.service.js";

describe("Reglas de confirmación comercial de eventos y ocupación", () => {
  it("confirma con cotización APROBADA y abonos VERIFICADOS >= 50% del total", () => {
    const quote = {
      status: "APROBADA",
      total: new Prisma.Decimal("100000.00"),
      payments: [
        { status: "VERIFICADO", amount: new Prisma.Decimal("50000.00") },
      ],
    };
    expect(isQuoteConfirmed(quote)).toBe(true);
  });

  it("no confirma si la cotización no está APROBADA (ej: EN_REVISION o BORRADOR)", () => {
    const quote1 = {
      status: "EN_REVISION",
      total: new Prisma.Decimal("100000.00"),
      payments: [
        { status: "VERIFICADO", amount: new Prisma.Decimal("50000.00") },
      ],
    };
    const quote2 = {
      status: "BORRADOR",
      total: new Prisma.Decimal("100000.00"),
      payments: [
        { status: "VERIFICADO", amount: new Prisma.Decimal("100000.00") },
      ],
    };
    expect(isQuoteConfirmed(quote1)).toBe(false);
    expect(isQuoteConfirmed(quote2)).toBe(false);
  });

  it("no confirma si la cotización tiene total 0 o negativo", () => {
    const quote = {
      status: "APROBADA",
      total: new Prisma.Decimal("0.00"),
      payments: [
        { status: "VERIFICADO", amount: new Prisma.Decimal("0.00") },
      ],
    };
    expect(isQuoteConfirmed(quote)).toBe(false);
  });

  it("no confirma si la suma de pagos verificados es menor al 50%", () => {
    const quote = {
      status: "APROBADA",
      total: new Prisma.Decimal("100000.00"),
      payments: [
        { status: "VERIFICADO", amount: new Prisma.Decimal("49999.99") },
      ],
    };
    expect(isQuoteConfirmed(quote)).toBe(false);
  });

  it("los pagos únicamente REGISTRADO o ANULADO no cuentan para el 50%", () => {
    const quote = {
      status: "APROBADA",
      total: new Prisma.Decimal("100000.00"),
      payments: [
        { status: "REGISTRADO", amount: new Prisma.Decimal("50000.00") },
        { status: "ANULADO", amount: new Prisma.Decimal("50000.00") },
      ],
    };
    expect(isQuoteConfirmed(quote)).toBe(false);
  });

  it("dos o más pagos parciales VERIFICADOS que juntos alcanzan el 50% confirman el evento", () => {
    const quote = {
      status: "APROBADA",
      total: new Prisma.Decimal("150000.00"),
      payments: [
        { status: "VERIFICADO", amount: new Prisma.Decimal("25000.00") },
        { status: "VERIFICADO", amount: new Prisma.Decimal("50000.00") }, // 75.000 = 50%
      ],
    };
    expect(isQuoteConfirmed(quote)).toBe(true);
  });

  it("las condiciones deben pertenecer a la misma cotización (no suma entre cotizaciones)", () => {
    const event = {
      quotes: [
        {
          id: "q1",
          status: "APROBADA",
          total: new Prisma.Decimal("100000.00"),
          payments: [{ status: "VERIFICADO", amount: new Prisma.Decimal("20000.00") }],
        },
        {
          id: "q2",
          status: "BORRADOR",
          total: new Prisma.Decimal("100000.00"),
          payments: [{ status: "VERIFICADO", amount: new Prisma.Decimal("30000.00") }],
        },
      ],
    };
    expect(computeEventStatus(event)).toBe("POR_CONFIRMAR");
  });

  it("evento histórico con cotización aprobada y 50% verificado se computa CONFIRMADO", () => {
    const event = {
      quotes: [
        {
          id: "q-hist",
          status: "APROBADA",
          total: new Prisma.Decimal("200000.00"),
          payments: [{ status: "VERIFICADO", amount: new Prisma.Decimal("100000.00") }],
        },
      ],
    };
    expect(computeEventStatus(event)).toBe("CONFIRMADO");
  });

  it("calcula correctamente la ocupación cruzando medianoche en horario de Santiago", () => {
    // 2026-11-20 21:00 UTC = 2026-11-20 18:00 Santiago (UTC-3)
    // 2026-11-21 03:00 UTC = 2026-11-21 00:00:00 Santiago (termina exactamente a medianoche)
    // No debe ocupar el día 2026-11-21
    const startsAt = "2026-11-20T21:00:00.000Z";
    const endsAt = "2026-11-21T03:00:00.000Z";
    const dates = getEventOccupiedDates(startsAt, endsAt);
    expect(dates).toEqual(["2026-11-20"]);
  });

  it("calcula múltiples días si el evento excede la medianoche en Santiago", () => {
    // 2026-11-20 18:00 Santiago a 2026-11-21 02:00 Santiago
    const startsAt = "2026-11-20T21:00:00.000Z";
    const endsAt = "2026-11-21T05:00:00.000Z";
    const dates = getEventOccupiedDates(startsAt, endsAt);
    expect(dates).toEqual(["2026-11-20", "2026-11-21"]);
  });
});

describe("Seguridad y privacidad en listEventosPublicos", () => {
  it("devuelve el título genérico 'Evento confirmado' y omite campos internos privados", async () => {
    const mockDb = {
      event: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 10,
            title: "Boda VIP Secreta de Don Juan",
            startsAt: new Date("2026-12-10T15:00:00Z"),
            endsAt: new Date("2026-12-10T22:00:00Z"),
            location: "Club Privado",
            attendees: 200,
            needs: "Seguridad armada y catering de lujo",
            quotes: [
              {
                id: "q1",
                status: "APROBADA",
                total: 500000,
                payments: [{ id: "p1", amount: 250000, status: "VERIFICADO" }],
              },
            ],
          },
        ]),
      },
    };

    const publicos = await listEventosPublicos(mockDb);
    expect(publicos).toHaveLength(1);
    expect(publicos[0].id).toBe(10);
    expect(publicos[0].title).toBe("Evento confirmado");
    expect(publicos[0].title).not.toContain("Boda VIP");
    expect(publicos[0].location).toBeUndefined();
    expect(publicos[0].attendees).toBeUndefined();
    expect(publicos[0].needs).toBeUndefined();
    expect(publicos[0].quotes).toBeUndefined();
  });
});

describe("Solicitudes públicas, concurrencia y bloqueo compartido", () => {
  it("adquiere el bloqueo bambalix_confirmacion_agenda en la transacción", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: true }]),
      event: { findMany: vi.fn().mockResolvedValue([]) },
      publicEventRequest: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "req-1" }),
      },
    };
    const mockDb = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
      publicEventRequest: { findUnique: vi.fn().mockResolvedValue(null) },
    };

    const payload = {
      name: "Juan Perez",
      email: "juan@example.com",
      phone: "+56911223344",
      requestedDate: "2028-10-15",
      service: "Iluminación",
    };

    const result = await registerPublicRequest(mockDb, payload, "key-test-1");
    expect(mockTx.$queryRaw).toHaveBeenCalled();
    // Verifica que se ejecutó el bloqueo coordinado con Gabriel
    expect(mockTx.$queryRaw.mock.calls[0][0][0]).toContain("bambalix_confirmacion_agenda");
    expect(result.message).toContain("Recibimos tu solicitud");
  });

  it("rechaza con 409 si la fecha ya está ocupada por un evento confirmado al momento de obtener el bloqueo", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: true }]),
      event: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 1,
            startsAt: new Date("2028-10-15T15:00:00Z"),
            endsAt: new Date("2028-10-15T20:00:00Z"),
            quotes: [
              {
                id: "q1",
                status: "APROBADA",
                total: new Prisma.Decimal("100.00"),
                payments: [{ status: "VERIFICADO", amount: new Prisma.Decimal("50.00") }],
              },
            ],
          },
        ]),
      },
      publicEventRequest: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
    };
    const mockDb = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
      publicEventRequest: { findUnique: vi.fn().mockResolvedValue(null) },
    };

    const payload = {
      name: "Maria Lopez",
      email: "maria@example.com",
      phone: "+56999887766",
      requestedDate: "2028-10-15",
      service: "Sonido",
    };

    await expect(registerPublicRequest(mockDb, payload, "key-test-2")).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("ya no se encuentra disponible"),
    });
    expect(mockTx.publicEventRequest.create).not.toHaveBeenCalled();
  });

  it("idempotencia: la misma clave y los mismos datos devuelven éxito original aunque la fecha esté ocupada", async () => {
    const existing = {
      name: "Carlos Gomez",
      email: "carlos@example.com",
      phone: "+56912345678",
      requestedDate: "2028-10-15",
      service: "Banquetería",
    };

    const mockDb = {
      $transaction: vi.fn(),
      publicEventRequest: {
        findUnique: vi.fn().mockResolvedValue(existing),
      },
    };

    const payload = { ...existing };
    const result = await registerPublicRequest(mockDb, payload, "key-idempotent-1");
    expect(result.message).toContain("Recibimos tu solicitud");
    // No necesitó abrir transacción ni bloquear porque se resolvió antes por idempotencia
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("idempotencia: la misma clave con datos distintos devuelve 409", async () => {
    const existing = {
      name: "Carlos Gomez",
      email: "carlos@example.com",
      phone: "+56912345678",
      requestedDate: "2028-10-15",
      service: "Banquetería",
    };

    const mockDb = {
      $transaction: vi.fn(),
      publicEventRequest: {
        findUnique: vi.fn().mockResolvedValue(existing),
      },
    };

    const payload = { ...existing, service: "DJ y Animación" };
    await expect(registerPublicRequest(mockDb, payload, "key-idempotent-1")).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("La solicitud cambió"),
    });
  });

  it("recupera limpiamente fuera de la transacción si ocurre conflicto de clave única (P2002)", async () => {
    const existing = {
      name: "Ana Ruiz",
      email: "ana@example.com",
      phone: "+56987654321",
      requestedDate: "2028-11-20",
      service: "Fotografía",
    };

    const p2002Error = new Error("Unique constraint failed");
    p2002Error.code = "P2002";

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: true }]),
      event: { findMany: vi.fn().mockResolvedValue([]) },
      publicEventRequest: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue(p2002Error),
      },
    };

    const mockDb = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
      publicEventRequest: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(null) // Before tx
          .mockResolvedValueOnce(existing), // After P2002 conflict recovery outside tx
      },
    };

    const payload = { ...existing };
    const result = await registerPublicRequest(mockDb, payload, "key-race-p2002");
    expect(result.message).toContain("Recibimos tu solicitud");
  });
});
