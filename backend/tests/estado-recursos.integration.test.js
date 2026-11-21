import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { listarPaginaEquipos } from "../src/services/equipos.service.js";
import { listarPaginaVehiculos } from "../src/services/vehiculos.service.js";
import { listarRecursosCotizacion } from "../src/services/disponibilidad-cotizacion.service.js";

const url = process.env.TEST_DATABASE_URL;
const enabled = Boolean(url && new URL(url).hostname === "127.0.0.1" && new URL(url).pathname.endsWith("_test"));
describe.skipIf(!enabled)("Estado actual por horario", () => {
  it("calcula mantenciones actuales, futuras y vencidas sin cambiar el estado operativo", async () => {
    const db = new PrismaClient({ datasources: { db: { url } } });
    const name = `Estado ${randomUUID()}`;
    const now = Date.now();
    const before = new Date(now - 60_000), after = new Date(now + 60_000);
    let equipment, vehicle, client, type, event;
    try {
      equipment = await db.resource.create({ data: { name, category: "Prueba", mode: "UNIT", quantity: 1, status: "OPERATIONAL" } });
      vehicle = await db.vehicle.create({ data: { name, type: "Prueba", plate: `T${randomUUID()}`, status: "OPERATIONAL" } });
      await db.equipmentMaintenance.create({ data: { resourceId: equipment.id, startsAt: before, endsAt: after, reason: "Prueba" } });
      await db.vehicleMaintenance.create({ data: { vehicleId: vehicle.id, startsAt: before, endsAt: after, reason: "Prueba" } });
      let e = (await listarPaginaEquipos(db, { name })).items[0];
      let v = (await listarPaginaVehiculos(db, { q: name })).items[0];
      expect([e.currentStatus, v.currentStatus]).toEqual(["MAINTENANCE", "MAINTENANCE"]);
      expect(e.status).toBe("OPERATIONAL");
      await db.equipmentMaintenance.updateMany({ where: { resourceId: equipment.id }, data: { startsAt: new Date(now + 120_000), endsAt: new Date(now + 180_000) } });
      await db.vehicleMaintenance.updateMany({ where: { vehicleId: vehicle.id }, data: { startsAt: new Date(now - 180_000), endsAt: before } });
      e = (await listarPaginaEquipos(db, { name })).items[0];
      v = (await listarPaginaVehiculos(db, { q: name })).items[0];
      expect([e.currentStatus, v.currentStatus]).toEqual(["OPERATIONAL", "AVAILABLE"]);
      client = await db.client.create({ data: { name, email: `${randomUUID()}@example.test` } });
      type = await db.eventType.create({ data: { name } });
      event = await db.event.create({ data: { title: name, clientId: client.id, eventTypeId: type.id, startsAt: before, endsAt: after, attendees: 1 } });
      await db.equipmentAssignment.create({ data: { resourceId: equipment.id, eventId: event.id, startsAt: before, endsAt: after } });
      await db.vehicleAssignment.create({ data: { vehicleId: vehicle.id, eventId: event.id, startsAt: before, endsAt: after } });
      expect((await listarPaginaEquipos(db, { name })).items[0].currentStatus).toBe("OCCUPIED");
      expect((await listarPaginaVehiculos(db, { q: name })).items[0].currentStatus).toBe("OCCUPIED");
      await db.resource.update({ where: { id: equipment.id }, data: { status: "DAMAGED" } });
      expect((await listarPaginaEquipos(db, { name })).items[0].currentStatus).toBe("DAMAGED");
      await db.vehicle.update({ where: { id: vehicle.id }, data: { status: "DAMAGED" } });
      expect((await listarPaginaVehiculos(db, { q: name })).items[0].currentStatus).toBe("DAMAGED");
      const disponibles = await listarRecursosCotizacion(db, event.id);
      expect(disponibles.vehiculos.some(item => item.id === vehicle.id)).toBe(false);
      expect(disponibles.equipos.some(item => item.id === equipment.id)).toBe(false);
    } finally {
      if (equipment) { await db.equipmentAssignment.deleteMany({ where: { resourceId: equipment.id } }); await db.equipmentMaintenance.deleteMany({ where: { resourceId: equipment.id } }); await db.resource.delete({ where: { id: equipment.id } }); }
      if (vehicle) { await db.vehicleAssignment.deleteMany({ where: { vehicleId: vehicle.id } }); await db.vehicleMaintenance.deleteMany({ where: { vehicleId: vehicle.id } }); await db.vehicle.delete({ where: { id: vehicle.id } }); }
      if (event) await db.event.delete({ where: { id: event.id } });
      if (type) await db.eventType.delete({ where: { id: type.id } });
      if (client) await db.client.delete({ where: { id: client.id } });
      await db.$disconnect();
    }
  });
});
