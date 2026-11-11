import { it, expect, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { createApp } from "../src/app.js";
import { publicRequestLimit } from "../src/middlewares/solicitudes-publicas.validation.js";
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
it("informa el tiempo restante del límite de solicitudes", () => {
 const clock = vi.spyOn(Date, "now").mockReturnValue(1000000);
 try {
  const limit = publicRequestLimit(); const req = { ip: "127.0.0.1" };
  const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  for (let i = 0; i < 5; i++) limit(req, res, next);
  clock.mockReturnValue(1300000);
  limit(req, res, next);
  expect(next).toHaveBeenCalledTimes(5);
  expect(res.set).toHaveBeenCalledWith("Retry-After", "300");
  expect(res.status).toHaveBeenCalledWith(429);
  clock.mockReturnValue(1600000);
  limit(req, res, next);
  expect(next).toHaveBeenCalledTimes(6);
 } finally { clock.mockRestore(); }
});
it('evita duplicados en reintentos y peticiones simultáneas con la misma clave', async () => {
 const { randomUUID } = await import('node:crypto');
 const url = process.env.TEST_DATABASE_URL;
 if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.endsWith('_test')) throw new Error('Base local de pruebas requerida');
 const db = new PrismaClient({ datasources: { db: { url } } });
 const api = request(createApp({ db, webOrigin: 'http://localhost:3000' }));
 const key = randomUUID(), input = { ...data, email: `${randomUUID()}@example.test` };
 try {
  const send = body => api.post('/api/v1/public/requests').set('Idempotency-Key', key).send(body);
  const results = await Promise.all([send(input), send(input)]);
  expect(results.map(result => result.status)).toEqual([201,201]);
  expect(results[0].body).toEqual(results[1].body);
  expect(await db.publicEventRequest.count({where:{email:input.email}})).toBe(1);
  expect((await send(input)).status).toBe(201);
  expect((await send({...input,message:'Una solicitud diferente del cliente.'})).status).toBe(409);
  expect(await db.publicEventRequest.count({where:{email:input.email}})).toBe(1);
  expect((await api.post('/api/v1/public/requests').set('Idempotency-Key','no-valida').send(input)).status).toBe(400);
 } finally {await db.publicEventRequest.deleteMany({where:{email:input.email}});await db.$disconnect();}
});
it.each([
 {name:'Otro nombre'},
 {email:'otro@example.test'},
 {phone:'123456789'},
 {requestedDate:'2028-07-11'},
 {service:'Shows y conciertos'},
 {message:'Una descripción diferente para la solicitud.'},
])('rechaza la misma clave cuando cambia un dato: %j', async change => {
 const {randomUUID}=await import('node:crypto');
 const url=process.env.TEST_DATABASE_URL;
 if (!url || new URL(url).hostname!=='127.0.0.1' || !new URL(url).pathname.endsWith('_test')) throw new Error('Base local de pruebas requerida');
 const db=new PrismaClient({datasources:{db:{url}}});const api=request(createApp({db,webOrigin:'http://localhost:3000'}));
 const key=randomUUID(), input={...data,email:`${randomUUID()}@example.test`};
 try {
  expect((await api.post('/api/v1/public/requests').set('Idempotency-Key',key).send(input)).status).toBe(201);
  expect((await api.post('/api/v1/public/requests').set('Idempotency-Key',key).send({...input,phone:'',...change})).status).toBe(409);
  expect(await db.publicEventRequest.count({where:{idempotencyKey:key}})).toBe(1);
 } finally {await db.publicEventRequest.deleteMany({where:{idempotencyKey:key}});await db.$disconnect();}
});
it('acepta el reintento si el teléfono opcional se omitió o se envió vacío', async () => {
 const {randomUUID}=await import('node:crypto');const url=process.env.TEST_DATABASE_URL;
 if (!url || new URL(url).hostname!=='127.0.0.1' || !new URL(url).pathname.endsWith('_test')) throw new Error('Base local de pruebas requerida');
 const db=new PrismaClient({datasources:{db:{url}}});const api=request(createApp({db,webOrigin:'http://localhost:3000'}));
 const key=randomUUID(), input={...data,email:`${randomUUID()}@example.test`};
 try {
  expect((await api.post('/api/v1/public/requests').set('Idempotency-Key',key).send(input)).status).toBe(201);
  expect((await api.post('/api/v1/public/requests').set('Idempotency-Key',key).send({...input,phone:''})).status).toBe(201);
  expect(await db.publicEventRequest.count({where:{idempotencyKey:key}})).toBe(1);
 } finally {await db.publicEventRequest.deleteMany({where:{idempotencyKey:key}});await db.$disconnect();}
});
