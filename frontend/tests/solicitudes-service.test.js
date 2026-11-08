import {afterEach,expect,it,vi} from 'vitest';
vi.mock('../src/services/sesion.js',()=>({sessionFetch:vi.fn()}));
import {sessionFetch} from '../src/services/sesion.js';
import {listRequests} from '../src/services/solicitudes.js';
afterEach(()=>vi.resetAllMocks());
it('consulta la página por el transporte autenticado y evita caché',async()=>{
 const value={items:[],total:0,pages:1,page:1};
 sessionFetch.mockResolvedValue({ok:true,json:async()=>value});
 expect(await listRequests(1)).toEqual(value);
 expect(sessionFetch.mock.calls[0][0]).toMatch(/\/api\/v1\/requests\?page=1$/);
 expect(sessionFetch.mock.calls[0][1].cache).toBe('no-store');
});
it('rechaza registros y paginación mal formados',async()=>{
 for(const value of [{items:[{id:'x'}],total:1,pages:1,page:1},{items:[],total:0,pages:1,page:2}]){
  sessionFetch.mockResolvedValue({ok:true,json:async()=>value});
  await expect(listRequests(1)).rejects.toThrow('listado de solicitudes inválido');
 }
});
it('no presenta una respuesta denegada como lista vacía',async()=>{
 sessionFetch.mockResolvedValue({ok:false,status:403});
 await expect(listRequests(1)).rejects.toThrow('No se pudieron consultar');
});
