import { describe, expect, it, vi, afterEach } from "vitest";
import { equipmentRequest, validateEquipment } from "../src/services/equipos";

afterEach(() => vi.unstubAllGlobals());
describe("Formulario de equipos", () => {
  it("acepta nombre y categoría con código opcional", () => expect(validateEquipment({ name: "Consola", category: "Sonido", code: "" })).toEqual({}));
  it("rechaza campos vacíos y códigos demasiado largos", () => expect(Object.keys(validateEquipment({ name: " ", category: " ", code: "x".repeat(61) }))).toEqual(["name", "category", "code"]));
  it("envía el registro al backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "equipo" }) }); vi.stubGlobal("fetch", fetchMock);
    expect(await equipmentRequest({ method: "POST", body: "{}" })).toEqual({ id: "equipo" });
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });
  it("muestra el error de código duplicado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Código duplicado" }) }));
    await expect(equipmentRequest()).rejects.toThrow("Código duplicado");
  });
  it("informa cuando no hay conexión", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(equipmentRequest()).rejects.toThrow("conectar");
  });
});
