// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicContact} from '../src/components/publico/event-request.jsx';
import * as service from '../src/services/publico.js';
vi.mock('../src/services/publico.js',()=>({publicAgenda:vi.fn(),sendPublicRequest:vi.fn()}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.resetAllMocks();vi.unstubAllGlobals();});
async function setup(){
 service.publicAgenda.mockResolvedValue([]);
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 await act(async()=>root.render(<PublicContact/>));
 return {container,root,form:container.querySelector('form')};
}
async function cleanup({container,root}){await act(async()=>root.unmount());container.remove();}
it('rechaza un nombre o servicio compuestos solo de espacios antes de enviar',async()=>{
 const page=await setup();try{
  page.form.elements.name.value='  ';page.form.elements.service.value='Una descripción suficiente';
  await act(async()=>page.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(page.container.querySelector('[role="alert"]').textContent).toContain('nombre');
  expect(document.activeElement).toBe(page.form.elements.name);expect(service.sendPublicRequest).not.toHaveBeenCalled();
  page.form.elements.phone.value='123456789';page.form.elements.name.value='Persona';page.form.elements.service.value='          ';
  await act(async()=>page.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(page.container.querySelector('[role="alert"]').textContent).toContain('servicio');
  expect(document.activeElement).toBe(page.form.elements.service);expect(service.sendPublicRequest).not.toHaveBeenCalled();
 }finally{await cleanup(page);}
});
it('conserva lo escrito y la fecha seleccionada si no se puede confirmar el envío',async()=>{
 const page=await setup();try{
  service.sendPublicRequest.mockRejectedValue(new Error('No pudimos confirmar el envío'));
  page.form.elements.phone.value='123456789';page.form.elements.name.value='Persona de prueba';page.form.elements.email.value='prueba@example.test';page.form.elements.service.value='Descripción de prueba';
  await act(async()=>page.container.querySelector('.public-calendar-grid button').click());
  const date=page.form.elements.requestedDate.value;
  await act(async()=>page.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(page.container.querySelector('[role="alert"]').textContent).toContain('No pudimos confirmar');
  expect(page.form.elements.name.value).toBe('Persona de prueba');expect(page.form.elements.service.value).toBe('Descripción de prueba');
  expect(page.form.elements.requestedDate.value).toBe(date);expect(date).not.toBe('');
 }finally{await cleanup(page);}
});
it('impide envíos simultáneos y bloquea el calendario mientras espera respuesta',async()=>{
 const page=await setup();let resolve;
 try{
  service.sendPublicRequest.mockImplementation(()=>new Promise(done=>{resolve=done;}));
  page.form.elements.phone.value='123456789';page.form.elements.name.value='Persona de prueba';page.form.elements.email.value='prueba@example.test';page.form.elements.service.value='Descripción de prueba';
  await act(async()=>page.container.querySelector('.public-calendar-grid button').click());
  const selected=page.form.elements.requestedDate.value;
  await act(async()=>{
   page.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   page.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  });
  expect(service.sendPublicRequest).toHaveBeenCalledTimes(1);
  expect(service.sendPublicRequest.mock.calls[0][0].requestedDate).toBe(selected);
  expect(page.container.querySelector('button[aria-label="Mes siguiente"]').disabled).toBe(true);
  expect(page.container.querySelectorAll('.public-calendar-grid button:disabled').length).toBeGreaterThan(0);
  await act(async()=>resolve({message:'Solicitud recibida'}));
  expect(page.container.textContent).toContain('Solicitud recibida');
  expect(page.form.elements.requestedDate.value).toBe('');
  expect(page.container.querySelector('button[aria-label="Mes siguiente"]').disabled).toBe(false);
 }finally{await cleanup(page);}
});
it('vuelve a habilitar el calendario si el envío termina con error',async()=>{
 const page=await setup();let reject;
 try{
  service.sendPublicRequest.mockImplementation(()=>new Promise((_,fail)=>{reject=fail;}));
  page.form.elements.phone.value='123456789';page.form.elements.name.value='Persona';page.form.elements.service.value='Descripción suficiente';
  await act(async()=>page.container.querySelector('.public-calendar-grid button').click());
  const selected=page.form.elements.requestedDate.value;
  await act(async()=>page.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await act(async()=>reject(new Error('No pudimos confirmar el envío')));
  expect(page.form.elements.requestedDate.value).toBe(selected);
  expect(page.container.querySelector('button[aria-label="Mes siguiente"]').disabled).toBe(false);
 }finally{await cleanup(page);}
});
it('reutiliza la clave al reintentar los mismos datos y crea otra si cambian',async()=>{
 const page=await setup();try{
  service.sendPublicRequest.mockRejectedValue(new Error('No pudimos confirmar el envío'));
  page.form.elements.phone.value='123456789';page.form.elements.name.value='Persona';page.form.elements.email.value='prueba@example.test';page.form.elements.service.value='Descripción suficiente';
  await act(async()=>page.container.querySelector('.public-calendar-grid button').click());
  const send=()=>page.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  await act(async()=>send());await act(async()=>send());
  const first=service.sendPublicRequest.mock.calls[0][1];
  expect(first).toMatch(/^[a-f0-9-]{36}$/);expect(service.sendPublicRequest.mock.calls[1][1]).toBe(first);
  page.form.elements.service.value='Descripción distinta para el evento';
  await act(async()=>send());
  expect(service.sendPublicRequest.mock.calls[2][1]).not.toBe(first);
 }finally{await cleanup(page);}
});
it('genera una clave segura si el navegador no ofrece randomUUID',async()=>{
 const page=await setup();try{
  const getRandomValues=vi.fn(bytes=>{bytes.fill(17);return bytes;});
  vi.stubGlobal('crypto',{getRandomValues});service.sendPublicRequest.mockResolvedValue({message:'Solicitud recibida'});
  page.form.elements.phone.value='123456789';page.form.elements.name.value='Persona';page.form.elements.service.value='Descripción suficiente';
  await act(async()=>page.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(getRandomValues).toHaveBeenCalledOnce();
  expect(service.sendPublicRequest.mock.calls[0][1]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 }finally{await cleanup(page);}
});
it('reutiliza la clave si solo cambian espacios o mayúsculas del correo',async()=>{
 const page=await setup();try{
  service.sendPublicRequest.mockRejectedValue(new Error('No pudimos confirmar el envío'));
  page.form.elements.phone.value='123456789';page.form.elements.name.value='Persona';page.form.elements.email.value='prueba@example.test';
  page.form.elements.phone.value='123456';page.form.elements.service.value='Descripción suficiente';
  await act(async()=>page.container.querySelector('.public-calendar-grid button').click());
  const send=()=>page.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  await act(async()=>send());
  page.form.elements.name.value=' Persona ';page.form.elements.email.value='PRUEBA@example.test';
  page.form.elements.phone.value=' 123456 ';page.form.elements.service.value=' Descripción suficiente ';
  await act(async()=>send());
  expect(service.sendPublicRequest.mock.calls[1][0]).toEqual(service.sendPublicRequest.mock.calls[0][0]);
  expect(service.sendPublicRequest.mock.calls[1][1]).toBe(service.sendPublicRequest.mock.calls[0][1]);
 }finally{await cleanup(page);}
});
