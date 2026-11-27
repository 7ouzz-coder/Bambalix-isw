vi.mock("../src/services/sesion.js", () => ({ sessionFetch: (...args) => fetch(...args) }));
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
    expect(validateClient({ name: "Ana Pérez", email: "ana@example.com", rut: "12.345.678-5", phone: "+56912345678" })).toEqual({});
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
      rut: "76.543.210-3",
      phone: "+56923456789",
      clientType: "empresa",
      contactName: "",
    });
    expect(errors.contactName).toBe("Para empresas es obligatorio indicar el encargado de contacto");
  });

  it("valida el dígito del RUT y el formato de celular chileno", () => {
    const base = { name: "Ana Pérez", email: "ana@example.com", rut: "12.345.678-5", phone: "912345678" };
    expect(clientFormSchema.safeParse(base).success).toBe(true);
    expect(clientFormSchema.safeParse({ ...base, phone: "+56912345678" }).success).toBe(true);
    expect(clientFormSchema.safeParse({ ...base, rut: "12.345.678-9" }).success).toBe(false);
    expect(clientFormSchema.safeParse({ ...base, phone: "+56223456789" }).success).toBe(false);
    expect(validateClient({ ...base, rut: "12.345.678-9" }).rut).toBeTruthy();
    expect(clientFormSchema.safeParse({ ...base, contactPhone: "abc" }).success).toBe(false);
    expect(clientFormSchema.safeParse({ ...base, contactPhone: "+56912345678" }).success).toBe(true);
    expect(clientFormSchema.safeParse({ ...base, address: "Av. Providencia #123, Depto. 4-B / Torre 1" }).success).toBe(true);
    expect(clientFormSchema.safeParse({ ...base, address: "Av Providencia @123" }).success).toBe(false);
    expect(validateClient({ ...base, address: "Av Providencia @123" }).address).toBe("La dirección solo permite letras, números, espacios y los signos #, ., ,, -, /");
    expect(validateClient({ ...base, address: "Av. Providencia #1234" }).address).toBeUndefined();
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
      rut: "12.345.678-5",
      phone: "+56912345678",
      clientType: "persona",
    });
    expect(personaValida.success).toBe(true);
    expect(clientFormSchema.safeParse({ ...personaValida.data, rut: " " }).success).toBe(false);
    expect(clientFormSchema.safeParse({ ...personaValida.data, phone: "" }).success).toBe(false);

    const empresaInvalida = clientFormSchema.safeParse({
      name: "Producciones SA",
      email: "prod@ejemplo.cl",
      rut: "76.543.210-3",
      phone: "+56923456789",
      clientType: "empresa",
      contactName: "",
    });
    expect(empresaInvalida.success).toBe(false);

    const empresaValida = clientFormSchema.safeParse({
      name: "Producciones SA",
      email: "prod@ejemplo.cl",
      rut: "76.543.210-3",
      phone: "+56923456789",
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