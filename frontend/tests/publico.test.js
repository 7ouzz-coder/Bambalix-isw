import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it.each(["http://127.0.0.1:55506", "http://127.0.0.1:55506/api/v1/"])("mantiene las rutas públicas y de sesión con la base %s", async base => {
 vi.stubEnv("NEXT_PUBLIC_API_URL", base); vi.resetModules();
 const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({message: "Solicitud recibida"}) });
 vi.stubGlobal("fetch", fetch);
 const { publicAgenda, sendPublicRequest } = await import("../src/services/publico.js");
 fetch.mockResolvedValueOnce({ok:true,status:200,json:async()=>[]});
 await publicAgenda();
 expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:55506/api/v1/events/public");
 expect(fetch.mock.calls[0][1].credentials).toBe("omit");
 await sendPublicRequest({name: "Consulta"});
 expect(fetch.mock.calls[1][0]).toBe("http://127.0.0.1:55506/api/v1/public/requests");
 expect(fetch.mock.calls[1][1].credentials).toBe("omit");
 fetch.mockResolvedValueOnce({status:401,ok:false});
 const { currentSession } = await import("../src/services/sesion.js");
 expect(await currentSession()).toBeNull();
 expect(fetch.mock.calls[2][0]).toBe("http://127.0.0.1:55506/api/v1/auth/me");
 expect(fetch.mock.calls[2][1].credentials).toBe("include");
});
it("muestra la indisponibilidad de la agenda sin informar fechas libres", async () => {
 vi.stubEnv("NEXT_PUBLIC_API_URL", "http://127.0.0.1:55506"); vi.resetModules();
 vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok:false, status:503 }));
 const { publicAgenda } = await import("../src/services/publico.js");
 await expect(publicAgenda()).rejects.toThrow("Puedes enviar la fecha que te interesa y la productora la revisará.");
});
it('informa en español cuando falla la conexión de la agenda', async () => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:55506'); vi.resetModules();
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
 const {publicAgenda}=await import('../src/services/publico.js');
 await expect(publicAgenda()).rejects.toThrow('No pudimos consultar la agenda');
});


it('advierte que el envío es incierto cuando se pierde la conexión', async () => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:55506'); vi.resetModules();
 vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
 const {sendPublicRequest}=await import('../src/services/publico.js');
 await expect(sendPublicRequest({})).rejects.toThrow('Puedes reintentar sin modificar los datos ni recargar la página');
});
it.each([null, {}, {message:''}])('no presenta como exitoso un resultado incompleto: %j', async body => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:55506'); vi.resetModules();
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>body}));
 const {sendPublicRequest}=await import('../src/services/publico.js');
 await expect(sendPublicRequest({})).rejects.toThrow('No pudimos confirmar el envío');
});
it('muestra el motivo de rechazo devuelto por el servidor', async () => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:55506'); vi.resetModules();
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Revisa los datos de tu solicitud'})}));
 const {sendPublicRequest}=await import('../src/services/publico.js');
 await expect(sendPublicRequest({})).rejects.toThrow('Revisa los datos de tu solicitud');
});
it.each([null, {}, {message: '   '}, {message: {detalle: 'error'}}])('muestra un mensaje claro si el rechazo no contiene texto: %j', async body => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:55506'); vi.resetModules();
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,status:400,json:async()=>body}));
 const {sendPublicRequest}=await import('../src/services/publico.js');
 await expect(sendPublicRequest({})).rejects.toThrow('No pudimos enviar tu solicitud. Intenta nuevamente.');
});
it('no afirma que el envío falló cuando el servidor responde con error interno', async () => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:55506'); vi.resetModules();
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,status:500,json:async()=>({message:'Error interno'})}));
 const {sendPublicRequest}=await import('../src/services/publico.js');
 await expect(sendPublicRequest({})).rejects.toThrow('No pudimos confirmar el envío');
});
it('informa en español si la respuesta de la agenda no se puede leer', async () => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:55506'); vi.resetModules();
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>{throw new SyntaxError('Unexpected token');}}));
 const {publicAgenda}=await import('../src/services/publico.js');
 await expect(publicAgenda()).rejects.toThrow('No pudimos consultar la agenda');
});
it('envía la clave del reintento sin añadir credenciales', async () => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:55506'); vi.resetModules();
 const fetch=vi.fn().mockResolvedValue({ok:true,status:201,json:async()=>({message:'Solicitud recibida'})});vi.stubGlobal('fetch',fetch);
 const {sendPublicRequest}=await import('../src/services/publico.js');
 await sendPublicRequest({name:'Persona'},'01234567-89ab-4def-8abc-0123456789ab');
 expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('01234567-89ab-4def-8abc-0123456789ab');
 expect(fetch.mock.calls[0][1].credentials).toBe('omit');
});
