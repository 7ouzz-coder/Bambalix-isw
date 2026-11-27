import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { createInternalUser } from '../src/services/sesiones.service.js';
const enabled=process.env.LIVE_API_TEST==='1', url=process.env.TEST_DATABASE_URL;
if(enabled && (!url || new URL(url).hostname!=='127.0.0.1' || !new URL(url).pathname.endsWith('_test'))) throw Error('Se requiere una base local de pruebas');
describe.skipIf(!enabled)('Flujos HTTP integrados',()=>{
 it('crea registros y verifica el abono con sesión de gerente',async()=>{
  const db=new PrismaClient({datasources:{db:{url}}}), suffix=randomUUID(), password=`Prueba-${suffix}`;
  let user,manager,client,event,type,resource,vehicle,quote,payment,publicRequest; let cookie,csrf;
  const api='http://127.0.0.1:55508/api/v1';
  async function call(method,path,body,expected){
   const response=await fetch(api+path,{method,headers:{...(cookie?{Cookie:cookie,'x-csrf-token':csrf}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const data=await response.json().catch(()=>({}));
   expect(response.status,`${method} ${path}: ${JSON.stringify(data)}`).toBe(expected); return data;
  }
  try{
   user=await createInternalUser(db,{name:'Cuenta temporal',email:`${suffix}@example.test`,password,role:'PRODUCCION',permissions:['clientes:leer','clientes:editar','eventos:leer','eventos:editar','recursos:leer','recursos:editar','cotizaciones:leer','cotizaciones:editar','pagos:leer','pagos:registrar','solicitudes:leer']});
   type=await db.eventType.create({data:{name:suffix}});
   const login=await fetch(api+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:user.email,password})}); expect(login.status).toBe(200); cookie=login.headers.get('set-cookie').split(';')[0];csrf=(await login.json()).csrfToken;
   client=await call('POST','/clients',{name:'Cliente prueba',email:`${suffix}@example.test`,rut:"12.345.678-5",phone:'+56912345678'},201);
   await call('PATCH',`/clients/${client.id}`,{name:'Cliente actualizado'},200);
   expect((await db.client.findUniqueOrThrow({where:{id:client.id}})).name).toBe('Cliente actualizado');
   event=await call('POST','/events',{title:'Evento prueba',clientId:client.id,eventTypeId:type.id,startsAt:'2029-06-01T10:00:00Z',endsAt:'2029-06-01T12:00:00Z',attendees:10,location:"Recinto QA"},201);
   await call('PATCH',`/events/${event.id}`,{title:'Evento actualizado'},200);
   expect((await db.event.findUniqueOrThrow({where:{id:event.id}})).title).toBe('Evento actualizado');
   await call('PATCH',`/events/${event.id}`,{startsAt:'2029-06-02T10:00:00Z',endsAt:'2029-06-02T12:00:00Z'},409);
   resource=await call('POST','/operations/resources',{name:'Equipo prueba',category:'Audio',code:suffix,mode:'UNIT',quantity:1},201);
   await call('PATCH',`/operations/resources/${resource.id}`,{name:'Equipo actualizado',category:'Audio',code:suffix,revision:resource.revision},200);
   expect((await db.resource.findUniqueOrThrow({where:{id:resource.id}})).name).toBe('Equipo actualizado');
   vehicle=await call('POST','/operations/vehicles',{name:'Vehículo prueba',type:'Camión',plate:"QB-47-11"},201);
   await call('PATCH',`/operations/vehicles/${vehicle.id}`,{name:'Vehículo actualizado',type:'Camión',plate:vehicle.plate,revision:vehicle.revision},200);
   expect((await db.vehicle.findUniqueOrThrow({where:{id:vehicle.id}})).name).toBe('Vehículo actualizado');
   quote=await call('POST','/quotes',{clientId:client.id,eventId:event.id,items:[{concept:'Servicio de audio',quantity:1,unitPrice:100}]},201);
   expect((await db.quote.findUniqueOrThrow({where:{id:quote.id}})).status).toBe('BORRADOR');
   const editedQuote = {clientId:client.id,eventId:event.id,notes:'Revisada',items:[{concept:'Audio actualizado',quantity:2,unitPrice:125}]};
   const edited = await call('PATCH',`/quotes/${quote.id}`,editedQuote,200);
   expect(edited).toMatchObject({id:quote.id,status:'BORRADOR',total:'250',notes:'Revisada'});
   expect(edited.items.map(({concept}) => concept)).toEqual(['Audio actualizado']);
   await call('POST',`/quotes/${quote.id}/submit-review`,{},200);
   await call('PATCH',`/quotes/${quote.id}`,{...editedQuote,notes:'No debe guardarse'},409);
   expect(await call('GET',`/quotes/${quote.id}`,undefined,200)).toMatchObject({status:'EN_REVISION',total:'250',notes:'Revisada'});
   await call('POST',`/quotes/${quote.id}/approve`,{},403);
   payment=await call('POST','/payments',{quoteId:quote.id,amount:50,method:'EFECTIVO'},201);
   const savedPayment=await db.payment.findUniqueOrThrow({where:{id:payment.id}}); expect(savedPayment.registeredBy).toBe(user.id);expect(savedPayment.status).toBe('REGISTRADO');
   await call('POST',`/payments/${payment.id}/verify`,{},403);
   manager=await createInternalUser(db,{name:'Gerente QA',email:`gerente-${suffix}@example.test`,password,role:'GERENTE',permissions:['cotizaciones:leer','cotizaciones:editar','pagos:leer','pagos:registrar']});
   const managerLogin=await fetch(api+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:manager.email,password})});
   expect(managerLogin.status).toBe(200);
   const managerCookie=managerLogin.headers.get('set-cookie').split(';')[0];
   const managerCsrf=(await managerLogin.json()).csrfToken;
   const originalSession={cookie,csrf};
   cookie=managerCookie;csrf=managerCsrf;
   const approved=await call('POST',`/quotes/${quote.id}/approve`,{},200);
   expect(approved).toMatchObject({status:'APROBADA',approvedBy:'Gerente QA'});
   expect(approved.approvedAt).toBeTruthy();
   await call('POST',`/quotes/${quote.id}/approve`,{},400);
   const verified=await call('POST',`/payments/${payment.id}/verify`,{},200);
   expect(verified).toMatchObject({status:'VERIFICADO',verifiedBy:manager.id});
   expect(verified.verifiedAt).toBeTruthy();
   const summary=await call('GET',`/payments/quote/${quote.id}/summary`,undefined,200);
   expect(summary.totalVerificado).toBe(50);
   expect(summary.saldoPendiente).toBe(200);
   await call('POST',`/payments/${payment.id}/verify`,{},409);
   ({cookie,csrf}=originalSession);
   await call('PATCH','/operations/resources/x/assignments/y/replacements/z/decision',{},403);
   await call('POST','/public/requests',{name:'Persona prueba',email:`${suffix}@example.test`,requestedDate:'2029-06-05',service:'Seminarios y congresos',phone:'+56912345678'},201);
   publicRequest=await db.publicEventRequest.findFirstOrThrow({where:{email:`${suffix}@example.test`}});
   const inbox=await call('GET','/requests?page=1',undefined,200); expect(inbox.items.some(x=>x.id===publicRequest.id)).toBe(true);
  } finally {
   if(publicRequest) await db.publicEventRequest.deleteMany({where:{id:publicRequest.id}});
   if(quote){await db.payment.deleteMany({where:{quoteId:quote.id}});await db.quote.deleteMany({where:{id:quote.id}});}
   if(event) await db.event.deleteMany({where:{id:event.id}});
   if(resource) await db.resource.deleteMany({where:{id:resource.id}});
   if(vehicle) await db.vehicle.deleteMany({where:{id:vehicle.id}});
   if(type) await db.eventType.deleteMany({where:{id:type.id}});
   if(client) await db.client.deleteMany({where:{id:client.id}});
   if(user) await db.internalUser.deleteMany({where:{id:user.id}});
   if(manager) await db.internalUser.deleteMany({where:{id:manager.id}});
   await db.$disconnect();
  }
 },30000);
});
