import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createInternalUser, hashToken } from "../src/services/sesiones.service.js";
const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1" || !new URL(url).pathname.endsWith("_test")) throw new Error("Usa PostgreSQL local exclusivo de pruebas");
const db = new PrismaClient({ datasources: { db: { url } } });
const origin = "http://localhost:3000";
let app;
beforeEach(() => { app = createApp({ db, webOrigin: origin }); });
const password = `Prueba-${randomUUID()}`;
let user;
const cookie = response => response.headers['set-cookie'][0].split(';')[0];
async function signIn(application = app) { return request(application).post('/api/v1/auth/login').set('Origin', origin).send({ email: user.email, password }); }
beforeAll(async () => { user = await createInternalUser(db, { email: `${randomUUID()}@example.test`, name: "Operador prueba", password, role: "OPERACIONES", permissions: ['recursos:leer', 'recursos:editar'] }); });
afterAll(async () => { if (user) await db.internalUser.delete({ where: { id: user.id } }); await db.$disconnect(); });

describe('Sesión real y permisos', () => {
  it('rechaza lecturas y escrituras internas sin sesión; no confía en cabeceras', async () => {
    for (const path of ['/clients', '/events', '/quotes', '/payments', '/operations/resources', '/operations/vehicles']) {
      expect((await request(app).get('/api/v1'+path).set('x-user-role','gerente')).status).toBe(401);
    }
    expect((await request(app).post('/api/v1/clients').send({role:'GERENTE'})).status).toBe(401);
    const publicRes = await request(app).get('/api/v1/events/public');
    expect(publicRes.status).toBe(200);
    expect(Array.isArray(publicRes.body)).toBe(true);
  });

  it('la agenda pública responde 200 sin sesión, protege datos privados y publica solo confirmados', async () => {
    const marker = randomUUID();
    let client, type, unconfirmedEvent, confirmedEvent;
    try {
      client = await db.client.create({
        data: {
          name: `Cliente Privado ${marker}`,
          email: `${marker}@cliente-privado.test`,
          phone: "+56912345678",
        },
      });
      type = await db.eventType.create({
        data: { name: `Tipo ${marker}` },
      });

      // Evento 1: no confirmado (cotización en borrador / sin 50% verificado)
      unconfirmedEvent = await db.event.create({
        data: {
          title: `Título Privado No Confirmado ${marker}`,
          clientId: client.id,
          eventTypeId: type.id,
          startsAt: new Date("2033-01-10T12:00:00Z"),
          endsAt: new Date("2033-01-10T15:00:00Z"),
          attendees: 100,
          location: "Ubicación Secreta 1",
          needs: "Necesidades estrictamente confidenciales 1",
        },
      });
      const quoteUnconfirmed = await db.quote.create({
        data: {
          code: `COT-${randomUUID().slice(0, 8)}`,
          clientId: client.id,
          eventId: unconfirmedEvent.id,
          status: "EN_REVISION",
          total: 100000,
        },
      });
      await db.payment.create({
        data: {
          quoteId: quoteUnconfirmed.id,
          amount: 20000,
          method: "TRANSFERENCIA",
          status: "REGISTRADO", // Menos del 50% y solo registrado
        },
      });

      // Evento 2: confirmado (cotización APROBADA y pagos VERIFICADOS >= 50%)
      confirmedEvent = await db.event.create({
        data: {
          title: `Título Privado Confirmado ${marker}`,
          clientId: client.id,
          eventTypeId: type.id,
          startsAt: new Date("2033-02-15T14:00:00Z"),
          endsAt: new Date("2033-02-15T18:00:00Z"),
          attendees: 250,
          location: "Ubicación Confidencial 2",
          needs: "Necesidades estrictamente confidenciales 2",
        },
      });
      const quoteConfirmed = await db.quote.create({
        data: {
          code: `COT-${randomUUID().slice(0, 8)}`,
          clientId: client.id,
          eventId: confirmedEvent.id,
          status: "APROBADA",
          total: 200000,
        },
      });
      await db.payment.create({
        data: {
          quoteId: quoteConfirmed.id,
          amount: 100000,
          method: "TRANSFERENCIA",
          status: "VERIFICADO",
        },
      });

      // Consulta pública sin sesión
      const res = await request(app).get("/api/v1/events/public");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // El evento sin confirmar NO debe aparecer publicado
      const unconfirmedFound = res.body.find((e) => e.id === unconfirmedEvent.id);
      expect(unconfirmedFound).toBeUndefined();

      // El evento confirmado sí debe aparecer publicado
      const confirmedFound = res.body.find((e) => e.id === confirmedEvent.id);
      expect(confirmedFound).toBeDefined();

      // Debe aparecer con título genérico «Evento confirmado»
      expect(confirmedFound.title).toBe("Evento confirmado");
      expect(confirmedFound.title).not.toContain("Título Privado Confirmado");

      // No debe exponer datos internos de clientes, asistentes, necesidades ni ubicación
      expect(confirmedFound.client).toBeUndefined();
      expect(confirmedFound.clientId).toBeUndefined();
      expect(confirmedFound.attendees).toBeUndefined();
      expect(confirmedFound.needs).toBeUndefined();
      expect(confirmedFound.location).toBeUndefined();
      expect(confirmedFound.quotes).toBeUndefined();
    } finally {
      if (confirmedEvent) {
        await db.payment.deleteMany({ where: { quote: { eventId: confirmedEvent.id } } });
        await db.quote.deleteMany({ where: { eventId: confirmedEvent.id } });
        await db.event.delete({ where: { id: confirmedEvent.id } });
      }
      if (unconfirmedEvent) {
        await db.payment.deleteMany({ where: { quote: { eventId: unconfirmedEvent.id } } });
        await db.quote.deleteMany({ where: { eventId: unconfirmedEvent.id } });
        await db.event.delete({ where: { id: unconfirmedEvent.id } });
      }
      if (type) await db.eventType.delete({ where: { id: type.id } });
      if (client) await db.client.delete({ where: { id: client.id } });
    }
  });
  it('mantiene contraseña y token protegidos; la sesión sobrevive a otra instancia de la aplicación', async () => {
    const response = await signIn(); expect(response.status).toBe(200);
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    const stored = await db.internalUser.findUnique({where:{id:user.id}});
    expect(stored.passwordHash).not.toContain(password);
    const token = cookie(response).split('=')[1];
    const session = await db.internalSession.findUnique({where:{tokenHash:hashToken(token)}});
    expect(session.tokenHash).not.toBe(token);
    const fresh = createApp({db,webOrigin:origin});
    expect((await request(fresh).get('/api/v1/auth/me').set('Cookie',cookie(response))).status).toBe(200);
  });
  it('admite el área permitida y rechaza otra, incluso manipulando rol', async () => {
    const response=await signIn();
    expect((await request(app).get('/api/v1/operations/resources/page').set('Cookie',cookie(response))).status).toBe(200);
    expect((await request(app).get('/api/v1/quotes').set('Cookie',cookie(response)).set('x-user-role','gerente')).status).toBe(403);
  });
  it('rechaza escritura sin CSRF y permite una escritura autorizada con CSRF real', async () => {
    const response=await signIn();
    const path='/api/v1/operations/resources';
    const body={name:'Equipo sesión',category:'Audio',code:randomUUID(),mode:'UNIT',quantity:1};
    expect((await request(app).post(path).set('Cookie',cookie(response)).send(body)).status).toBe(403);
    const saved=await request(app).post(path).set('Cookie',cookie(response)).set('x-csrf-token',response.body.csrfToken).send(body);
    expect(saved.status).toBe(201);
    await db.resource.delete({where:{id:saved.body.id}});
  });
  it('caduca y revoca sesiones; desactivar la cuenta anula su acceso', async () => {
    const response=await signIn();
    await db.internalSession.updateMany({where:{userId:user.id},data:{expiresAt:new Date(0)}});
    expect((await request(app).get('/api/v1/auth/me').set('Cookie',cookie(response))).status).toBe(401);
    const active=await signIn();
    await db.internalUser.update({where:{id:user.id},data:{active:false}});
    expect((await request(app).get('/api/v1/auth/me').set('Cookie',cookie(active))).status).toBe(401);
    await db.internalUser.update({where:{id:user.id},data:{active:true}});
  });
  it('logout invalida el token en la base', async () => {
    const response=await signIn();
    expect((await request(app).post('/api/v1/auth/logout').set('Cookie',cookie(response)).set('x-csrf-token',response.body.csrfToken)).status).toBe(204);
    expect((await request(app).get('/api/v1/auth/me').set('Cookie',cookie(response))).status).toBe(401);
  });
  it('cambiar permisos se refleja sin volver a autenticar', async () => {
    const response=await signIn();
    await db.internalUser.update({where:{id:user.id},data:{permissions:[]}});
    expect((await request(app).get('/api/v1/operations/resources/page').set('Cookie',cookie(response))).status).toBe(403);
    await db.internalUser.update({where:{id:user.id},data:{permissions:['recursos:leer','recursos:editar']}});
  });
  it('el login rechaza campos de rol y no revela si existe el correo', async () => {
    expect((await request(app).post('/api/v1/auth/login').send({email:user.email,password,role:'GERENTE'})).status).toBe(400);
    const wrong=await request(app).post('/api/v1/auth/login').send({email:user.email,password:'incorrecta'});
    const absent=await request(app).post('/api/v1/auth/login').send({email:'ausente@example.test',password:'incorrecta'});
    expect(wrong.status).toBe(401);expect(absent.body).toEqual(wrong.body);
  });
  it('bloquea el exceso de intentos', async () => {
    const fresh=createApp({db,webOrigin:origin});
    for(let i=0;i<10;i++) await request(fresh).post('/api/v1/auth/login').send({});
    expect((await request(fresh).post('/api/v1/auth/login').send({})).status).toBe(429);
  });
  it('la verificación del abono sigue bloqueada para un gerente con sesión real', async () => {
    await db.internalUser.update({where:{id:user.id},data:{role:'GERENTE'}});
    const fresh=createApp({db,webOrigin:origin});const response=await signIn(fresh);
    for(const [method,path] of [['post','/payments/x/verify']]) {
      expect((await request(fresh)[method]('/api/v1'+path).set('Cookie',cookie(response)).set('x-csrf-token',response.body.csrfToken).send({})).status).toBe(403);
    }
    await db.internalUser.update({where:{id:user.id},data:{role:'OPERACIONES'}});
  });
});

