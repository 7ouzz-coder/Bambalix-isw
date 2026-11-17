import { describe, it, expect } from "vitest";
import { eventoItemSchema, eventosListSchema, eventoFormSchema } from "../schemas/eventos.schema.js";

describe("Validación de formulario de eventos (eventoFormSchema)", () => {
  const validForm = {
    title: "Gala de Fin de Año",
    clientId: "cli_123",
    eventTypeId: "1",
    startsAt: "2026-12-01T18:00",
    endsAt: "2026-12-01T23:00",
    attendees: "150",
    location: "Salón Principal",
    needs: "Audio e iluminación",
  };

  it("acepta un formulario válido con lugar obligatorio", () => {
    const result = eventoFormSchema.safeParse(validForm);
    expect(result.success).toBe(true);
  });

  it("rechaza si falta el lugar o está vacío/solo espacios", () => {
    expect(eventoFormSchema.safeParse({ ...validForm, location: "" }).success).toBe(false);
    expect(eventoFormSchema.safeParse({ ...validForm, location: "   " }).success).toBe(false);
    expect(eventoFormSchema.safeParse({ ...validForm, location: undefined }).success).toBe(false);
  });

  it("permite eventoItemSchema con location null para registros históricos", () => {
    const legacyEvent = {
      id: 5,
      title: "Evento Antiguo",
      startsAt: "2025-01-01T10:00:00.000Z",
      endsAt: "2025-01-01T12:00:00.000Z",
      attendees: 20,
      location: null,
      needs: null,
      eventType: { id: 1, name: "Corporativo" },
      client: { id: "cli_123", name: "Empresa Uno" },
    };
    const result = eventoItemSchema.safeParse(legacyEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.location).toBeNull();
    }
  });
});

describe("Validación de eventos recibidos (eventoItemSchema y eventosListSchema)", () => {
  const validEvent = {
    id: 10,
    title: "Gala de Fin de Año",
    startsAt: "2026-12-01T18:00:00.000Z",
    endsAt: "2026-12-01T23:00:00.000Z",
    attendees: 150,
    location: "Salón Principal",
    needs: "Audio e iluminación",
    eventType: { id: 1, name: "Corporativo" },
    client: { id: "cli_123", name: "Empresa Uno" },
  };

  it("acepta un registro válido completo", () => {
    const result = eventoItemSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(10);
      expect(result.data.title).toBe("Gala de Fin de Año");
    }
  });

  it("acepta una lista vacía válida", () => {
    const result = eventosListSchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("rechaza si id es un texto arbitrario (ej: 'abc')", () => {
    const invalid = { ...validEvent, id: "abc" };
    const result = eventoItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rechaza si id es 0", () => {
    const invalid = { ...validEvent, id: 0 };
    const result = eventoItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rechaza si id es un número negativo (ej: -1)", () => {
    const invalid = { ...validEvent, id: -1 };
    const result = eventoItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rechaza si la fecha de término es anterior al inicio", () => {
    const invalid = {
      ...validEvent,
      startsAt: "2026-12-01T20:00:00.000Z",
      endsAt: "2026-12-01T18:00:00.000Z",
    };
    const result = eventoItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rechaza si la cantidad de asistentes es negativa o 0", () => {
    const invalidNegative = { ...validEvent, attendees: -5 };
    expect(eventoItemSchema.safeParse(invalidNegative).success).toBe(false);

    const invalidZero = { ...validEvent, attendees: 0 };
    expect(eventoItemSchema.safeParse(invalidZero).success).toBe(false);
  });

  it("rechaza en la lista si contiene un elemento con id inválido", () => {
    const list = [validEvent, { ...validEvent, id: "invalido" }];
    const result = eventosListSchema.safeParse(list);
    expect(result.success).toBe(false);
  });
});
