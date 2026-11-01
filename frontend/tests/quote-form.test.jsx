// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import ReactDOMClient from "react-dom/client";
import { QuoteForm } from "../src/modules/cotizaciones/quote-form.jsx";
import * as cotizacionesService from "../src/services/cotizaciones";
import * as clientesService from "../src/services/clientes";
import * as eventosService from "../src/services/eventos";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const validClients = [
  { id: "cli_1", name: "Empresa Uno", clientType: "empresa" },
  { id: "cli_2", name: "Persona Dos", clientType: "persona" },
];

const validEvents = [
  { id: 101, clientId: "cli_1", title: "Evento Empresa", startsAt: "2026-11-15T10:00:00Z" },
  { id: 102, clientId: "cli_2", title: "Cumpleaños", startsAt: "2026-11-20T18:00:00Z" },
];

describe("Pruebas de interacción y comportamiento real de QuoteForm", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  async function openDialog(onSaved = vi.fn()) {
    await act(async () => {
      root.render(<QuoteForm onSaved={onSaved} />);
    });
    const trigger = container.querySelector("button.primary-action");
    await act(async () => {
      trigger.click();
    });
  }

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

  it("Guardar está deshabilitado durante la carga y no se llama a createQuote", async () => {
    const createQuoteSpy = vi.spyOn(cotizacionesService, "createQuote");
    let resolveClients;
    const pendingPromise = new Promise((resolve) => {
      resolveClients = resolve;
    });

    vi.spyOn(clientesService, "clientRequest").mockReturnValue(pendingPromise);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue([]);

    await openDialog();

    const submitBtn = document.body.querySelector("button[type='submit']");
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent).toContain("Cargando datos");

    const form = document.body.querySelector("form.equipment-form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    expect(createQuoteSpy).not.toHaveBeenCalled();

    await act(async () => {
      resolveClients([]);
    });
  });

  it("Un fallo HTTP o un registro inválido muestra error y bloquea el envío", async () => {
    const createQuoteSpy = vi.spyOn(cotizacionesService, "createQuote");

    // Caso A: Fallo HTTP
    vi.spyOn(clientesService, "clientRequest").mockRejectedValue(new Error("Fallo de red 500"));
    vi.spyOn(eventosService, "getEventos").mockResolvedValue([]);

    await openDialog();

    let errorBanner = document.body.querySelector("[role='alert']");
    expect(errorBanner).not.toBeNull();
    expect(errorBanner.textContent).toContain("Fallo de red 500");

    let submitBtn = document.body.querySelector("button[type='submit']");
    expect(submitBtn.disabled).toBe(true);

    const form = document.body.querySelector("form.equipment-form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });
    expect(createQuoteSpy).not.toHaveBeenCalled();

    // Caso B: Registro de cliente inválido
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue([{ invalidField: true }]);
    let retryBtn = document.body.querySelector(".bg-destructive\\/10 button");
    await act(async () => {
      retryBtn.click();
    });

    errorBanner = document.body.querySelector("[role='alert']");
    expect(errorBanner.textContent).toContain("datos de cliente con formato inválido");
    expect(submitBtn.disabled).toBe(true);

    // Caso C: Registro de evento inválido (restaurando clientes válidos)
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue([
      { id: "no-number", clientId: "cli_1", title: "Evento", startsAt: "fecha-invalida" },
    ]);

    retryBtn = document.body.querySelector(".bg-destructive\\/10 button");
    await act(async () => {
      retryBtn.click();
    });

    errorBanner = document.body.querySelector("[role='alert']");
    expect(errorBanner.textContent).toContain("datos de evento con formato inválido");
    expect(submitBtn.disabled).toBe(true);
  });

  it("Un arreglo vacío válido muestra el estado vacío", async () => {
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue([]);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue([]);

    await openDialog();

    const clientSelect = document.body.querySelector("#quote-client");
    expect(clientSelect.innerHTML).toContain("No hay clientes registrados");

    const eventSelect = document.body.querySelector("#quote-event");
    expect(eventSelect.innerHTML).toContain("Primero elige un cliente");
  });

  it("Reintentar correctamente elimina el error y permite continuar con selecciones válidas", async () => {
    vi.spyOn(clientesService, "clientRequest")
      .mockRejectedValueOnce(new Error("Error transitorio"))
      .mockResolvedValueOnce(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);

    await openDialog();

    expect(document.body.querySelector("[role='alert']")).not.toBeNull();

    const retryBtn = document.body.querySelector(".bg-destructive\\/10 button");
    await act(async () => {
      retryBtn.click();
    });

    expect(document.body.querySelector(".bg-destructive\\/10")).toBeNull();

    const clientSelect = document.body.querySelector("#quote-client");
    expect(clientSelect.innerHTML).toContain("Empresa Uno");
    expect(clientSelect.innerHTML).toContain("Persona Dos");
  });

  it("Un evento que no corresponde al cliente no se envía", async () => {
    const createQuoteSpy = vi.spyOn(cotizacionesService, "createQuote");
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);

    await openDialog();

    const clientSelect = document.body.querySelector("#quote-client");
    const eventSelect = document.body.querySelector("#quote-event");

    await act(async () => {
      setInputValue(clientSelect, "cli_2", "change");
    });

    expect(eventSelect.innerHTML).toContain("#102 - Cumpleaños");
    expect(eventSelect.innerHTML).not.toContain("#101 - Evento Empresa");

    await act(async () => {
      setInputValue(eventSelect, "101", "change");
    });

    const form = document.body.querySelector("form.equipment-form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    expect(createQuoteSpy).not.toHaveBeenCalled();
  });

  it("Un fallo al guardar conserva cliente, evento, notas e ítems", async () => {
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);
    vi.spyOn(cotizacionesService, "createQuote").mockRejectedValue(new Error("Fallo 500 en base de datos"));

    await openDialog();

    const clientSelect = document.body.querySelector("#quote-client");
    const eventSelect = document.body.querySelector("#quote-event");
    const notesInput = document.body.querySelector("#quote-notes");
    const conceptInput = document.body.querySelector("#quote-concept-0");
    const qtyInput = document.body.querySelector("#quote-quantity-0");
    const priceInput = document.body.querySelector("#quote-price-0");

    await act(async () => {
      setInputValue(clientSelect, "cli_1", "change");
    });
    await act(async () => {
      setInputValue(eventSelect, "101", "change");
      setInputValue(notesInput, "Nota importante de prueba", "input");
      setInputValue(conceptInput, "Equipo de iluminación Pro", "input");
      setInputValue(qtyInput, "2", "input");
      setInputValue(priceInput, "50000", "input");
    });

    const form = document.body.querySelector("form.equipment-form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    const serverAlert = document.body.querySelector(".error-message");
    expect(serverAlert).not.toBeNull();
    expect(serverAlert.textContent).toContain("Fallo 500 en base de datos");

    expect(clientSelect.value).toBe("cli_1");
    expect(eventSelect.value).toBe("101");
    expect(notesInput.value).toBe("Nota importante de prueba");
    expect(conceptInput.value).toBe("Equipo de iluminación Pro");
    expect(qtyInput.value).toBe("2");
    expect(priceInput.value).toBe("50000");
  });

  it("Un guardado exitoso llama una sola vez a createQuote, cierra y limpia el formulario", async () => {
    const onSavedMock = vi.fn();
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);
    const createQuoteSpy = vi.spyOn(cotizacionesService, "createQuote").mockResolvedValue({
      id: "quote_saved_100",
      code: "COT-2026-100",
      status: "BORRADOR",
    });

    await openDialog(onSavedMock);

    const clientSelect = document.body.querySelector("#quote-client");
    const eventSelect = document.body.querySelector("#quote-event");
    const conceptInput = document.body.querySelector("#quote-concept-0");
    const qtyInput = document.body.querySelector("#quote-quantity-0");
    const priceInput = document.body.querySelector("#quote-price-0");

    await act(async () => {
      setInputValue(clientSelect, "cli_1", "change");
    });
    await act(async () => {
      setInputValue(eventSelect, "101", "change");
      setInputValue(conceptInput, "Servicio de Escenario", "input");
      setInputValue(qtyInput, "1", "input");
      setInputValue(priceInput, "200000", "input");
    });

    const form = document.body.querySelector("form.equipment-form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    expect(createQuoteSpy).toHaveBeenCalledTimes(1);
    expect(createQuoteSpy).toHaveBeenCalledWith({
      clientId: "cli_1",
      eventId: 101,
      notes: null,
      items: [
        {
          concept: "Servicio de Escenario",
          quantity: 1,
          unitPrice: 200000,
        },
      ],
    });

    expect(onSavedMock).toHaveBeenCalledTimes(1);
    expect(onSavedMock).toHaveBeenCalledWith({
      id: "quote_saved_100",
      code: "COT-2026-100",
      status: "BORRADOR",
    });
  });

  it("Una respuesta antigua no sobrescribe una apertura o carga posterior", async () => {
    let resolveFirst;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const clientRequestSpy = vi.spyOn(clientesService, "clientRequest");
    clientRequestSpy.mockReturnValueOnce(firstPromise);
    clientRequestSpy.mockResolvedValueOnce([
      { id: "cli_new", name: "Cliente Nuevo", clientType: "persona" },
    ]);

    vi.spyOn(eventosService, "getEventos").mockResolvedValue([]);

    await act(async () => {
      root.render(<QuoteForm onSaved={vi.fn()} />);
    });
    const trigger = container.querySelector("button.primary-action");

    // Primera apertura (queda en espera con firstPromise)
    await act(async () => {
      trigger.click();
    });

    // Cerrar diálogo con botón Cancelar
    const cancelBtn = document.body.querySelector(".form-actions button");
    await act(async () => {
      cancelBtn.click();
    });

    // Segunda apertura inmediata (dispara segunda petición que resuelve de inmediato)
    await act(async () => {
      trigger.click();
    });

    let clientSelect = document.body.querySelector("#quote-client");
    expect(clientSelect.innerHTML).toContain("Cliente Nuevo");

    // Resuelve la primera petición desfasada con datos viejos
    await act(async () => {
      resolveFirst([{ id: "cli_viejo", name: "Cliente Viejo" }]);
    });

    clientSelect = document.body.querySelector("#quote-client");
    expect(clientSelect.innerHTML).toContain("Cliente Nuevo");
    expect(clientSelect.innerHTML).not.toContain("Cliente Viejo");
  });
});
