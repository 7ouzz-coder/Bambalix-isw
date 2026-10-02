import { afterEach, describe, expect, it, vi } from "vitest";
import { clientRequest, validateClient } from "../src/services/clientes";

afterEach(() => vi.unstubAllGlobals());

describe("Formulario de clientes", () => {
  it("acepta los campos obligatorios y opcionales vacíos", () => {
    expect(validateClient({ name: "Ana Pérez", email: "ana@example.com" })).toEqual({});
  });

  it("valida campos requeridos, correo y longitudes", () => {
    const errors = validateClient({ name: "A", email: "correo", rut: "x".repeat(21), phone: "x".repeat(41), address: "x".repeat(241) });
    expect(Object.keys(errors)).toEqual(["name", "email", "rut", "phone", "address"]);
    expect(validateClient({ name: "Cliente", email: "" }).email).toBe("El correo es obligatorio");
  });

  it("envía las solicitudes al endpoint de clientes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: "client-1" }] });
    vi.stubGlobal("fetch", fetchMock);
    expect(await clientRequest()).toEqual([{ id: "client-1" }]);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/clients$/);
  });

  it("expone el mensaje del backend y normaliza fallos de conexión", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Ya existe un cliente con ese RUT" }) }));
    await expect(clientRequest()).rejects.toThrow("Ya existe un cliente con ese RUT");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(clientRequest()).rejects.toThrow("No se pudo conectar");
  });
});