it('las cuentas nuevas no reciben permisos por el cargo, ni siquiera gerente', async () => {
  const account = await createInternalUser(db, { email: `${randomUUID()}@example.test`, name: 'Cuenta sin permisos', password, role: 'GERENTE' });
  try {
    expect(account.permissions).toEqual([]);
    const fresh=createApp({db,webOrigin:origin});
    const response=await request(fresh).post('/api/v1/auth/login').send({email:account.email,password});
    expect(response.status).toBe(200);
    for(const path of ['/clients','/events','/quotes','/payments','/operations/resources','/operations/vehicles']) {
      expect((await request(fresh).get('/api/v1'+path).set('Cookie',cookie(response))).status).toBe(403);
    }
  } finally { await db.internalUser.delete({where:{id:account.id}}); }
});
it('rechaza cookies manipuladas, CSRF incorrecto y orígenes distintos', async () => {
  const response=await signIn();
  expect((await request(app).get('/api/v1/auth/me').set('Cookie','bambalix_session='+'0'.repeat(64))).status).toBe(401);
  expect((await request(app).post('/api/v1/auth/logout').set('Cookie',cookie(response)).set('x-csrf-token','b'.repeat(64))).status).toBe(403);
  expect((await request(app).post('/api/v1/auth/login').set('Origin','http://otro.example').send({email:user.email,password})).status).toBe(403);
});
it('renueva la sesión al autenticar y envía cookies seguras en configuración de producción', async () => {
  const first=await signIn();
  const second=await request(app).post('/api/v1/auth/login').set('Cookie',cookie(first)).send({email:user.email,password});
  expect(second.status).toBe(200); expect(cookie(second)).not.toBe(cookie(first));
  expect((await request(app).get('/api/v1/auth/me').set('Cookie',cookie(first))).status).toBe(401);
  const secure=createApp({db,webOrigin:origin,secureCookies:true});
  expect((await signIn(secure)).headers['set-cookie'][0]).toContain('Secure');
});
