import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it.each(['http://127.0.0.1:55506','http://127.0.0.1:55506/','http://127.0.0.1:55506/api','http://127.0.0.1:55506/api/','http://127.0.0.1:55506/api/v1','http://127.0.0.1:55506/api/v1/'])('construye las rutas de todos los módulos con %s', async configured => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', configured); vi.resetModules();
 const fetch = vi.fn().mockImplementation(async url => ({ok:true,status:200,json:async()=>String(url).includes('/requests?') ? {items:[],total:0,pages:1,page:1} : []}));
 vi.stubGlobal('fetch', fetch);
 const clients=await import('../src/services/clientes.js'); const quotes=await import('../src/services/cotizaciones.js');
 const events=await import('../src/services/eventos.js'); const payments=await import('../src/services/pagos.js');
 const equipment=await import('../src/services/equipos.js'); const vehicles=await import('../src/services/vehiculos.js');
 const inbox=await import('../src/services/solicitudes.js'); const publicSite=await import('../src/services/publico.js');
 await clients.clientRequest(); await quotes.quoteRequest(); await events.getEventos(); await payments.paymentRequest();
 await equipment.equipmentRequest(); await vehicles.listVehicles(); await inbox.listRequests(1); await publicSite.publicAgenda();
 const urls=fetch.mock.calls.map(([url])=>String(url));
 expect(urls.map(url=>new URL(url).pathname)).toEqual(['/api/v1/clients','/api/v1/quotes','/api/v1/events','/api/v1/payments','/api/v1/operations/resources','/api/v1/operations/vehicles','/api/v1/requests','/api/v1/events/public']);
 expect(fetch.mock.calls.slice(0,7).every(([,options])=>options.credentials==='include')).toBe(true);
 expect(fetch.mock.calls[7][1].credentials).toBe('omit');
});
