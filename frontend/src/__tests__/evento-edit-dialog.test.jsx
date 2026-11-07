// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import ReactDOMClient from "react-dom/client";
import { EventoEditDialog } from "../modules/eventos/evento-edit-dialog.jsx";
import * as eventosService from "../services/eventos.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("Pruebas de interacción y precarga en EventoEditDialog", () => {
  let container;
  let root;

  const mockEvento1 = {
    id: 1,
    title: "Gala Original",
    clientId: "cli_10",
    eventTypeId: 2,
    startsAt: "2026-12-10T18:00:00.000Z",
    endsAt: "2026-12-10T23:00:00.000Z",
    attendees: 100,
    location: "Salón Principal",
    needs: "Audio básico",
    client: { id: "cli_10", name: "Cliente Diez" },
    eventType: { id: 2, name: "Corporativo" },
  };

  const mockEvento2 = {
    id: 2,
    title: "Fiesta de Cierre",
    clientId: "cli_20",
    eventTypeId: 3,
    startsAt: "2026-12-15T20:00:00.000Z",
    endsAt: "2026-12-16T02:00:00.000Z",
    attendees: 50,
    location: "Terraza",
    needs: "Luces disco",
    client: { id: "cli_20", name: "Cliente Veinte" },
    eventType: { id: 3, name: "Social" },
  };

  const mockClientes = [
    { id: "cli_10", name: "Cliente Diez" },
    { id: "cli_20", name: "Cliente Veinte" },
  ];

  const mockTipos = [
    { id: 1, name: "General" },
    { id: 2, name: "Corporativo" },
    { id: 3, name: "Social" },
  ];

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

  it("conserva el título editado durante la carga y precarga Cliente y Tipo originales al resolver opciones", async () => {
    let resolveClientes;
    let resolveTipos;
    const clientesPromise = new Promise((resolve) => {
      resolveClientes = resolve;
    });
    const tiposPromise = new Promise((resolve) => {
      resolveTipos = resolve;
    });

    vi.spyOn(eventosService, "getClientes").mockImplementation(() => clientesPromise);
    vi.spyOn(eventosService, "getTiposEvento").mockImplementation(() => tiposPromise);
    const updateSpy = vi.spyOn(eventosService, "updateEvento").mockResolvedValue({
      ...mockEvento1,
      title: "Gala Modificada por el Usuario",
    });

    const onSaved = vi.fn();
    const onOpenChange = vi.fn();

    // 1. Abrir diálogo con evento 1 (con consultas pendientes)
    await act(async () => {
      root.render(
        <EventoEditDialog
          evento={mockEvento1}
          open={true}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      );
    });

    const titleInput = document.body.querySelector("#edit-title");
    expect(titleInput).not.toBeNull();
    expect(titleInput.value).toBe("Gala Original");

    // Los selectores están deshabilitados durante la carga
    const clientSelect = document.body.querySelector("#edit-client");
    const typeSelect = document.body.querySelector("#edit-eventType");
    expect(clientSelect.disabled).toBe(true);
    expect(typeSelect.disabled).toBe(true);

    // 2. El usuario modifica el título durante la carga
    await act(async () => {
      setInputValue(titleInput, "Gala Modificada por el Usuario", "input");
    });
    expect(titleInput.value).toBe("Gala Modificada por el Usuario");

    // 3. Se resuelven las opciones asíncronas
    await act(async () => {
      resolveClientes(mockClientes);
      resolveTipos(mockTipos);
    });

    // 4. Comprobar que Cliente y Tipo muestran sus valores originales una vez disponibles en el DOM
    expect(clientSelect.disabled).toBe(false);
    expect(typeSelect.disabled).toBe(false);
    expect(clientSelect.value).toBe("cli_10");
    expect(typeSelect.value).toBe("2");

    // 5. Comprobar que el título conserva lo escrito por el usuario
    expect(titleInput.value).toBe("Gala Modificada por el Usuario");

    // 6. Guardar cambios y comprobar que se conservan asociaciones y fechas originales
    const submitBtn = document.body.querySelector("button[type='submit']");
    expect(submitBtn.disabled).toBe(false);

    const form = document.body.querySelector("form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        title: "Gala Modificada por el Usuario",
        clientId: "cli_10",
        eventTypeId: 2,
        attendees: 100,
        location: "Salón Principal",
      })
    );
  });

  it("al cerrar y abrir otro evento se cargan sus propios datos", async () => {
    vi.spyOn(eventosService, "getClientes").mockResolvedValue(mockClientes);
    vi.spyOn(eventosService, "getTiposEvento").mockResolvedValue(mockTipos);

    const { rerender } = {
      rerender: (el) => act(async () => { root.render(el); }),
    };

    // Abrir evento 1
    await rerender(
      <EventoEditDialog
        evento={mockEvento1}
        open={true}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(document.body.querySelector("#edit-title").value).toBe("Gala Original");
    expect(document.body.querySelector("#edit-client").value).toBe("cli_10");
    expect(document.body.querySelector("#edit-eventType").value).toBe("2");

    // Cerrar diálogo
    await rerender(
      <EventoEditDialog
        evento={mockEvento1}
        open={false}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    // Abrir evento 2
    await rerender(
      <EventoEditDialog
        evento={mockEvento2}
        open={true}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(document.body.querySelector("#edit-title").value).toBe("Fiesta de Cierre");
    expect(document.body.querySelector("#edit-client").value).toBe("cli_20");
    expect(document.body.querySelector("#edit-eventType").value).toBe("3");
    expect(document.body.querySelector("#edit-location").value).toBe("Terraza");
  });

  it("modificar notas conserva cliente, tipo de evento y horario al guardar", async () => {
    vi.spyOn(eventosService, "getClientes").mockResolvedValue(mockClientes);
    vi.spyOn(eventosService, "getTiposEvento").mockResolvedValue(mockTipos);
    const updateSpy = vi.spyOn(eventosService, "updateEvento").mockResolvedValue({
      ...mockEvento1,
      needs: "Audio mejorado con microfonía adicional",
    });

    await act(async () => {
      root.render(
        <EventoEditDialog
          evento={mockEvento1}
          open={true}
          onOpenChange={vi.fn()}
          onSaved={vi.fn()}
        />
      );
    });

    const needsInput = document.body.querySelector("#edit-needs");
    await act(async () => {
      setInputValue(needsInput, "Audio mejorado con microfonía adicional", "input");
    });

    const form = document.body.querySelector("form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        title: "Gala Original",
        clientId: "cli_10",
        eventTypeId: 2,
        needs: "Audio mejorado con microfonía adicional",
        startsAt: new Date(mockEvento1.startsAt).toISOString(),
        endsAt: new Date(mockEvento1.endsAt).toISOString(),
      })
    );
  });

  it("una respuesta tardía de un diálogo cerrado no altera el formulario actual", async () => {
    let resolveFirstClientes;
    const pendingPromise = new Promise((resolve) => {
      resolveFirstClientes = resolve;
    });

    const getClientesSpy = vi.spyOn(eventosService, "getClientes");
    getClientesSpy.mockImplementationOnce(() => pendingPromise);
    getClientesSpy.mockResolvedValue(mockClientes);
    vi.spyOn(eventosService, "getTiposEvento").mockResolvedValue(mockTipos);

    const { rerender } = {
      rerender: (el) => act(async () => { root.render(el); }),
    };

    // 1. Abrir diálogo con evento 1 (queda pendiente)
    await rerender(
      <EventoEditDialog
        evento={mockEvento1}
        open={true}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    // 2. Cerrar diálogo mientras está pendiente
    await rerender(
      <EventoEditDialog
        evento={mockEvento1}
        open={false}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    // 3. Abrir evento 2 (resuelve de inmediato)
    await rerender(
      <EventoEditDialog
        evento={mockEvento2}
        open={true}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(document.body.querySelector("#edit-title").value).toBe("Fiesta de Cierre");
    expect(document.body.querySelector("#edit-client").value).toBe("cli_20");
    expect(document.body.querySelector("#edit-eventType").value).toBe("3");

    // 4. Se resuelve la primera petición atrasada del evento 1 cerrado
    await act(async () => {
      resolveFirstClientes([{ id: "cli_obsoleto", name: "Cliente Obsoleto" }]);
    });

    // 5. El formulario actual del evento 2 no fue modificado
    expect(document.body.querySelector("#edit-title").value).toBe("Fiesta de Cierre");
    expect(document.body.querySelector("#edit-client").value).toBe("cli_20");
    expect(document.body.querySelector("#edit-eventType").value).toBe("3");
  });
});
