// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import ReactDOMClient from "react-dom/client";
import { EventoAgenda } from "../modules/eventos/evento-agenda.jsx";
import { EventoWorkspace } from "../modules/eventos/evento-workspace.jsx";
import * as eventosService from "../services/eventos.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("Pruebas de interacción y comportamiento de EventoAgenda", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  function setInputValue(input, value, eventType = "input") {
    const proto = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event(eventType, { bubbles: true }));
  }

  it("conserva las fechas elegidas al pulsar 'Consultar agenda' y envía el rango en formato ISO a getEventos", async () => {
    const futureEvent = {
      id: 99,
      title: "Conferencia Internacional 2028",
      startsAt: "2028-07-10T14:00:00.000Z",
      endsAt: "2028-07-10T22:00:00.000Z",
      attendees: 300,
      location: "Centro de Convenciones",
      needs: "Traducción simultánea",
      client: { id: "cli_1", name: "Global Corp" },
      eventType: { id: 1, name: "Conferencia" },
    };

    const getEventosSpy = vi.spyOn(eventosService, "getEventos").mockResolvedValue([futureEvent]);

    await act(async () => {
      root.render(<EventoAgenda revision={0} onEventoUpdated={vi.fn()} />);
    });

    const fromInput = document.body.querySelector("#agenda-from");
    const toInput = document.body.querySelector("#agenda-to");
    const submitBtn = document.body.querySelector("button[type='submit']");

    // 1. Seleccionar rango fuera del periodo inicial: 10 de julio de 2028 00:00 al 11 de julio de 2028 00:00
    await act(async () => {
      setInputValue(fromInput, "2028-07-10T00:00", "change");
      setInputValue(toInput, "2028-07-11T00:00", "change");
    });

    // 2. Pulsar 'Consultar agenda'
    const form = document.body.querySelector("form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    // 3. Comprobar que ambas fechas siguen visibles y no se reiniciaron
    expect(fromInput.value).toBe("2028-07-10T00:00");
    expect(toInput.value).toBe("2028-07-11T00:00");

    // 4. Comprobar que getEventos fue invocado con las fechas ISO correspondientes
    const expectedFromIso = new Date("2028-07-10T00:00").toISOString();
    const expectedToIso = new Date("2028-07-11T00:00").toISOString();
    expect(getEventosSpy).toHaveBeenLastCalledWith({
      from: expectedFromIso,
      to: expectedToIso,
    });

    // 5. Comprobar que el evento aparece en el DOM
    expect(document.body.textContent).toContain("Conferencia Internacional 2028");
    expect(document.body.textContent).toContain("Centro de Convenciones");
  });

  it("descarta una respuesta anterior más lenta que llegue después de una consulta más reciente", async () => {
    let resolveFirst;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const oldEvent = {
      id: 50,
      title: "Evento Respuesta Antigua",
      startsAt: "2026-11-20T10:00:00.000Z",
      endsAt: "2026-11-20T14:00:00.000Z",
      attendees: 10,
    };

    const newEvent = {
      id: 51,
      title: "Evento Respuesta Nueva",
      startsAt: "2026-12-05T10:00:00.000Z",
      endsAt: "2026-12-05T14:00:00.000Z",
      attendees: 20,
    };

    const getEventosSpy = vi.spyOn(eventosService, "getEventos");
    getEventosSpy.mockImplementation((params) => {
      if (params.from.includes("2026-12-01")) {
        return Promise.resolve([newEvent]);
      }
      return firstPromise;
    });

    await act(async () => {
      root.render(<EventoAgenda revision={0} onEventoUpdated={vi.fn()} />);
    });

    const fromInput = document.body.querySelector("#agenda-from");
    const toInput = document.body.querySelector("#agenda-to");
    const form = document.body.querySelector("form");

    // Segunda búsqueda inmediata (resuelve de inmediato porque apunta a 2026-12-01)
    await act(async () => {
      setInputValue(fromInput, "2026-12-01T00:00", "change");
      setInputValue(toInput, "2026-12-10T00:00", "change");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    expect(document.body.textContent).toContain("Evento Respuesta Nueva");

    // Ahora resuelve la primera búsqueda lenta con el evento viejo
    await act(async () => {
      resolveFirst([oldEvent]);
    });

    // La respuesta vieja debió ser descartada por latestRequestRef
    expect(document.body.textContent).toContain("Evento Respuesta Nueva");
    expect(document.body.textContent).not.toContain("Evento Respuesta Antigua");
  });

  it("un rango invertido muestra el error sin enviar consulta a la API", async () => {
    const getEventosSpy = vi.spyOn(eventosService, "getEventos").mockResolvedValue([]);

    await act(async () => {
      root.render(<EventoAgenda revision={0} onEventoUpdated={vi.fn()} />);
    });

    getEventosSpy.mockClear();

    const fromInput = document.body.querySelector("#agenda-from");
    const toInput = document.body.querySelector("#agenda-to");
    const submitBtn = document.body.querySelector("button[type='submit']");

    // Configurar rango invertido (término anterior al inicio)
    const form = document.body.querySelector("form");
    await act(async () => {
      setInputValue(fromInput, "2028-07-15T12:00", "change");
      setInputValue(toInput, "2028-07-10T12:00", "change");
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    expect(document.body.textContent).toContain("La fecha de término debe ser posterior a la de inicio");
    expect(getEventosSpy).not.toHaveBeenCalled();
  });

  it("conserva el rango de fechas al alternar entre 'Agenda por periodo' y 'Todos los eventos' en EventoWorkspace", async () => {
    vi.spyOn(eventosService, "getEventos").mockResolvedValue([]);

    await act(async () => {
      root.render(<EventoWorkspace />);
    });

    const fromInput = document.body.querySelector("#agenda-from");
    const toInput = document.body.querySelector("#agenda-to");

    // Modificar rango en la agenda
    await act(async () => {
      setInputValue(fromInput, "2028-07-10T00:00", "change");
      setInputValue(toInput, "2028-07-11T00:00", "change");
    });

    expect(fromInput.value).toBe("2028-07-10T00:00");
    expect(toInput.value).toBe("2028-07-11T00:00");

    // Alternar a la vista 'Todos los eventos'
    const buttons = document.body.querySelectorAll("button");
    const listBtn = [...buttons].find((b) => b.textContent.includes("Todos los eventos"));
    const agendaBtn = [...buttons].find((b) => b.textContent.includes("Agenda por periodo"));

    await act(async () => {
      listBtn.click();
    });

    // Volver a 'Agenda por periodo'
    await act(async () => {
      agendaBtn.click();
    });

    const currentFromInput = document.body.querySelector("#agenda-from");
    const currentToInput = document.body.querySelector("#agenda-to");
    expect(currentFromInput.value).toBe("2028-07-10T00:00");
    expect(currentToInput.value).toBe("2028-07-11T00:00");
  });
});
