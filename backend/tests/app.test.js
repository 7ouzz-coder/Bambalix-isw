import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp({ db: { $queryRaw: async () => [{ "?column?": 1 }] }, webOrigin: "http://localhost:3000" });
describe("Base del servidor", () => {
  it("comprueba conexión", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
  it("responde 404 para rutas inexistentes", async () => {
    expect((await request(app).get("/inexistente")).status).toBe(404);
  });
  it("rechaza escritura desde un origen distinto", async () => {
    expect((await request(app).post("/api/v1/health").set("Origin", "https://example.test").send({})).status).toBe(403);
  });
});
