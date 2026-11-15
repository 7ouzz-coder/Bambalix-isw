// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { PublicContact } from '../src/components/publico/event-request.jsx';
import * as publicService from '../src/services/publico.js';
vi.mock('../src/services/publico.js',()=>({publicAgenda:vi.fn(),sendPublicRequest:vi.fn()}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('permite elegir fecha y cambiar de mes aunque la disponibilidad no esté confirmada',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date(2028,1,10,12));
 publicService.publicAgenda.mockRejectedValue(new Error('Agenda no disponible'));
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 try {
  await act(async()=>root.render(<PublicContact/>));
  expect(container.textContent).toContain('La disponibilidad de estas fechas aún no está confirmada');
  expect(container.textContent).toContain('Elegir una fecha no la reserva');
  const buttons=[...container.querySelectorAll('.public-calendar-grid button')];
  expect(buttons).toHaveLength(29);
  await act(async()=>buttons[28].click());
  expect(container.querySelector('input[name=requestedDate]').value).toBe('2028-02-29');
  expect(buttons[28].getAttribute('aria-pressed')).toBe('true');
  await act(async()=>container.querySelector('button[aria-label="Mes siguiente"]').click());
  expect(container.querySelector('.public-calendar-header h3').textContent).toContain('marzo');
  expect(container.querySelector('input[name=requestedDate]').value).toBe('2028-02-29');
 } finally {await act(async()=>root.unmount());container.remove();}
});

it('identifica fechas ocupadas de prueba en rojo y con una etiqueta accesible',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date(2028,1,10,12));
 const { PublicCalendar }=await import('../src/components/publico/public-calendar.jsx');
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 try {
  await act(async()=>root.render(<PublicCalendar selectedDate="" onSelect={()=>{}} occupiedDates={['2028-02-15']}/>));
  const occupied=[...container.querySelectorAll('.public-calendar-grid button')].find(button=>button.textContent==='15');
  const other=[...container.querySelectorAll('.public-calendar-grid button')].find(button=>button.textContent==='16');
  expect(occupied.classList.contains('public-calendar-occupied')).toBe(true);
  expect(occupied.getAttribute('aria-label')).toContain('ocupado');
  expect(other.classList.contains('public-calendar-occupied')).toBe(false);
 } finally {await act(async()=>root.unmount());container.remove();}
});

it('hidrata sin errores aunque el servidor y el navegador cambien de mes',async()=>{
 vi.useFakeTimers();
 const { PublicCalendar }=await import('../src/components/publico/public-calendar.jsx');
 const { renderToString }=await import('react-dom/server');
 const { hydrateRoot }=await import('react-dom/client');
 const props={selectedDate:'',onSelect:()=>{}};
 vi.setSystemTime(new Date(2028,0,31,23,59));
 const html=renderToString(<PublicCalendar {...props}/>);
 expect(html).toContain('Cargando calendario');
 vi.setSystemTime(new Date(2028,1,1,0,1));
 const container=document.createElement('div');container.innerHTML=html;document.body.append(container);
 const onRecoverableError=vi.fn();let root;
 try {
  await act(async()=>{root=hydrateRoot(container,<PublicCalendar {...props}/>,{onRecoverableError});});
  expect(onRecoverableError).not.toHaveBeenCalled();
  expect(container.querySelector('.public-calendar-header h3').textContent).toContain('febrero');
  expect(container.querySelectorAll('.public-calendar-grid button')).toHaveLength(29);
 } finally {if(root) await act(async()=>root.unmount());container.remove();}
});
