import { it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createInternalUser } from '../src/services/sesiones.service.js';
const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.endsWith('_test')) throw new Error('Usa PostgreSQL local exclusivo de pruebas');
it('protege las áreas y conserva evento y asignación al rechazar reprogramación web', async () => {
 const db = new PrismaClient({datasources:{db:{url}}}); const suffix=randomUUID(), password=`Prueba-${suffix}`;
 let user,client,type,event,equipment,assignment;
 try {
  user=await createInternalUser(db,{name:'Cuenta temporal',email:`${suffix}@example.test`,password,role:'PRODUCCION',permissions:['eventos:leer','eventos:editar']});
  client=await db.client.create({data:{name:'Cliente de prueba',email:`${suffix}@example.test`}});
  type=await db.eventType.create({data:{name:suffix}});
  event=await db.event.create({data:{title:'Evento de prueba',clientId:client.id,eventTypeId:type.id,attendees:10,startsAt:new Date('2029-02-01T10:00:00Z'),endsAt:new Date('2029-02-01T12:00:00Z')}});
  equipment=await db.resource.create({data:{name:'Equipo temporal',category:'Audio',code:suffix,status:'OPERATIONAL'}});
  assignment=await db.equipmentAssignment.create({data:{resourceId:equipment.id,eventId:event.id,startsAt:new Date('2029-02-01T09:00:00Z'),endsAt:new Date('2029-02-01T13:00:00Z')}});
  const api=request(createApp({db,webOrigin:'http://localhost:3000'}));
  const login=await api.post('/api/v1/auth/login').send({email:user.email,password}); expect(login.status).toBe(200);
  const cookie=login.headers['set-cookie'][0].split(';')[0];
  expect((await api.get('/api/v1/events').set('Cookie',cookie)).status).toBe(200);
  expect((await api.get('/api/v1/clients').set('Cookie',cookie)).status).toBe(403);
  expect((await api.get('/api/v1/operations/resources').set('Cookie',cookie)).status).toBe(403);
  const result=await api.patch(`/api/v1/events/${event.id}`).set('Cookie',cookie).set('x-csrf-token',login.body.csrfToken).send({startsAt:'2029-02-02T10:00:00Z',endsAt:'2029-02-02T12:00:00Z'});
  expect(result.status).toBe(409);
  const saved=await db.event.findUniqueOrThrow({where:{id:event.id}}), reserved=await db.equipmentAssignment.findUniqueOrThrow({where:{id:assignment.id}});
  expect(saved.startsAt).toEqual(event.startsAt); expect(saved.endsAt).toEqual(event.endsAt);
  expect(reserved.startsAt).toEqual(assignment.startsAt); expect(reserved.endsAt).toEqual(assignment.endsAt); expect(reserved.releasedAt).toBeNull();
 } finally {
  if(assignment) await db.equipmentAssignment.deleteMany({where:{id:assignment.id}});
  if(event) await db.event.deleteMany({where:{id:event.id}});
  if(equipment) await db.resource.deleteMany({where:{id:equipment.id}});
  if(type) await db.eventType.deleteMany({where:{id:type.id}});
  if(client) await db.client.deleteMany({where:{id:client.id}});
  if(user) await db.internalUser.deleteMany({where:{id:user.id}});
  await db.$disconnect();
 }
});
