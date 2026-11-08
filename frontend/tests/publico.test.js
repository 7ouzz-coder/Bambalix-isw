import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it.each(["http://127.0.0.1:55506", "http://127.0.0.1:55506/api/v1/"])("mantiene las rutas públicas y de sesión con la base %s", async base => {
 vi.stubEnv("NEXT_PUBLIC_API_URL", base); vi.resetModules();
 const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
 vi.stubGlobal("fetch", fetch);
 const { publicAgenda, sendPublicRequest } = await import("../src/services/publico.js");
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
 await expect(publicAgenda()).rejects.toThrow("la productora la revisará");
});
it('informa en español cuando falla la conexión de la agenda', async () => {
 vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:55506'); vi.resetModules();
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
 const {publicAgenda}=await import('../src/services/publico.js');
 await expect(publicAgenda()).rejects.toThrow('No pudimos consultar la agenda');
});
