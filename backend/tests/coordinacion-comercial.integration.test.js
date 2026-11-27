import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { quoteService } from "../src/services/cotizaciones.service.js";
import { paymentService } from "../src/services/pagos.service.js";

const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1" || !new URL(url).pathname.endsWith("_test"))
  throw new Error("Se requiere una base local de pruebas");
const db = new PrismaClient({ datasources: { db: { url } } });
const marker = randomUUID();
const manager = { id: "gerente-qa", name: "Gerente QA", role: "GERENTE", authenticated: true };
let client, type;
const eventIds = [];
beforeAll(async () => {
  client = await db.client.create({ data: { name: "Cliente QA", email: marker + "@example.test" } });
  type = await db.eventType.create({ data: { name: marker } });
});
afterAll(async () => {
  await db.payment.deleteMany({ where: { quote: { eventId: { in: eventIds } } } });
  await db.quote.deleteMany({ where: { eventId: { in: eventIds } } });
  await db.event.deleteMany({ where: { id: { in: eventIds } } });
  if (type) await db.eventType.delete({ where: { id: type.id } });
  if (client) await db.client.delete({ where: { id: client.id } });
  await db.$disconnect();
});
async function setup() {
  const event = await db.event.create({ data: {
    title: "Evento QA", clientId: client.id, eventTypeId: type.id,
    startsAt: new Date("2032-05-01T12:00:00Z"), endsAt: new Date("2032-05-01T14:00:00Z"), attendees: 1,
  } });
  eventIds.push(event.id);
  const quote = await db.quote.create({ data: { code: randomUUID(), eventId: event.id, clientId: client.id, total: 100, status: "EN_REVISION" } });
  const payment = await db.payment.create({ data: { quoteId: quote.id, amount: 50, method: "EFECTIVO", status: "REGISTRADO" } });
  return { quote, payment };
}
const approve = quote => quoteService(db).aprobar(quote.id, manager);
const verify = payment => paymentService(db, { authorizePaymentVerification: async () => true }).verificar(payment.id, manager);
describe("Coordinación comercial", () => {
  it.each(["aprobación primero", "abono primero", "simultáneos"])("%s", async order => {
    const { quote, payment } = await setup();
    if (order === "aprobación primero") { await approve(quote); await verify(payment); }
    if (order === "abono primero") { await verify(payment); await approve(quote); }
    if (order === "simultáneos") await Promise.all([approve(quote), verify(payment)]);
    expect((await db.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("APROBADA");
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "VERIFICADO", verifiedBy: manager.id });
  });
  it("evita verificar dos veces un mismo abono concurrentemente", async () => {
    const { payment } = await setup();
    const results = await Promise.allSettled([verify(payment), verify(payment)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
  });
  it("usa el mismo bloqueo transaccional en ambas decisiones", async () => {
    const { quote, payment } = await setup();
    for (const action of [() => approve(quote), () => verify(payment)]) {
      let release;
      const held = new Promise(resolve => { release = resolve; });
      let locked;
      const ready = new Promise(resolve => { locked = resolve; });
      const holder = db.$transaction(async tx => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('bambalix_confirmacion_agenda')) IS NOT NULL AS locked`;
        locked();
        await held;
      });
      await ready;
      let completed = false;
      const operation = action().then(result => { completed = true; return result; });
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(completed).toBe(false);
      release();
      await Promise.all([holder, operation]);
      expect(completed).toBe(true);
    }
  });
});
