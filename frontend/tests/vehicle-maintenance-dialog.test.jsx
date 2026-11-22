// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { VehicleMaintenanceDialog } from "../src/components/vehiculos/vehicle-maintenance-dialog.jsx";
import * as vehicles from "../src/services/vehiculos.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }) => <div>{children}</div>,
  DialogTrigger: ({ children }) => children,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogDescription: ({ children }) => <p>{children}</p>,
}));

let container, root;
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); vi.restoreAllMocks(); });
function input(element, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Mantención de vehículos", () => {
  it("conserva fechas al escribir el motivo y envía el período validado", async () => {
    const create = vi.spyOn(vehicles, "createVehicleMaintenance").mockResolvedValue({});
    vi.spyOn(vehicles, "listVehicleMaintenances").mockResolvedValue([]);
    const changed = vi.fn();
    container = document.createElement("div"); document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<VehicleMaintenanceDialog vehicle={{ id: "test", name: "Furgón" }} onChanged={changed} />));
    const start = container.querySelector('[name="startsAt"]');
    const end = container.querySelector('[name="endsAt"]');
    const reason = container.querySelector('#vehicle-maintenance-reason');
    await act(async () => { input(start, "2030-01-15T10:00"); input(end, "2030-01-15T12:00"); input(reason, "Revisión de prueba"); });
    expect(start.value).toBe("2030-01-15T10:00");
    expect(end.value).toBe("2030-01-15T12:00");
    await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(create).toHaveBeenCalledWith("test", { startsAt: new Date("2030-01-15T10:00").toISOString(), endsAt: new Date("2030-01-15T12:00").toISOString(), reason: "Revisión de prueba" });
    expect(changed).toHaveBeenCalled();
    expect(start.value).toBe("");
  });
});
