import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const payload = { name: "María López", email: "maria@example.com", rut: "12.345.678-9", phone: "+56 9 1234 5678", address: "Av. Central 123" };

function setup() {
  const db = {
    client: {
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: "test-client", ...data })),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return { db, api: request(createApp({ db, webOrigin: "http://localhost:3000" })) };
}

describe("Registro de clientes", () => {
  it("registra un cliente válido", async () => {
    const { api } = setup();
    const response = await api.post("/api/v1/clients").send(payload);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: payload.name, email: payload.email, rut: payload.rut });
  });

  it("permite omitir los campos opcionales", async () => {
    const { api, db } = setup();
    const response = await api.post("/api/v1/clients").send({ name: "Ana Pérez", email: "ana@example.com" });
    expect(response.status).toBe(201);
    expect(db.client.create).toHaveBeenCalledWith({ data: { name: "Ana Pérez", email: "ana@example.com", rut: null, phone: null, address: null } });
  });

  it.each([
    { name: "A" },
    { email: "correo-inválido" },
    { email: "a".repeat(245) + "@example.com" },
    { rut: "x".repeat(21) },
    { phone: "x".repeat(41) },
    { address: "x".repeat(241) },
    { extra: "no permitido" },
  ])("rechaza datos inválidos: %j", async patch => {
    const { api, db } = setup();
    const response = await api.post("/api/v1/clients").send({ ...payload, ...patch });
    expect(response.status).toBe(400);
    expect(db.client.create).not.toHaveBeenCalled();
  });

  it("responde 409 para un RUT duplicado", async () => {
    const { api, db } = setup();
    db.client.create.mockRejectedValue({ code: "P2002" });
    const response = await api.post("/api/v1/clients").send(payload);
    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Ya existe un cliente con ese RUT");
  });

  it("lista clientes con status 200 ordenados por nombre", async () => {
    const { api, db } = setup();
    const response = await api.get("/api/v1/clients");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(db.client.findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } });
  });
});