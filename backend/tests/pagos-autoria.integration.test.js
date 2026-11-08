import { it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createInternalUser } from "../src/services/sesiones.service.js";
import { paymentService } from "../src/services/pagos.service.js";

const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1" || !new URL(url).pathname.endsWith("_test")) throw new Error("Usa una base local exclusiva de pruebas");
it("atribuye el pago a la sesión real y rechaza autoría enviada desde el navegador", async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const suffix = randomUUID();
  const password = `Prueba-${suffix}`;
  let user, client, type, event, quote;
  try {
    user = await createInternalUser(db, { name: "Operador de prueba", email: `${suffix}@example.test`, password, role: "PRODUCCION", permissions: ["pagos:registrar"] });
    client = await db.client.create({ data: { name: "Cliente autoría", email: `${suffix}@example.test` } });
    type = await db.eventType.create({ data: { name: suffix } });
    event = await db.event.create({ data: { title: "Evento autoría", clientId: client.id, eventTypeId: type.id, attendees: 10, startsAt: new Date("2028-06-01T10:00:00Z"), endsAt: new Date("2028-06-01T12:00:00Z") } });
    quote = await db.quote.create({ data: { code: suffix, clientId: client.id, eventId: event.id, total: 100 } });
    const api = request(createApp({ db, webOrigin: "http://localhost:3000" }));
    const login = await api.post("/api/v1/auth/login").send({ email: user.email, password });
    expect(login.status).toBe(200);
    const cookie = login.headers["set-cookie"][0].split(";")[0];
    const payload = { quoteId: quote.id, amount: 50, method: "EFECTIVO" };
    const send = body => api.post("/api/v1/payments").set("Cookie", cookie).set("x-csrf-token", login.body.csrfToken).send(body);
    expect((await send({ ...payload, registeredBy: "otra-persona" })).status).toBe(400);
    expect(await db.payment.count({ where: { quoteId: quote.id } })).toBe(0);
    const result = await send(payload);
    expect(result.status).toBe(201);
    const stored = await db.payment.findUnique({ where: { id: result.body.id } });
    expect(stored.registeredBy).toBe(user.id);
    expect(stored.status).toBe("REGISTRADO");
    expect((await api.post(`/api/v1/payments/${stored.id}/verify`).set("Cookie", cookie).set("x-csrf-token", login.body.csrfToken).send({})).status).toBe(403);
    await expect(paymentService(db).registrarRecepcion(payload)).rejects.toMatchObject({ statusCode: 401 });
  } finally {
    if (quote) { await db.payment.deleteMany({ where: { quoteId: quote.id } }); await db.quote.delete({ where: { id: quote.id } }); }
    if (event) await db.event.delete({ where: { id: event.id } });
    if (type) await db.eventType.delete({ where: { id: type.id } });
    if (client) await db.client.delete({ where: { id: client.id } });
    if (user) await db.internalUser.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
