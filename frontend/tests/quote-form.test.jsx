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
    vi.spyOn(cotizacionesService, "getQuoteResources").mockResolvedValue({ equipos: [], vehiculos: [] });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  async function openDialog(onSaved = vi.fn(), quote) {
    await act(async () => {
      root.render(<QuoteForm onSaved={onSaved} quote={quote} />);
    });
    const trigger = container.querySelector("button");
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

  it("precarga un borrador y guarda los cambios usando su ID", async () => {
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);
    const onSaved = vi.fn();
    const quote = {
      id: "quote_1",
      clientId: "cli_1",
      eventId: 101,
      notes: "Nota anterior",
      items: [{ concept: "Audio", quantity: 2, unitPrice: "15000" }],
    };
    const update = vi.spyOn(cotizacionesService, "updateQuote").mockResolvedValue(quote);
    await openDialog(onSaved, quote);

    expect(document.querySelector("#quote-client").value).toBe("cli_1");
    expect(document.querySelector("#quote-event").value).toBe("101");
    expect(document.querySelector("#quote-concept-0").value).toBe("Audio");
    expect(document.querySelector("#quote-price-0").value).toBe("15000");
    expect(document.querySelector("#quote-notes").value).toBe("Nota anterior");

    await act(async () => setInputValue(document.querySelector("#quote-price-0"), "16000"));
    await act(async () => {
      document.querySelector("form.equipment-form")
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(update).toHaveBeenCalledWith("quote_1", {
      clientId: "cli_1",
      eventId: 101,
      notes: "Nota anterior",
      items: [{ concept: "Audio", quantity: 2, unitPrice: 16000 }],
    });
    expect(onSaved).toHaveBeenCalledWith(quote);
  });

  it("filtra clientes sin distinguir tildes y conserva el cliente del borrador", async () => {
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue([...validClients,
      { id: "cli_3", name: "José Pérez" }, { id: "cli_4", name: "Otro cliente" },
    ]);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);
    await openDialog(vi.fn(), {
      id: "quote_1", clientId: "cli_1", eventId: 101,
      items: [{ concept: "Audio", quantity: 1, unitPrice: 1000 }],
    });
    const search = document.querySelector("#quote-client-search");
    const client = document.querySelector("#quote-client");
    await act(async () => setInputValue(search, "JOSE"));
    expect([...client.options].map(option => option.value)).toEqual(["", "cli_1", "cli_3"]);
    expect(client.value).toBe("cli_1");
    expect(document.querySelector("#quote-event").value).toBe("101");
    await act(async () => setInputValue(search, "sin coincidencias"));
    expect(document.body.textContent).toContain("No hay clientes que coincidan");
  });

  it.each([["equipment", "Consola"], ["vehicle", "Furgón"]])("precarga el concepto de %s y conserva el precio y el texto editado", async (kind, name) => {
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);
    vi.mocked(cotizacionesService.getQuoteResources).mockResolvedValue({
      equipos: [{ id: "e1", name: "Consola" }],
      vehiculos: [{ id: "v1", name: "Furgón" }],
    });
    await openDialog(vi.fn(), {
      id: "quote_1", clientId: "cli_1", eventId: 101,
      items: [{ concept: "", quantity: 1, unitPrice: 12000 }],
    });
    const resource = document.querySelector("#quote-resource-0");
    const concept = document.querySelector("#quote-concept-0");
    await act(async () => { resource.value = kind === "equipment" ? "equipment:e1" : "vehicle:v1"; resource.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(concept.value).toBe(name);
    expect(document.querySelector("#quote-price-0").value).toBe("12000");
    await act(async () => setInputValue(concept, "Concepto acordado"));
    await act(async () => { resource.value = kind === "equipment" ? "vehicle:v1" : "equipment:e1"; resource.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(concept.value).toBe("Concepto acordado");
  });

  it("muestra el recurso guardado como no disponible sin borrarlo al editar", async () => {
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);
    vi.spyOn(cotizacionesService, "updateQuote").mockRejectedValue(new Error("Uno de los recursos ya no está disponible"));
    const quote = {
      id: "quote_1", clientId: "cli_1", eventId: 101, notes: "",
      items: [{ concept: "Traslado", quantity: 1, unitPrice: "1000", vehicleId: "vehiculo_1" }],
    };
    await openDialog(vi.fn(), quote);
    const select = document.querySelector("#quote-resource-0");
    expect(select.value).toBe("vehicle:vehiculo_1");
    expect(select.selectedOptions[0].textContent).toContain("ya no disponible");
    await act(async () => {
      document.querySelector("form.equipment-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(cotizacionesService.updateQuote).not.toHaveBeenCalled();
    expect(document.querySelector("button[type=submit]").disabled).toBe(true);
    expect(document.querySelector("[role='alert']").textContent).toContain("ya no está disponible");
  });

  it("actualiza la disponibilidad sin perder el recurso seleccionado ni los datos", async () => {
    vi.useFakeTimers();
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);
    vi.mocked(cotizacionesService.getQuoteResources)
      .mockResolvedValueOnce({ equipos: [], vehiculos: [{ id: "vehiculo_1", name: "Furgón", plate: "AB1234" }] })
      .mockResolvedValue({ equipos: [], vehiculos: [] });
    const quote = { id: "quote_1", clientId: "cli_1", eventId: 101, notes: "Conservar",
      items: [{ concept: "Traslado", quantity: 1, unitPrice: "1000", vehicleId: "vehiculo_1" }] };
    await openDialog(vi.fn(), quote);
    const select = document.querySelector("#quote-resource-0");
    expect(select.selectedOptions[0].textContent).toContain("Furgón");
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(select.value).toBe("vehicle:vehiculo_1");
    expect(select.selectedOptions[0].textContent).toContain("ya no disponible");
    expect(document.querySelector("#quote-notes").value).toBe("Conservar");
    expect(document.querySelector("button[type=submit]").disabled).toBe(true);
    expect(document.querySelector("[role=alert]").textContent).toContain("ya no está disponible");
  });

  it("bloquea el guardado si falla la consulta y se recupera al reintentar", async () => {
    vi.useFakeTimers();
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue(validEvents);
    vi.mocked(cotizacionesService.getQuoteResources)
      .mockRejectedValueOnce(new Error("Sin conexión"))
      .mockResolvedValue({ equipos: [], vehiculos: [] });
    const quote = { id: "quote_1", clientId: "cli_1", eventId: 101, notes: "",
      items: [{ concept: "Servicio", quantity: 1, unitPrice: "1000" }] };
    await openDialog(vi.fn(), quote);
    expect(document.querySelector("[role=alert]").textContent).toContain("No se pudo actualizar");
    expect(document.querySelector("button[type=submit]").disabled).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(document.querySelector("[role=alert]")).toBeNull();
    expect(document.querySelector("button[type=submit]").disabled).toBe(false);
  });

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
      setInputValue(document.body.querySelector("#quote-notes"), "Montaje incluido", "input");
    });

    const form = document.body.querySelector("form.equipment-form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    expect(createQuoteSpy).toHaveBeenCalledTimes(1);
    expect(createQuoteSpy).toHaveBeenCalledWith({
      clientId: "cli_1",
      eventId: 101,
      notes: "Montaje incluido",
      items: [
        {
          concept: "Servicio de Escenario",
          quantity: 1,
          unitPrice: 200000,
        },
      ],
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => { container.querySelector("button").click(); });
    expect(document.body.querySelector("#quote-client").value).toBe("");
    expect(document.body.querySelector("#quote-event").value).toBe("");
    expect(document.body.querySelector("#quote-notes").value).toBe("");
    expect(document.body.querySelector("#quote-concept-0").value).toBe("");
    expect(document.body.querySelector("#quote-quantity-0").value).toBe("1");
    expect(document.body.querySelector("#quote-price-0").value).toBe("0");
    expect(document.body.querySelector("#quote-concept-1")).toBeNull();
    expect(onSavedMock).toHaveBeenCalledTimes(1);
    expect(onSavedMock).toHaveBeenCalledWith({
      id: "quote_saved_100",
      code: "COT-2026-100",
      status: "BORRADOR",
    });
  });

  it("utiliza los identificadores y textos normalizados al cargar", async () => {
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue([{ ...validClients[0], id: "  cli_1  ", name: "  Cliente normalizado  " }]);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue([{ ...validEvents[0], clientId: "  cli_1  " }]);
    await openDialog();
    const option = document.body.querySelector('#quote-client option[value="cli_1"]');
    expect(option).not.toBeNull();
    expect(option.textContent.trim()).toBe("Cliente normalizado (Empresa)");
    await act(async () => { setInputValue(document.body.querySelector("#quote-client"), "cli_1", "change"); });
    expect(document.body.querySelector('#quote-event option[value="101"]')).not.toBeNull();
  });

  it.each([true, false, "101", null, 0, -1, 1.5])("rechaza identificador de evento inválido %s", async id => {
    vi.spyOn(clientesService, "clientRequest").mockResolvedValue(validClients);
    vi.spyOn(eventosService, "getEventos").mockResolvedValue([{ ...validEvents[0], id }]);
    const save = vi.spyOn(cotizacionesService, "createQuote");
    await openDialog();
    expect(document.body.querySelector('[role="alert"]').textContent).toContain("formato inválido");
    expect(save).not.toHaveBeenCalled();
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
    const trigger = container.querySelector("button");

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
