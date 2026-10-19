import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const payloadPersona = {
  name: "María López",
  email: "maria@example.com",
  rut: "12.345.678-9",
  phone: "+56 9 1234 5678",
  address: "Av. Central 123",
  clientType: "persona",
};

const payloadEmpresa = {
  name: "Eventos Spa",
  email: "contacto@eventos.cl",
  rut: "76.543.210-K",
  phone: "+56 2 2345 6789",
  address: "Providencia 456",
  clientType: "empresa",
  contactName: "Carlos Gómez",
  contactPhone: "+56 9 8765 4321",
  contactEmail: "cgomez@eventos.cl",
  contactPosition: "Gerente de Operaciones",
};

function setup() {
  const db = {
    client: {
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: "cli_test_1", ...data })),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id === "cli_test_1") {
          return { id: "cli_test_1", ...payloadPersona };
        }
        return null;
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data })),
    },
  };
  return { db, api: request(createApp({ db, webOrigin: "http://localhost:3000" })) };
}

describe("Requisito 1: Gestión de clientes", () => {
  describe("Creación (POST /api/v1/clients)", () => {
    it("registra un cliente persona válido", async () => {
      const { api } = setup();
      const response = await api.post("/api/v1/clients").send(payloadPersona);
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: payloadPersona.name,
        email: payloadPersona.email,
        rut: payloadPersona.rut,
        clientType: "persona",
      });
    });

    it("registra un cliente empresa con su encargado de contacto", async () => {
      const { api } = setup();
      const response = await api.post("/api/v1/clients").send(payloadEmpresa);
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: payloadEmpresa.name,
        clientType: "empresa",
        contactName: "Carlos Gómez",
      });
    });

    it("rechaza cliente empresa si falta el encargado de contacto", async () => {
      const { api, db } = setup();
      const response = await api.post("/api/v1/clients").send({
        ...payloadEmpresa,
        contactName: "",
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("encargado de contacto");
      expect(db.client.create).not.toHaveBeenCalled();
    });

    it("permite omitir los campos opcionales", async () => {
      const { api, db } = setup();
      const response = await api.post("/api/v1/clients").send({
        name: "Ana Pérez",
        email: "ana@example.com",
      });
      expect(response.status).toBe(201);
      expect(db.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Ana Pérez",
          email: "ana@example.com",
          clientType: "persona",
        }),
      });
    });

    it("responde 409 cuando ya existe un cliente con ese RUT", async () => {
      const { api, db } = setup();
      db.client.findFirst.mockResolvedValue({ id: "otro_cliente", rut: payloadPersona.rut });
      const response = await api.post("/api/v1/clients").send(payloadPersona);
      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Ya existe un cliente con ese RUT");
    });
  });

  describe("Listado y consulta (GET /api/v1/clients)", () => {
    it("lista clientes con status 200 ordenados por nombre (para compatibilidad con Ángel)", async () => {
      const { api, db } = setup();
      const response = await api.get("/api/v1/clients");
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(db.client.findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } });
    });

    it("obtiene un cliente específico por id", async () => {
      const { api } = setup();
      const response = await api.get("/api/v1/clients/cli_test_1");
      expect(response.status).toBe(200);
      expect(response.body.id).toBe("cli_test_1");
    });

    it("retorna 404 si el cliente no existe", async () => {
      const { api } = setup();
      const response = await api.get("/api/v1/clients/inexistente");
      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Cliente no encontrado");
    });
  });

  describe("Edición (PATCH /api/v1/clients/:id)", () => {
    it("actualiza un cliente existente correctamente", async () => {
      const { api, db } = setup();
      const response = await api.patch("/api/v1/clients/cli_test_1").send({
        name: "María López Actualizada",
        phone: "+56 9 9999 8888",
      });
      expect(response.status).toBe(200);
      expect(db.client.update).toHaveBeenCalledWith({
        where: { id: "cli_test_1" },
        data: expect.objectContaining({
          name: "María López Actualizada",
          phone: "+56 9 9999 8888",
        }),
      });
    });

    it("retorna 404 al editar un cliente inexistente (evita crear cliente fantasma)", async () => {
      const { api, db } = setup();
      const response = await api.patch("/api/v1/clients/cli_no_existe").send({
        name: "Nombre Fantasma",
      });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain("no encontrado");
      expect(db.client.update).not.toHaveBeenCalled();
    });

    it("permite actualizar conservando el mismo RUT sin colisionar consigo mismo", async () => {
      const { api, db } = setup();
      const response = await api.patch("/api/v1/clients/cli_test_1").send({
        rut: payloadPersona.rut, // Mismo RUT que ya tiene
        name: "María López Modificada",
      });
      expect(response.status).toBe(200);
      expect(db.client.findFirst).not.toHaveBeenCalled();
      expect(db.client.update).toHaveBeenCalled();
    });

    it("responde 409 si se intenta cambiar el RUT al de otro cliente existente", async () => {
      const { api, db } = setup();
      db.client.findFirst.mockResolvedValue({ id: "cli_otro", rut: "99.888.777-6" });
      const response = await api.patch("/api/v1/clients/cli_test_1").send({
        rut: "99.888.777-6",
      });
      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Ya existe un cliente con ese RUT");
      expect(db.client.update).not.toHaveBeenCalled();
    });

    it("al cambiar a tipo empresa, exige encargado de contacto", async () => {
      const { api, db } = setup();
      const response = await api.patch("/api/v1/clients/cli_test_1").send({
        clientType: "empresa",
        contactName: "",
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("encargado de contacto");
      expect(db.client.update).not.toHaveBeenCalled();
    });
  });
});