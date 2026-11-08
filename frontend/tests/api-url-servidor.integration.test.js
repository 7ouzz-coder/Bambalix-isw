import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../backend/node_modules/@prisma/client/default.js';
import { createInternalUser } from '../../backend/src/services/sesiones.service.js';
const dbUrl = process.env.TEST_DATABASE_URL;
const enabled = process.env.LIVE_API_TEST === '1';
if (enabled && (!dbUrl || new URL(dbUrl).hostname !== '127.0.0.1' || !new URL(dbUrl).pathname.endsWith('_test'))) throw Error('Se requiere PostgreSQL local exclusivo de pruebas');
const db = enabled ? new PrismaClient({ datasources: { db: { url: dbUrl } } }) : null;
describe.skipIf(!enabled)('Integración HTTP real', () => {
const realFetch = globalThis.fetch;
const password = `Prueba-${randomUUID()}`;
let user, cookie, csrf;
beforeAll(async () => {
 user = await createInternalUser(db, { name: 'Cuenta temporal', email: `${randomUUID()}@example.test`, password, role: 'GERENTE', permissions: ['clientes:leer','eventos:leer','cotizaciones:leer','pagos:leer','recursos:leer','solicitudes:leer'] });
 const login = await realFetch('http://127.0.0.1:55508/api/v1/auth/login', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:user.email,password})});
 expect(login.status).toBe(200); cookie=login.headers.get('set-cookie').split(';')[0]; csrf=(await login.json()).csrfToken;
});
afterAll(async () => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); if(user) await db.internalUser.delete({where:{id:user.id}}); await db.$disconnect(); });
it.each(['http://127.0.0.1:55508','http://127.0.0.1:55508/','http://127.0.0.1:55508/api/v1','http://127.0.0.1:55508/api/v1/'])('consulta todos los módulos contra el backend con %s', async configured => {
 vi.stubEnv('NEXT_PUBLIC_API_URL',configured); vi.resetModules();
 // Node no conserva cookies como el navegador; este adaptador envía la cookie real recibida al iniciar sesión.
 vi.stubGlobal('fetch', (url,options={}) => { const headers=new Headers(options.headers); if(options.credentials==='include') headers.set('Cookie',cookie); return realFetch(url,{...options,headers}); });
 const clients=await import('../src/services/clientes.js'), quotes=await import('../src/services/cotizaciones.js');
 const events=await import('../src/services/eventos.js'), payments=await import('../src/services/pagos.js');
 const equipment=await import('../src/services/equipos.js'), vehicles=await import('../src/services/vehiculos.js');
 const inbox=await import('../src/services/solicitudes.js'), publicSite=await import('../src/services/publico.js');
 const session=await import('../src/services/sesion.js');
 expect((await session.currentSession()).id).toBe(user.id);
 for (const result of await Promise.all([clients.clientRequest(),quotes.quoteRequest(),events.getEventos(),payments.paymentRequest(),equipment.equipmentRequest(),vehicles.listVehicles()])) expect(result).toBeDefined();
 expect((await inbox.listRequests(1)).items).toBeInstanceOf(Array);
 await expect(publicSite.publicAgenda()).rejects.toThrow('la productora la revisará');
 for(const [method,path] of [['POST','quotes/x/approve'],['POST','payments/x/verify'],['PATCH','operations/resources/x/assignments/y/replacements/z/decision']]) {
  const r=await realFetch(`http://127.0.0.1:55508/api/v1/${path}`,{method,headers:{Cookie:cookie,'x-csrf-token':csrf,'content-type':'application/json'},body:'{}'}); expect(r.status).toBe(403);
 }
});

});
