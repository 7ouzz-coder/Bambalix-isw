import { afterEach, beforeEach, it, expect, vi } from 'vitest';
let service;
const csrfToken = 'a'.repeat(64);
const user = { id:'user-1', name:'Cuenta temporal', email:'cuenta@example.test', role:'PRODUCCION', authenticated:true, permissions:[] };
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
beforeEach(async () => { vi.resetModules(); service = await import('../src/services/sesion.js'); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('inicia sesión con cookies y conserva CSRF en memoria para la escritura', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response(200,{user,csrfToken})).mockResolvedValueOnce(response(201,{}));
  vi.stubGlobal('fetch', fetch);
  expect(await service.startSession(user.email,'contraseña temporal')).toEqual(user);
  await service.sessionFetch('/endpoint', {method:'POST',body:'{}'});
  expect(fetch.mock.calls[0][1].credentials).toBe('include');
  expect(fetch.mock.calls[1][1].credentials).toBe('include');
  expect(fetch.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe(csrfToken);
});
it('recupera el CSRF tras recargar antes de escribir', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response(200,{user,csrfToken})).mockResolvedValueOnce(response(200,{}));
  vi.stubGlobal('fetch', fetch);
  await service.sessionFetch('/endpoint',{method:'PATCH'});
  expect(fetch.mock.calls[0][0]).toContain('/auth/me');
  expect(fetch.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe(csrfToken);
});
it('rechaza una respuesta de sesión incompleta', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(200,{user:{role:'GERENTE'}})));
  await expect(service.currentSession()).rejects.toThrow('sesión inválida');
});
it('reconoce la ausencia de sesión', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(401,{})));
  expect(await service.currentSession()).toBeNull();
});
it('informa si falla la conexión al consultar la sesión', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(service.currentSession()).rejects.toThrow('No se pudo conectar con el servidor');
});
it('interrumpe la consulta de sesión si el servidor no responde', async () => {
  const controller = new AbortController();
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
  vi.stubGlobal('fetch', vi.fn((_url, {signal}) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason));
  })));
  const result = service.currentSession();
  expect(timeout).toHaveBeenCalledWith(10000);
  controller.abort();
  await expect(result).rejects.toThrow('No se pudo conectar con el servidor');
});
it('informa si la respuesta de la sesión es ilegible', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status:200, ok:true, json:async()=>{throw new SyntaxError('Unexpected token');} }));
  await expect(service.currentSession()).rejects.toThrow('No se pudo consultar la sesión');
});
it('no anuncia cierre exitoso si el servidor falla', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(200,{user,csrfToken})).mockResolvedValueOnce(response(503,{})));
  await service.startSession(user.email,'contraseña temporal');
  await expect(service.endSession()).rejects.toThrow('No se pudo cerrar');
});
it('explica en español si se pierde la conexión al iniciar sesión', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(service.startSession(user.email, 'contraseña temporal')).rejects.toThrow('No se pudo conectar con el servidor');
});
it('maneja una respuesta ilegible del servidor al iniciar sesión', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false, json:async()=>{throw new SyntaxError('Unexpected token');}}));
  await expect(service.startSession(user.email, 'contraseña temporal')).rejects.toThrow('No se pudo iniciar sesión');
});
it('informa un error al perder la conexión durante el cierre de sesión', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(200,{user,csrfToken})).mockRejectedValueOnce(new TypeError('Failed to fetch')));
  await service.startSession(user.email,'contraseña temporal');
  await expect(service.endSession()).rejects.toThrow('No se pudo cerrar la sesión');
});
