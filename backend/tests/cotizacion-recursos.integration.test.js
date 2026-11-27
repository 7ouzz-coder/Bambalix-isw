import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { quoteService } from "../src/services/cotizaciones.service.js";

const url = process.env.TEST_DATABASE_URL;
const enabled = Boolean(url && new URL(url).hostname === "127.0.0.1" && new URL(url).pathname.endsWith("_test"));

describe.skipIf(!enabled)("Disponibilidad al editar cotizaciones", () => {
  it("espera una mantención concurrente y rechaza la cotización", async () => {
    const db = new PrismaClient({ datasources: { db: { url } } });
    const suffix = randomUUID();
    let client, type, event, vehicle;
    let unlock;
    try {
      client = await db.client.create({ data: { name: "Cliente QA", email: `${suffix}@example.test` } });
      type = await db.eventType.create({ data: { name: suffix } });
      const startsAt = new Date("2033-05-01T10:00:00Z");
      const endsAt = new Date("2033-05-01T12:00:00Z");
      event = await db.event.create({ data: { title: "Evento QA", clientId: client.id, eventTypeId: type.id, startsAt, endsAt, attendees: 1 } });
      vehicle = await db.vehicle.create({ data: { name: "Vehículo QA", type: "Furgón", plate: suffix.slice(0, 12), status: "OPERATIONAL" } });
      let locked;
      const acquired = new Promise(resolve => { locked = resolve; });
      const release = new Promise(resolve => { unlock = resolve; });
      const maintenance = db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${vehicle.id} FOR UPDATE`;
        locked();
        await release;
        await tx.vehicleMaintenance.create({ data: { vehicleId: vehicle.id, startsAt, endsAt, reason: "Concurrencia QA" } });
      }, { timeout: 10000 });
      await acquired;
      const quote = quoteService(db).crear({ clientId: client.id, eventId: event.id, items: [{ concept: "Traslado", quantity: 1, unitPrice: 20000, vehicleId: vehicle.id }] });
      const outcome = quote.then(() => null, error => error);
      let waiting = false;
      for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
        const rows = await db.$queryRaw`SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%"Vehicle"%FOR UPDATE%'`;
        waiting = rows.length > 0;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      unlock();
      await maintenance;
      expect(await outcome).toMatchObject({ statusCode: 409 });
      expect(await db.quote.count({ where: { eventId: event.id } })).toBe(0);
    } finally {
      if (unlock) unlock();
      if (vehicle) { await db.vehicleMaintenance.deleteMany({ where: { vehicleId: vehicle.id } }); await db.vehicle.deleteMany({ where: { id: vehicle.id } }); }
      if (event) await db.event.deleteMany({ where: { id: event.id } });
      if (type) await db.eventType.deleteMany({ where: { id: type.id } });
      if (client) await db.client.deleteMany({ where: { id: client.id } });
      await db.$disconnect();
    }
  });

  it("rechaza un recurso que entró en mantención sin alterar el borrador", async () => {
    const db = new PrismaClient({ datasources: { db: { url } } });
    const suffix = randomUUID();
    let client, type, event, vehicle, quote;
    try {
      client = await db.client.create({ data: { name: "Cliente QA", email: `${suffix}@example.test` } });
      type = await db.eventType.create({ data: { name: suffix } });
      const startsAt = new Date("2032-05-01T10:00:00Z");
      const endsAt = new Date("2032-05-01T12:00:00Z");
      event = await db.event.create({ data: { title: "Evento QA", clientId: client.id, eventTypeId: type.id, startsAt, endsAt, attendees: 1 } });
      vehicle = await db.vehicle.create({ data: { name: "Vehículo QA", type: "Furgón", plate: suffix.slice(0, 12), status: "OPERATIONAL" } });
      const data = { clientId: client.id, eventId: event.id, items: [{ concept: "Traslado", quantity: 1, unitPrice: 20000, vehicleId: vehicle.id }] };
      quote = await quoteService(db).crear(data);
      await db.vehicleMaintenance.create({ data: { vehicleId: vehicle.id, startsAt, endsAt, reason: "Revisión QA" } });
      await expect(quoteService(db).editarBorrador(quote.id, { ...data, notes: "Cambio rechazado" }))
        .rejects.toMatchObject({ statusCode: 409 });
      const stored = await db.quote.findUniqueOrThrow({ where: { id: quote.id }, include: { items: true } });
      expect(stored.notes).toBeNull();
      expect(stored.items).toHaveLength(1);
      expect(stored.items[0].vehicleId).toBe(vehicle.id);
      expect(Number(stored.total)).toBe(20000);
    } finally {
      if (quote) await db.quote.deleteMany({ where: { id: quote.id } });
      if (vehicle) { await db.vehicleMaintenance.deleteMany({ where: { vehicleId: vehicle.id } }); await db.vehicle.deleteMany({ where: { id: vehicle.id } }); }
      if (event) await db.event.deleteMany({ where: { id: event.id } });
      if (type) await db.eventType.deleteMany({ where: { id: type.id } });
      if (client) await db.client.deleteMany({ where: { id: client.id } });
      await db.$disconnect();
    }
  });
});
