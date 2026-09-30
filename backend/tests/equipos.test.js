import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const payload = { name: "Consola", category: "Sonido", code: "SON-001", mode: "UNIT", quantity: 1 };
function setup() {
  const db = { resource: { create: vi.fn().mockImplementation(async ({ data }) => ({ id: "test", ...data })) } };
  return { db, api: request(createApp({ db, webOrigin: "http://localhost:3000" })) };
}
describe("Registro de equipos", () => {
  it("registra una unidad y limpia espacios", async () => {
    const { api } = setup();
    const response = await api.post("/api/v1/operations/resources").send({ ...payload, name: " Consola " });
    expect(response.status).toBe(201); expect(response.body.name).toBe("Consola");
  });
  it("permite omitir el código", async () => {
    const { api } = setup(); const { code, ...withoutCode } = payload;
    const response = await api.post("/api/v1/operations/resources").send(withoutCode);
    expect(response.status).toBe(201); expect(response.body.code).toBeNull();
  });
  it.each([{ name: " " }, { category: "x" }, { quantity: 2 }, { mode: "GROUP" }, { code: "x".repeat(61) }, { extra: "no" }])("rechaza datos inválidos: %j", async patch => {
    const { api, db } = setup();
    expect((await api.post("/api/v1/operations/resources").send({ ...payload, ...patch })).status).toBe(400);
    expect(db.resource.create).not.toHaveBeenCalled();
  });
  it("rechaza código duplicado sin filtrar detalles internos", async () => {
    const { api, db } = setup(); db.resource.create.mockRejectedValue({ code: "P2002" });
    const response = await api.post("/api/v1/operations/resources").send(payload);
    expect(response.status).toBe(409); expect(response.body.message).toContain("código");
  });
});
