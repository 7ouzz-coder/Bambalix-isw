import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createInternalUser } from "../src/services/sesiones.service.js";
import { listPublicRequests } from "../src/services/solicitudes-internas.service.js";
const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1" || !new URL(url).pathname.endsWith("_test")) throw Error("Usa PostgreSQL exclusivo de pruebas");
const db = new PrismaClient({datasources:{db:{url}}});
const origin = "http://localhost:3000";
const app = createApp({db,webOrigin:origin});
const password = randomUUID();
let account, record;
let cookie;
beforeAll(async () => {
  account = await createInternalUser(db,{name:"Cuenta bandeja",email:`${randomUUID()}@example.test`,password,role:"GERENTE"});
  const login = await request(app).post("/api/v1/auth/login").send({email:account.email,password});
  cookie = login.headers['set-cookie'][0].split(';')[0];
});
afterAll(async () => {
  if (record) await db.publicEventRequest.deleteMany({where:{id:record.id}});
  if (account) await db.internalUser.delete({where:{id:account.id}});
  await db.$disconnect();
});
describe("Bandeja interna", () => {
  it("no publica contactos mediante la ruta pública ni sin sesión", async () => {
    expect((await request(app).get('/api/v1/requests').set('x-user-role','GERENTE')).status).toBe(401);
    const publicResponse=await request(app).get('/api/v1/public/requests');
    expect(publicResponse.status).toBe(401);
    expect(publicResponse.body.items).toBeUndefined();
  });
  it("un cargo de gerente sin permiso explícito no da acceso", async () => {
    expect((await request(app).get('/api/v1/requests').set('Cookie',cookie)).status).toBe(403);
  });
  it("consulta lo enviado desde la landing con sesión y permiso exclusivos de la prueba", async () => {
    const input={name:'Consulta bandeja',email:`${randomUUID()}@example.test`,phone:'',requestedDate:'2028-09-12',service:'Seminarios y congresos',message:'Necesitamos apoyo técnico para el seminario.'};
    expect((await request(app).post('/api/v1/public/requests').send(input)).status).toBe(201);
    record=await db.publicEventRequest.findFirstOrThrow({where:{email:input.email}});
    await db.internalUser.update({where:{id:account.id},data:{permissions:['solicitudes:leer']}});
    const response=await request(app).get('/api/v1/requests').set('Cookie',cookie);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.items.find(item=>item.id===record.id)).toMatchObject({name:input.name,email:input.email,requestedDate:input.requestedDate,message:input.message});
    expect((await request(app).post('/api/v1/requests').set('Cookie',cookie).send({})).status).toBe(403);
    for (const query of ['page=0','page=-1','page=1.5','page=10001','page=abc','page=1&role=GERENTE'])
      expect((await request(app).get('/api/v1/requests?'+query).set('Cookie',cookie)).status).toBe(400);
  });
});
it("limita y ordena las páginas, ajustando una página fuera del listado", async () => {
  const findMany=vi.fn().mockResolvedValue([{id:'ultima'}]);
  const result=await listPublicRequests({publicEventRequest:{count:async()=>21,findMany}},{page:9});
  expect(result).toMatchObject({page:2,pages:2,total:21});
  expect(findMany.mock.calls[0][0]).toMatchObject({skip:20,take:20,orderBy:[{createdAt:'desc'},{id:'desc'}]});
});
it("devuelve una página vacía estable cuando no hay solicitudes", async () => {
  expect(await listPublicRequests({publicEventRequest:{count:async()=>0,findMany:async()=>[]}},{page:1})).toEqual({items:[],total:0,pages:1,page:1});
});
