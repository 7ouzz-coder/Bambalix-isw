import { afterEach, describe, expect, it, vi } from "vitest";
import { createEvento, getClientes, getEventos, getTiposEvento } from "../src/services/eventos";

afterEach(() => vi.unstubAllGlobals());

describe("Servicio de eventos", () => {
  it("obtiene la lista de clientes y tipos de evento correctamente", async () => {
    const mockClientes = [{ id: "cli_1", name: "Cliente Uno" }];
    const mockTipos = [{ id: 1, name: "Cumpleaños" }];

    const fetchMock = vi.fn().mockImplementation((url) => {
      if (url.endsWith("/clients")) return Promise.resolve({ ok: true, json: async () => mockClientes });
      if (url.endsWith("/events/types")) return Promise.resolve({ ok: true, json: async () => mockTipos });
      return Promise.resolve({ ok: false });
    });

    vi.stubGlobal("fetch", fetchMock);

    expect(await getClientes()).toEqual(mockClientes);
    expect(await getTiposEvento()).toEqual(mockTipos);
  });

  it("envía la creación de un evento a /api/v1/events con clientId texto", async () => {
    const payload = {
      title: "Matrimonio Ana y Carlos",
      clientId: "cli_demo_1",
      eventTypeId: 2,
      startsAt: "2026-12-01T15:00:00.000Z",
      endsAt: "2026-12-01T23:00:00.000Z",
      attendees: 100,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 10, ...payload }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await createEvento(payload);
    expect(result.id).toBe(10);
    expect(result.clientId).toBe("cli_demo_1");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/events$/);
  });

  it("expone el mensaje de error del backend y maneja fallos de conexión", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "La fecha de término debe ser posterior al inicio" }),
      })
    );

    await expect(
      createEvento({
        title: "Evento Test",
        clientId: "cli_1",
        eventTypeId: 1,
        startsAt: "2026-12-01T15:00:00.000Z",
        endsAt: "2026-12-01T10:00:00.000Z",
        attendees: 10,
      })
    ).rejects.toThrow("La fecha de término debe ser posterior al inicio");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(getEventos()).rejects.toThrow("No se pudo conectar con el servidor. Comprueba que esté encendido");
  });
});
