import { describe, it, expect } from "vitest";
import { assignmentFormSchema } from "../src/schemas/asignaciones.schema.js";
import { maintenanceFormSchema } from "../src/schemas/mantenciones.schema.js";
import { vehicleSchema } from "../src/schemas/vehiculos.schema.js";

describe("Validaciones de operaciones", () => {
  const period = { startsAt: "2030-05-10T10:00", endsAt: "2030-05-10T12:00" };
  it("exige un evento válido y un período real y ordenado", () => {
    expect(assignmentFormSchema.safeParse({ ...period, eventId: 1 }).success).toBe(true);
    expect(assignmentFormSchema.safeParse({ ...period, eventId: 0 }).success).toBe(false);
    expect(assignmentFormSchema.safeParse({ ...period, eventId: 1, endsAt: period.startsAt }).success).toBe(false);
    expect(assignmentFormSchema.safeParse({ ...period, eventId: 1, startsAt: "2030-02-30T10:00" }).success).toBe(false);
  });
  it("exige motivo y fechas válidas en mantenciones", () => {
    expect(maintenanceFormSchema.safeParse({ ...period, reason: "Revisión" }).success).toBe(true);
    expect(maintenanceFormSchema.safeParse({ ...period, reason: "  " }).success).toBe(false);
    expect(maintenanceFormSchema.safeParse({ ...period, endsAt: period.startsAt, reason: "Revisión" }).success).toBe(false);
  });
  it("normaliza la patente y rechaza símbolos ajenos al formato admitido", () => {
    expect(vehicleSchema.safeParse({ name: "Camión", type: "Carga", plate: "ab-cd-12" }).data.plate).toBe("ABCD12");
    expect(vehicleSchema.safeParse({ name: "Camión", type: "Carga", plate: "AB1234" }).success).toBe(true);
    expect(vehicleSchema.safeParse({ name: "Camión", type: "Carga", plate: "AB/CD" }).success).toBe(false);
    expect(vehicleSchema.safeParse({ name: "Camión", type: "Carga", plate: "ABC123" }).success).toBe(false);
  });
});
