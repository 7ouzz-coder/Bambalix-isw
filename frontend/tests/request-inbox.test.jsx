// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {RequestInbox} from '../src/modules/solicitudes/request-inbox.jsx';
import {listRequests} from '../src/services/solicitudes';
vi.mock('../src/services/solicitudes',()=>({listRequests:vi.fn()}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let container,root;
beforeEach(()=>{container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.resetAllMocks();});
const item={id:'request-1',name:'Cliente consulta',email:'consulta@example.test',phone:null,requestedDate:'2028-09-12',service:'Seminarios y congresos',message:'<script>contenido recibido</script>\nMensaje del cliente',createdAt:'2026-11-07T12:00:00Z'};
it('muestra contacto, fecha y descripción como texto sin ejecutar contenido',async()=>{
 listRequests.mockResolvedValue({items:[item],total:1,pages:1,page:1});
 await act(async()=>root.render(<RequestInbox/>));
 expect(container.textContent).toContain('1 solicitud recibida');
 expect(container.textContent).toContain('consulta@example.test');
 expect(container.textContent).toContain('12/09/2028');
 expect(container.textContent).toContain('<script>contenido recibido</script>');
 expect(container.querySelector('script')).toBeNull();
 expect(container.textContent).toContain('No informado');
});
it('muestra lista vacía',async()=>{
 listRequests.mockResolvedValue({items:[],total:0,pages:1,page:1});
 await act(async()=>root.render(<RequestInbox/>));
 expect(container.textContent).toContain('0 solicitudes recibidas');
 expect(container.textContent).toContain('Aún no se han recibido solicitudes');
});
it('permite reintentar tras un error y pasar a la página siguiente',async()=>{
 listRequests.mockRejectedValueOnce(Error('Fallo de consulta')).mockResolvedValue({items:[item],total:21,pages:2,page:1});
 await act(async()=>root.render(<RequestInbox/>));
 expect(container.querySelector('[role=alert]').textContent).toBe('Fallo de consulta');
 await act(async()=>Array.from(container.querySelectorAll('button')).find(x=>x.textContent==='Intentar nuevamente').click());
 listRequests.mockResolvedValue({items:[{...item,id:'request-2',name:'Segunda página'}],total:21,pages:2,page:2});
 await act(async()=>Array.from(container.querySelectorAll('button')).find(x=>x.textContent==='Siguiente').click());
 expect(listRequests.mock.calls.at(-1)[0]).toBe(2);
 expect(container.textContent).toContain('Segunda página');
});
it('descarta una respuesta tardía al desmontarse',async()=>{
 let finish;listRequests.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 await act(async()=>root.render(<RequestInbox/>));
 const signal=listRequests.mock.calls[0][1];
 await act(async()=>root.render(<p>Otra vista</p>));
 expect(signal.aborted).toBe(true);
 await act(async()=>finish({items:[item],total:1,pages:1,page:1}));
 expect(container.textContent).toBe('Otra vista');
});
