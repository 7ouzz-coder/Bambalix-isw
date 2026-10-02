import { describe, expect, it, vi } from "vitest";
import { eventosService } from "../src/modules/eventos/eventos.service.js";

describe("Servicio de eventos", () => {
  it("rechaza un cliente inexistente sin intentar guardar el evento", async () => {
    const db = { client: { findUnique: vi.fn().mockResolvedValue(null) }, event: { create: vi.fn() } };
    await expect(eventosService(db).crear({ clientId: "inexistente" })).rejects.toMatchObject({
      message: "Cliente no encontrado", statusCode: 404,
    });
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it("rechaza un tipo inexistente sin intentar guardar el evento", async () => {
    const db = {
      client: { findUnique: vi.fn().mockResolvedValue({ id: "cliente" }) },
      eventType: { findUnique: vi.fn().mockResolvedValue(null) },
      event: { create: vi.fn() },
    };
    await expect(eventosService(db).crear({ clientId: "cliente", eventTypeId: 99 })).rejects.toMatchObject({
      message: "Tipo de evento no encontrado", statusCode: 404,
    });
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it("mantiene las relaciones y el orden del listado original", async () => {
    const db = { event: { findMany: vi.fn().mockResolvedValue([]) } };
    expect(await eventosService(db).listar()).toEqual([]);
    expect(db.event.findMany).toHaveBeenCalledWith({
      include: {
        client: { select: { id: true, name: true } },
        eventType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});
