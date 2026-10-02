import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Cliente HTTP compartido", () => {
  it.each([
    "http://localhost:3001",
    "http://localhost:3001/",
    "http://localhost:3001/api/v1",
  ])("normaliza la dirección %s sin duplicar el prefijo", async (url) => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", url);
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("../src/services/api");
    await apiRequest("/clients");
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3001/api/v1/clients");
  });

  it("conserva el cuerpo, las cabeceras y la señal recibida", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("../src/services/api");
    await apiRequest("/events", { method: "POST", body: "{}", signal, headers: { "X-Test": "test" } });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST", body: "{}", signal, cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Test": "test" },
    });
  });

  it("mantiene las cancelaciones sin convertirlas en fallos de conexión", async () => {
    const error = new DOMException("Cancelado", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    const { apiRequest } = await import("../src/services/api");
    await expect(apiRequest("/clients")).rejects.toBe(error);
  });

  it("usa el mensaje del módulo cuando el backend no entrega uno", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    const { apiRequest } = await import("../src/services/api");
    await expect(apiRequest("/events", {}, "Error al registrar el evento")).rejects.toThrow("Error al registrar el evento");
  });
});
