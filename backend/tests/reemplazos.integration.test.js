import express from "express";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../src/app.js";
import { decidirReemplazo } from "../src/services/reemplazos.service.js";

const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1" || !new URL(url).pathname.endsWith("_test")) throw new Error("Se requiere una base local de pruebas");
const db = new PrismaClient({ datasources: { db: { url } } });
const api = request(createApp({ db, webOrigin: "http://localhost:3000" }));
// Contexto de identidad inyectado solo por este servidor de pruebas, no por cabeceras.
function identifiedApi(user) {
  const app = express();
  app.use((req,_res,next) => { req.user = user; next(); });
  app.use(createApp({ db, webOrigin: "http://localhost:3000" }));
  return request(app);
}
const manager = identifiedApi({ id: "gerente-prueba", role: "gerente" });
const operations = identifiedApi({ id: "operaciones-prueba", role: "OPERACIONES" });
const dates = { startsAt: new Date("2028-05-01T10:00:00Z"), endsAt: new Date("2028-05-01T12:00:00Z") };
let client,type;
const ownedResourceIds = [];
beforeAll(async () => {
  client = await db.client.create({ data: { name: "Cliente reemplazos", email: "reemplazos@example.test" } });
  type = await db.eventType.create({ data: { name: `Reemplazos ${Date.now()}` } });
});
afterAll(async () => {
  try {
    await db.$transaction(async tx => {
      const resources = { in: ownedResourceIds };
      if (client) {
        await tx.equipmentReplacement.deleteMany({ where: { assignment: { event: { clientId: client.id } } } });
        await tx.equipmentAssignment.deleteMany({ where: { event: { clientId: client.id } } });
      }
      await tx.equipmentMaintenanceNote.deleteMany({ where: { maintenance: { resourceId: resources } } });
      await tx.equipmentMaintenance.deleteMany({ where: { resourceId: resources } });
      await tx.equipmentStatusChange.deleteMany({ where: { resourceId: resources } });
      await tx.resource.deleteMany({ where: { id: resources } });
      if (client) {
        await tx.event.deleteMany({ where: { clientId: client.id } });
        await tx.client.delete({ where: { id: client.id } });
      }
      if (type) await tx.eventType.delete({ where: { id: type.id } });
    });
  } finally { await db.$disconnect(); }
});
let serial = 0;
async function setup() {
  const suffix = `${Date.now()}-${++serial}`;
  const source = await db.resource.create({ data: { name: `Original ${suffix}`, category: "Audio", code: `OR-${suffix}`, status: "OPERATIONAL" } });
  ownedResourceIds.push(source.id);
  const target = await db.resource.create({ data: { name: `Alternativa ${suffix}`, category: "Audio", code: `AL-${suffix}`, status: "OPERATIONAL" } });
  ownedResourceIds.push(target.id);
  const event = await db.event.create({ data: { title: `Evento ${suffix}`, clientId: client.id, eventTypeId: type.id, attendees: 20, ...dates } });
  const assignment = await db.equipmentAssignment.create({ data: { resourceId: source.id, eventId: event.id, ...dates } });
  const path = `/api/v1/operations/resources/${source.id}/assignments/${assignment.id}/replacements`;
  return { source,target,event,assignment,path,body: { proposedResourceId: target.id, reason: "Falla de conectores", estimatedCost: "12500.10" } };
}
async function propose(f, body=f.body) {
  const res = await api.post(f.path).send(body);
  expect(res.status).toBe(201);
  return res.body;
}
const approve = { status: "APPROVED", reason: "Alternativa revisada y autorizada" };

