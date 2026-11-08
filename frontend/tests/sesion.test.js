import { afterEach, beforeEach, it, expect, vi } from 'vitest';
let service;
const csrfToken = 'a'.repeat(64);
const user = { id:'user-1', name:'Cuenta temporal', email:'cuenta@example.test', role:'PRODUCCION', authenticated:true, permissions:[] };
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
beforeEach(async () => { vi.resetModules(); service = await import('../src/services/sesion.js'); });
afterEach(() => vi.unstubAllGlobals());
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
it('no anuncia cierre exitoso si el servidor falla', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(200,{user,csrfToken})).mockResolvedValueOnce(response(503,{})));
  await service.startSession(user.email,'contraseña temporal');
  await expect(service.endSession()).rejects.toThrow('No se pudo cerrar');
});
