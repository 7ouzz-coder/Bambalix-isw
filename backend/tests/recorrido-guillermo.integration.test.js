import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/services/sesiones.service.js";

const url = process.env.TEST_DATABASE_URL;
const localTest = url && new URL(url).hostname === "127.0.0.1" && new URL(url).pathname.endsWith("_test");

it.skipIf(!localTest)("ejecuta el recorrido de Operaciones con sesiones y PostgreSQL", async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const suffix = randomUUID();
  const password = "OperacionesQAPrueba123!";
  const origin = "http://localhost:3000";
  const app = createApp({ db, webOrigin: origin, secureCookies: false });
  const api = "/api/v1";
  const resources = api + "/operations/resources";
  const vehicles = api + "/operations/vehicles";
  const start = new Date(Date.now() - 60000).toISOString();
  const end = new Date(Date.now() + 3600000).toISOString();
  const period = { startsAt: start, endsAt: end };
  let equipment, vehicle, event, type, client;
  const users = [];

  async function login(tag, permissions) {
    const email = tag.toLowerCase() + suffix + "@example.test";
    const user = await db.internalUser.create({
      data: { name: tag, email, role: "INTERNO", permissions, passwordHash: await hashPassword(password) },
    });
    users.push(user.id);
    const agent = request.agent(app);
    const response = await agent.post(api + "/auth/login").send({ email, password }).expect(200);
    return { agent, csrf: response.body.csrfToken };
  }

  try {
    const writer = await login("Operaciones", ["recursos:leer", "recursos:editar"]);
    const reader = await login("Lectura", ["recursos:leer"]);
    const commercial = await login("Comercial", ["cotizaciones:leer"]);
    const write = req => req.set("X-CSRF-Token", writer.csrf);
    await request(app).get(resources).expect(401);
    await reader.agent.get(resources).expect(200);
    await reader.agent.post(vehicles).set("X-CSRF-Token", reader.csrf).send({}).expect(403);
    await writer.agent.post(vehicles).send({}).expect(403);
    await commercial.agent.get(resources).expect(403);
    await write(writer.agent.post(vehicles)).send({ name: "Furgón QA", type: "Furgón", plate: "ABC123" }).expect(400);
    vehicle = (await write(writer.agent.post(vehicles)).send({
      name: "Furgón QA " + suffix, type: "Furgón", plate: "QB-47-11", status: "OPERATIONAL",
    }).expect(201)).body;
    expect(vehicle.plate).toBe("QB4711");
    equipment = (await write(writer.agent.post(resources)).send({
      name: "Equipo QA " + suffix, category: "Audio QA " + suffix, mode: "UNIT", quantity: 1,
    }).expect(201)).body;
    const equipmentPath = resources + "/" + equipment.id;
    const vehiclePath = vehicles + "/" + vehicle.id;
    await write(writer.agent.patch(equipmentPath + "/status")).send({
      status: "OPERATIONAL", revision: equipment.revision, reason: "Revisión QA",
    }).expect(200);
    client = await db.client.create({ data: { name: "Cliente QA", email: suffix + "@example.test" } });
    type = await db.eventType.create({ data: { name: suffix } });
    event = await db.event.create({ data: {
      title: "Evento QA", clientId: client.id, eventTypeId: type.id, startsAt: start, endsAt: end, attendees: 1,
    } });
    const availability = api + "/quote-resources/" + event.id;
    await writer.agent.get(availability).expect(403);
    const initial = await commercial.agent.get(availability).expect(200);
    expect(initial.body.equipos.some(item => item.id === equipment.id)).toBe(true);
    expect(initial.body.vehiculos.some(item => item.id === vehicle.id)).toBe(true);
    await write(writer.agent.post(vehiclePath + "/maintenances")).send({ ...period, endsAt: start, reason: "Inválido" }).expect(400);
    await write(writer.agent.post(vehiclePath + "/maintenances")).send({ ...period, reason: "Mantención QA" }).expect(201);
    const maintenance = (await write(writer.agent.post(equipmentPath + "/maintenances")).send({ ...period, reason: "Mantención QA" }).expect(201)).body;
    const photo = equipmentPath + "/maintenances/" + maintenance.id + "/photos/";
    const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
    await write(writer.agent.post(photo + "before")).type("png").send(Buffer.from("texto")).expect(400);
    for (const stage of ["before", "after"]) {
      await write(writer.agent.post(photo + stage)).type("png").send(image).expect(204);
      expect((await reader.agent.get(photo + stage).expect(200)).body).toEqual(image);
    }
    const busy = await commercial.agent.get(availability).expect(200);
    expect(busy.body.equipos.some(item => item.id === equipment.id)).toBe(false);
    expect(busy.body.vehiculos.some(item => item.id === vehicle.id)).toBe(false);
    await write(writer.agent.post(vehiclePath + "/assignments")).send({ eventId: event.id, ...period }).expect(409);
    await write(writer.agent.post(equipmentPath + "/assignments")).send({ eventId: event.id, ...period }).expect(409);
    const later = { startsAt: new Date(Date.now() + 86400000).toISOString(), endsAt: new Date(Date.now() + 90000000).toISOString() };
    await db.event.update({ where: { id: event.id }, data: later });
    await write(writer.agent.post(vehiclePath + "/assignments")).send({ eventId: event.id, ...later }).expect(201);
    const assignment = (await write(writer.agent.post(equipmentPath + "/assignments")).send({ eventId: event.id, ...later }).expect(201)).body;
    const incidents = equipmentPath + "/assignments/" + assignment.id + "/incidents";
    await write(writer.agent.post(incidents)).send({ description: " " }).expect(400);
    await write(writer.agent.post(incidents)).send({ description: "Equipo perdió señal" }).expect(201);
    expect((await reader.agent.get(incidents).expect(200)).body[0].description).toBe("Equipo perdió señal");
    await write(writer.agent.patch(equipmentPath + "/assignments/" + assignment.id + "/replacements/qa/decision")).send({}).expect(403);
    await write(writer.agent.delete(vehiclePath)).expect(409);
  } finally {
    if (equipment) {
      const where = { resourceId: equipment.id };
      await db.equipmentIncident.deleteMany({ where: { assignment: where } });
      await db.equipmentAssignment.deleteMany({ where });
      await db.equipmentMaintenance.deleteMany({ where });
      await db.equipmentStatusChange.deleteMany({ where });
      await db.resource.deleteMany({ where: { id: equipment.id } });
      await db.equipmentCategory.deleteMany({ where: { name: equipment.category } });
    }
    if (vehicle) {
      await db.vehicleAssignment.deleteMany({ where: { vehicleId: vehicle.id } });
      await db.vehicleMaintenance.deleteMany({ where: { vehicleId: vehicle.id } });
      await db.vehicle.deleteMany({ where: { id: vehicle.id } });
    }
    if (event) await db.event.deleteMany({ where: { id: event.id } });
    if (type) await db.eventType.deleteMany({ where: { id: type.id } });
    if (client) await db.client.deleteMany({ where: { id: client.id } });
    await db.internalSession.deleteMany({ where: { userId: { in: users } } });
    await db.internalUser.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
}, 15000);
