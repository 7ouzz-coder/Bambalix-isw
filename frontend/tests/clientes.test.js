import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clientFormSchema,
  clientRequest,
  createClient,
  updateClient,
  validateClient,
} from "../src/services/clientes";

afterEach(() => vi.unstubAllGlobals());

describe("Formulario y servicio de clientes", () => {
  it("acepta los campos obligatorios y opcionales vacíos", () => {
    expect(validateClient({ name: "Ana Pérez", email: "ana@example.com" })).toEqual({});
  });

  it("valida campos requeridos, correo y longitudes", () => {
    const errors = validateClient({
      name: "A",
      email: "correo",
      rut: "x".repeat(21),
      phone: "x".repeat(41),
      address: "x".repeat(241),
    });
    expect(Object.keys(errors)).toEqual(["name", "email", "rut", "phone", "address"]);
    expect(validateClient({ name: "Cliente", email: "" }).email).toBe("El correo es obligatorio");
  });

  it("exige encargado de contacto si el tipo de cliente es empresa", () => {
    const errors = validateClient({
      name: "Empresa SPA",
      email: "empresa@ejemplo.cl",
      clientType: "empresa",
      contactName: "",
    });
    expect(errors.contactName).toBe("Para empresas es obligatorio indicar el encargado de contacto");
  });

  it("envía las solicitudes GET al endpoint de clientes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: "client-1" }] });
    vi.stubGlobal("fetch", fetchMock);
    expect(await clientRequest()).toEqual([{ id: "client-1" }]);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/clients$/);
  });

  it("envía PATCH al endpoint de clientes con ID para actualizar", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: "cli_123", name: "Nombre Actualizado" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateClient("cli_123", { name: "Nombre Actualizado" });
    expect(result).toEqual({ id: "cli_123", name: "Nombre Actualizado" });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/clients\/cli_123$/);
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
  });

  it("valida esquemas con Zod (clientFormSchema)", () => {
    const personaValida = clientFormSchema.safeParse({
      name: "Juan Pérez",
      email: "juan@ejemplo.cl",
      clientType: "persona",
    });
    expect(personaValida.success).toBe(true);

    const empresaInvalida = clientFormSchema.safeParse({
      name: "Producciones SA",
      email: "prod@ejemplo.cl",
      clientType: "empresa",
      contactName: "",
    });
    expect(empresaInvalida.success).toBe(false);

    const empresaValida = clientFormSchema.safeParse({
      name: "Producciones SA",
      email: "prod@ejemplo.cl",
      clientType: "empresa",
      contactName: "Roberto Gómez",
    });
    expect(empresaValida.success).toBe(true);
  });

  it("expone el mensaje del backend y normaliza fallos de conexión", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Ya existe un cliente con ese RUT" }) })
    );
    await expect(clientRequest()).rejects.toThrow("Ya existe un cliente con ese RUT");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(clientRequest()).rejects.toThrow("No se pudo conectar");
  });
});