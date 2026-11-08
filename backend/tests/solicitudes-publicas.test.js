import { it, expect, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { createApp } from "../src/app.js";
const data = { name: "Cliente solicitud", email: "solicitud-0511@example.test", requestedDate: "2028-07-10", service: "Seminarios y congresos", message: "Necesitamos sonido para cuarenta asistentes." };
it("registra sin sesión una solicitud y no crea cliente ni evento", async () => {
 const url = process.env.TEST_DATABASE_URL;
 if (!url || new URL(url).hostname !== "127.0.0.1" || !new URL(url).pathname.endsWith("_test")) throw new Error("Base de pruebas requerida");
 const db = new PrismaClient({ datasources: { db: { url } } });
 const api = request(createApp({ db, webOrigin: "http://localhost:3000" }));
 try {
  const response = await api.post("/api/v1/public/requests").send(data);
  expect(response.status).toBe(201);
  expect(response.body).not.toHaveProperty("id");
  expect(response.body.message).toContain("no confirma una reserva");
  const stored = await db.publicEventRequest.findFirst({ where: { email: data.email } });
  expect(stored.requestedDate).toBe(data.requestedDate);
  expect(await db.client.count({where:{email:data.email}})).toBe(0);
  expect(await db.event.count({where:{client:{email:data.email}}})).toBe(0);
 } finally { await db.publicEventRequest.deleteMany({ where: { email: data.email } }); await db.$disconnect(); }
});
it.each([{requestedDate:"2028-02-30"},{email:"incorrecto"},{role:"GERENTE"},{message:"corto"}])("rechaza datos inválidos sin escribir: %j", async invalid => {
 const create = vi.fn(); const api = request(createApp({ db: { publicEventRequest: { create } }, webOrigin: "http://localhost:3000" }));
 expect((await api.post("/api/v1/public/requests").send({...data,...invalid})).status).toBe(400);
 expect(create).not.toHaveBeenCalled();
});
it("limita solicitudes repetidas y rechaza orígenes ajenos", async () => {
 const create = vi.fn().mockResolvedValue({});
 const api = request(createApp({ db: { publicEventRequest: { create } }, webOrigin: "http://localhost:3000" }));
 expect((await api.post("/api/v1/public/requests").set("Origin","https://otro.example").send(data)).status).toBe(403);
 for(let i=0;i<5;i++) expect((await api.post("/api/v1/public/requests").send(data)).status).toBe(201);
 expect((await api.post("/api/v1/public/requests").send(data)).status).toBe(429);
 expect(create).toHaveBeenCalledTimes(5);
});