describe("Reemplazos de equipos", () => {
  it("persiste una solicitud pendiente, con importe exacto y fechas tomadas del servidor", async () => {
    const f = await setup(); const item = await propose(f);
    const stored = await db.equipmentReplacement.findUnique({ where: { id: item.id } });
    expect(stored.status).toBe("PENDING"); expect(stored.estimatedCost.toFixed(2)).toBe("12500.10");
    expect(stored.startsAt.toISOString()).toBe(dates.startsAt.toISOString());
    expect(stored.eventEndsAt.toISOString()).toBe(dates.endsAt.toISOString());
    expect(stored.requestedById).toBeNull(); expect(stored.decidedAt).toBeNull();
    const listed = await api.get(f.path);
    expect(listed.body).toMatchObject({ canDecide: false, total: 1 });
    expect(listed.body.items[0].proposedResource.code).toBe(f.target.code);
  });
  it("admite alternativa externa sin crear un recurso, arriendo o asignación", async () => {
    const f = await setup();
    const scope = { where: { assignments: { some: { eventId: f.event.id } } }, orderBy: { id: "asc" } };
    const before = await db.resource.findMany(scope);
    const item = await propose(f,{ externalAlternative: "Consola equivalente de otra productora", reason: "Recurso no disponible" });
    expect(item.proposedResourceId).toBeNull();
    const approved=await manager.patch(`${f.path}/${item.id}/decision`).send(approve);
    expect(approved.status).toBe(200); expect(approved.body.resultingAssignmentId).toBeNull();
    expect(await db.resource.findMany(scope)).toEqual(before);
    expect((await db.equipmentAssignment.findUnique({ where: { id: f.assignment.id } })).releasedAt).toBeNull();
  });
  it.each([
    { reason: "Sin alternativa" },
    { proposedResourceId: "uno", externalAlternative: "Otra alternativa", reason: "Ambas" },
    { proposedResourceId: "uno", reason: "ab" },
    { externalAlternative: "ab", reason: "Motivo válido" },
    { proposedResourceId: "uno", reason: "Motivo válido", approvedBy: "gerente" },
    { proposedResourceId: "uno", reason: "Motivo válido", startsAt: dates.startsAt.toISOString() },
  ])("rechaza solicitud inválida %j", async body => {
    const f = await setup(); expect((await api.post(f.path).send(body)).status).toBe(400);
    expect(await db.equipmentReplacement.count({ where: { assignmentId: f.assignment.id } })).toBe(0);
  });
  it.each(["-1","1.001","1,50","10000000000.00","NaN",12500])("rechaza costo inválido %s", async estimatedCost => {
    const f = await setup(); expect((await api.post(f.path).send({ ...f.body,estimatedCost })).status).toBe(400);
  });
  it("admite costo cero y máximo representable", async () => {
    const f=await setup();
    expect((await propose(f,{ ...f.body,estimatedCost:"0" })).estimatedCost).toBe("0");
    expect((await propose(f,{ ...f.body,estimatedCost:"9999999999.99" })).estimatedCost).toBe("9999999999.99");
  });
  it("impide proponer el mismo equipo o uno inexistente", async () => {
    const f = await setup();
    expect((await api.post(f.path).send({ ...f.body,proposedResourceId:f.source.id })).status).toBe(409);
    expect((await api.post(f.path).send({ ...f.body,proposedResourceId:"inexistente" })).status).toBe(404);
  });
  it.each(["DAMAGED","MAINTENANCE","UNREVIEWED"])("rechaza equipo propuesto en estado %s", async status => {
    const f = await setup(); await db.resource.update({ where: { id:f.target.id },data: { status } });
    expect((await api.post(f.path).send(f.body)).status).toBe(409);
  });
  it("rechaza un equipo propuesto con mantención o asignación incompatible", async () => {
    const f=await setup();
    await db.equipmentMaintenance.create({ data: { resourceId:f.target.id,reason:"Mantención",...dates } });
    expect((await api.post(f.path).send(f.body)).status).toBe(409);
    const g=await setup();
    await db.equipmentAssignment.create({ data: { resourceId:g.target.id,eventId:g.event.id,...dates } });
    expect((await api.post(g.path).send(g.body)).status).toBe(409);
  });
  it("rechaza solicitudes sobre una asignación liberada o de otro equipo", async () => {
    const f=await setup(); await db.equipmentAssignment.update({ where:{id:f.assignment.id},data:{releasedAt:new Date(),releaseReason:"Liberada"} });
    expect((await api.post(f.path).send(f.body)).status).toBe(409);
    expect((await api.get(f.path.replace(f.source.id,f.target.id))).status).toBe(404);
  });
  it("sin sesión no acepta aprobación aunque se envíen cabeceras de gerente", async () => {
    const f=await setup(); const item=await propose(f);
    const res=await api.patch(`${f.path}/${item.id}/decision`).set("x-user-role","gerente").set("x-user-id","inventado").send(approve);
    expect(res.status).toBe(401);
    expect((await db.equipmentReplacement.findUnique({where:{id:item.id}})).status).toBe("PENDING");
    expect((await db.equipmentAssignment.findUnique({where:{id:f.assignment.id}})).releasedAt).toBeNull();
    expect(await db.equipmentAssignment.count({where:{resourceId:f.target.id}})).toBe(0);
    expect((await api.get(f.path).set("x-user-role","gerente")).body.canDecide).toBe(false);
  });
  it("operaciones no aprueba y una identidad incompleta no es sesión", async () => {
    const f=await setup(); const item=await propose(f);
    expect((await operations.patch(`${f.path}/${item.id}/decision`).send(approve)).status).toBe(403);
    expect((await identifiedApi({role:"GERENTE"}).patch(`${f.path}/${item.id}/decision`).send(approve)).status).toBe(401);
    expect((await manager.get(f.path)).body.canDecide).toBe(true);
  });
  it("aprueba e intercambia las asignaciones una sola vez, conservando evento y periodo", async () => {
    const f=await setup(); const item=await propose(f);
    const original=await db.equipmentAssignment.findUnique({where:{id:f.assignment.id}});
    const res=await manager.patch(`${f.path}/${item.id}/decision`).send(approve);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({status:"APPROVED",decidedById:"gerente-prueba",decisionReason:approve.reason});
    expect(res.body.decidedAt).toBeTruthy();
    const released=await db.equipmentAssignment.findUnique({where:{id:f.assignment.id}});
    expect(released).toMatchObject({...original,releasedAt:new Date(res.body.decidedAt),releaseReason:`Reemplazo aprobado: ${item.id}`});
    const resulting=await db.equipmentAssignment.findUnique({where:{id:res.body.resultingAssignmentId}});
    expect(resulting).toMatchObject({resourceId:f.target.id,eventId:f.event.id,...dates,releasedAt:null});
    expect(await db.equipmentAssignment.count({where:{resourceId:f.target.id}})).toBe(1);
    const history=(await api.get(f.path)).body;
    expect(history.items[0].resultingAssignmentId).toBe(resulting.id);
    expect(history.assignmentReleasedAt).toBe(res.body.decidedAt);
    expect((await manager.patch(`${f.path}/${item.id}/decision`).send({status:"REJECTED",reason:"Segundo intento"})).status).toBe(409);
    expect((await manager.patch(`${f.path}/${item.id}/decision`).send(approve)).status).toBe(409);
    expect(await db.equipmentAssignment.count({where:{resourceId:f.target.id}})).toBe(1);
  });
  it("rechazar conserva el original y no crea una asignación", async () => {
    const f=await setup(); const item=await propose(f);
    const res=await manager.patch(`${f.path}/${item.id}/decision`).send({status:"REJECTED",reason:"No corresponde el reemplazo"});
    expect(res.status).toBe(200); expect(res.body.resultingAssignmentId).toBeNull();
    expect((await db.equipmentAssignment.findUnique({where:{id:f.assignment.id}})).releasedAt).toBeNull();
    expect(await db.equipmentAssignment.count({where:{resourceId:f.target.id}})).toBe(0);
  });
  it("el nuevo bloqueo impide asignaciones y mantenciones incompatibles del sustituto", async () => {
    const f=await setup(); const item=await propose(f);
    expect((await manager.patch(`${f.path}/${item.id}/decision`).send(approve)).status).toBe(200);
    const base=`/api/v1/operations/resources/${f.target.id}`;
    const period={startsAt:dates.startsAt.toISOString(),endsAt:dates.endsAt.toISOString()};
    expect((await api.post(`${base}/assignments`).send({...period,eventId:f.event.id})).status).toBe(409);
    expect((await api.post(`${base}/maintenances`).send({...period,reason:"Revisión del sustituto"})).status).toBe(409);
    expect((await api.get(`${base}/availability`).query(period)).body.available).toBe(false);
    const source=`/api/v1/operations/resources/${f.source.id}`;
    expect((await api.get(`${source}/availability`).query(period)).body.available).toBe(true);
  });
  it("si falla el guardado de la decisión revierte liberación y nueva asignación", async () => {
    const f=await setup(); const item=await propose(f);
    await db.$executeRaw`ALTER TABLE "EquipmentReplacement" ADD CONSTRAINT "test_swap_rollback" CHECK ("decisionReason" IS DISTINCT FROM 'Forzar rollback intercambio')`;
    try {
      await expect(decidirReemplazo(db,f.source.id,f.assignment.id,item.id,
        {...approve,reason:"Forzar rollback intercambio"},{id:"gerente-prueba",role:"GERENTE"})).rejects.toThrow();
      expect((await db.equipmentReplacement.findUnique({where:{id:item.id}})).status).toBe("PENDING");
      expect((await db.equipmentAssignment.findUnique({where:{id:f.assignment.id}})).releasedAt).toBeNull();
      expect(await db.equipmentAssignment.count({where:{resourceId:f.target.id}})).toBe(0);
    } finally { await db.$executeRaw`ALTER TABLE "EquipmentReplacement" DROP CONSTRAINT "test_swap_rollback"`; }
  });
  it("dos solicitudes del mismo original no ejecutan dos intercambios", async () => {
    const f=await setup(); const first=await propose(f);
    const alternate=await setup(); const second=await propose(f,{...f.body,proposedResourceId:alternate.target.id});
    const results=await Promise.all([first,second].map(item=>manager.patch(`${f.path}/${item.id}/decision`).send(approve)));
    expect(results.map(res=>res.status).sort()).toEqual([200,409]);
    const requests=await db.equipmentReplacement.findMany({where:{assignmentId:f.assignment.id}});
    expect(requests.filter(item=>item.resultingAssignmentId)).toHaveLength(1);
    expect(await db.equipmentAssignment.count({where:{resourceId:{in:[f.target.id,alternate.target.id]},releasedAt:null}})).toBe(1);
  });
  it("dos originales que proponen el mismo sustituto no lo reservan dos veces", async () => {
    const f=await setup(), g=await setup();
    const first=await propose(f), second=await propose(g,{...g.body,proposedResourceId:f.target.id});
    const results=await Promise.all([[f,first],[g,second]].map(([fixture,item])=>manager.patch(`${fixture.path}/${item.id}/decision`).send(approve)));
    expect(results.map(res=>res.status).sort()).toEqual([200,409]);
    expect(await db.equipmentAssignment.count({where:{resourceId:f.target.id,releasedAt:null}})).toBe(1);
    const failed=[f,g][results.findIndex(res=>res.status===409)];
    expect((await db.equipmentAssignment.findUnique({where:{id:failed.assignment.id}})).releasedAt).toBeNull();
  });
  it("conserva el periodo completo de montaje y retiro sin cambiar estados de los equipos", async () => {
    const f=await setup();
    const occupation={startsAt:new Date("2028-05-01T08:00:00Z"),endsAt:new Date("2028-05-01T14:00:00Z")};
    await db.equipmentAssignment.update({where:{id:f.assignment.id},data:occupation});
    const item=await propose(f);
    await db.resource.update({where:{id:f.source.id},data:{status:"DAMAGED"}});
    const res=await manager.patch(`${f.path}/${item.id}/decision`).send(approve);
    expect(res.status).toBe(200);
    expect(await db.equipmentAssignment.findUnique({where:{id:res.body.resultingAssignmentId}})).toMatchObject({...occupation,eventId:f.event.id,resourceId:f.target.id});
    expect((await db.resource.findUnique({where:{id:f.source.id}})).status).toBe("DAMAGED");
    expect((await db.resource.findUnique({where:{id:f.target.id}})).status).toBe("OPERATIONAL");
  });
  it.each(["assignments","maintenances"])("una carrera con %s guarda solo una ocupación del sustituto", async operation => {
    const f=await setup(); const item=await propose(f);
    const period={startsAt:dates.startsAt.toISOString(),endsAt:dates.endsAt.toISOString()};
    const competing=operation==="assignments" ? {...period,eventId:f.event.id} : {...period,reason:"Revisión programada"};
    const [decision,occupation]=await Promise.all([
      manager.patch(`${f.path}/${item.id}/decision`).send(approve),
      api.post(`/api/v1/operations/resources/${f.target.id}/${operation}`).send(competing),
    ]);
    if (decision.status===200) {
      expect(occupation.status).toBe(409);
      expect((await db.equipmentAssignment.findUnique({where:{id:f.assignment.id}})).releasedAt).not.toBeNull();
    } else {
      expect(decision.status).toBe(409); expect(occupation.status).toBe(201);
      expect((await db.equipmentAssignment.findUnique({where:{id:f.assignment.id}})).releasedAt).toBeNull();
      expect((await db.equipmentReplacement.findUnique({where:{id:item.id}})).resultingAssignmentId).toBeNull();
    }
    const reservations=await db.equipmentAssignment.count({where:{resourceId:f.target.id,releasedAt:null}});
    const maintenances=await db.equipmentMaintenance.count({where:{resourceId:f.target.id}});
    expect(reservations+maintenances).toBe(1);
  });
  it("una liberación simultánea del original y una aprobación no se pisan", async () => {
    const f=await setup(); const item=await propose(f);
    const [decision,release]=await Promise.all([
      manager.patch(`${f.path}/${item.id}/decision`).send(approve),
      api.patch(`/api/v1/operations/resources/${f.source.id}/assignments/${f.assignment.id}/release`).send({reason:"Liberación manual"}),
    ]);
    expect([decision.status,release.status].sort()).toEqual([200,409]);
    const stored=await db.equipmentReplacement.findUnique({where:{id:item.id}});
    expect(stored.status).toBe(decision.status===200 ? "APPROVED" : "PENDING");
    expect(await db.equipmentAssignment.count({where:{resourceId:f.target.id,releasedAt:null}})).toBe(decision.status===200 ? 1 : 0);
  });
  it.each([{}, {status:"PENDING",reason:"Motivo válido"}, {status:"APPROVED",reason:"ab"}, {...approve,decidedById:"otro"}])("rechaza decisión inválida %j", async body => {
    const f=await setup(); const item=await propose(f);
    expect((await manager.patch(`${f.path}/${item.id}/decision`).send(body)).status).toBe(400);
  });
  it("revalida mantención y estado al aprobar y conserva la solicitud pendiente si falla", async () => {
    const f=await setup(); const item=await propose(f);
    await db.equipmentMaintenance.create({data:{resourceId:f.target.id,reason:"Nueva revisión",...dates}});
    expect((await manager.patch(`${f.path}/${item.id}/decision`).send(approve)).status).toBe(409);
    expect((await db.equipmentReplacement.findUnique({where:{id:item.id}})).status).toBe("PENDING");
    expect((await manager.patch(`${f.path}/${item.id}/decision`).send({status:"REJECTED",reason:"Alternativa no disponible"})).status).toBe(200);
    const g=await setup(); const other=await propose(g);
    await db.resource.update({where:{id:g.target.id},data:{status:"DAMAGED"}});
    expect((await manager.patch(`${g.path}/${other.id}/decision`).send(approve)).status).toBe(409);
    const h=await setup(); const occupied=await propose(h);
    await db.equipmentAssignment.create({data:{resourceId:h.target.id,eventId:h.event.id,...dates}});
    expect((await manager.patch(`${h.path}/${occupied.id}/decision`).send(approve)).status).toBe(409);
  });
  it("rechaza aprobación cuando cambian las fechas o se libera el original", async () => {
    const f=await setup(); const item=await propose(f);
    await db.event.update({where:{id:f.event.id},data:{startsAt:new Date("2028-05-01T10:30:00Z")}});
    expect((await manager.patch(`${f.path}/${item.id}/decision`).send(approve)).status).toBe(409);
    const g=await setup(); const other=await propose(g);
    await db.equipmentAssignment.update({where:{id:g.assignment.id},data:{releasedAt:new Date(),releaseReason:"Liberada"}});
    expect((await manager.patch(`${g.path}/${other.id}/decision`).send(approve)).status).toBe(409);
  });
  it("dos decisiones simultáneas no sobrescriben el resultado", async () => {
    const f=await setup(); const item=await propose(f);
    const results=await Promise.all([approve,{status:"REJECTED",reason:"Alternativa rechazada"}].map(body=>manager.patch(`${f.path}/${item.id}/decision`).send(body)));
    expect(results.map(result=>result.status).sort()).toEqual([200,409]);
    expect((await db.equipmentReplacement.findUnique({where:{id:item.id}})).status).toBe(results.find(result=>result.status===200).body.status);
  });
  it("pagina propuestas y evita consultar o decidir solicitudes ajenas a la asignación", async () => {
    const f=await setup(); const item=await propose(f); await propose(f);
    const listed=await api.get(`${f.path}?page=99&pageSize=1`);
    expect(listed.body).toMatchObject({page:2,pages:2,total:2});
    expect((await api.get(`${f.path}?page=0`)).status).toBe(400);
    const other=await setup();
    expect((await manager.patch(`${other.path}/${item.id}/decision`).send(approve)).status).toBe(404);
  });
});
