import { expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

it("consulta unidades ordenadas y limita el listado a 200", async () => {
  const items = [{ id: "equipo", name: "Consola", category: "Sonido", code: null }];
  const findMany = vi.fn().mockResolvedValue(items);
  const response = await request(createApp({ db: { resource: { findMany } }, webOrigin: "http://localhost:3000" })).get("/api/v1/operations/resources");
  expect(response.status).toBe(200); expect(response.body).toEqual(items);
  expect(findMany).toHaveBeenCalledWith({ where: { mode: "UNIT" }, take: 200, orderBy: [{ category: "asc" }, { name: "asc" }, { id: "asc" }] });
});
it("devuelve un arreglo vacío cuando no hay equipos", async () => {
  const response = await request(createApp({ db: { resource: { findMany: async () => [] } }, webOrigin: "http://localhost:3000" })).get("/api/v1/operations/resources");
  expect(response.status).toBe(200); expect(response.body).toEqual([]);
});
