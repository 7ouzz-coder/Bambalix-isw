import { Router } from "express";
import { z } from "zod";

const crearEventoSchema = z
  .object({
    title: z
      .string({ required_error: "El título es obligatorio" })
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(160, "El título no puede superar 160 caracteres"),
    clientId: z
      .union([z.string(), z.number()])
      .transform((val) => String(val))
      .refine((val) => val.length > 0, { message: "El cliente es obligatorio" }),
    eventTypeId: z
      .number({ required_error: "El tipo de evento es obligatorio" })
      .int("El ID de tipo de evento debe ser un entero")
      .positive("El ID de tipo de evento debe ser positivo"),
    startsAt: z
      .string({ required_error: "La fecha de inicio es obligatoria" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de inicio no es válida",
      }),
    endsAt: z
      .string({ required_error: "La fecha de término es obligatoria" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha de término no es válida",
      }),
    attendees: z
      .number({ required_error: "La cantidad de asistentes es obligatoria" })
      .int("Los asistentes deben ser un número entero")
      .min(1, "Debe haber al menos 1 asistente")
      .max(100000, "Los asistentes no pueden superar 100.000"),
    location: z.string().optional(),
    needs: z.string().optional(),
  })
  .refine(
    (data) => {
      const inicio = new Date(data.startsAt);
      const termino = new Date(data.endsAt);
      return termino > inicio;
    },
    {
      message: "El término debe ser posterior al inicio",
      path: ["endsAt"],
    }
  );

export function eventosRoutes(db) {
  const router = Router();

  // POST /api/v1/events — Crear evento
  router.post("/", async (req, res, next) => {
    try {
      const datos = crearEventoSchema.parse(req.body);

      // Verificar existencia de cliente
      const cliente = await db.client.findUnique({ where: { id: datos.clientId } });
      if (!cliente) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }

      // Verificar existencia de tipo de evento
      const tipo = await db.eventType.findUnique({ where: { id: datos.eventTypeId } });
      if (!tipo) {
        return res.status(404).json({ message: "Tipo de evento no encontrado" });
      }

      const evento = await db.event.create({
        data: {
          title: datos.title,
          clientId: datos.clientId,
          eventTypeId: datos.eventTypeId,
          startsAt: new Date(datos.startsAt),
          endsAt: new Date(datos.endsAt),
          attendees: datos.attendees,
          location: datos.location || null,
          needs: datos.needs || null,
        },
        include: {
          client: { select: { id: true, name: true } },
          eventType: { select: { id: true, name: true } },
        },
      });

      res.status(201).json(evento);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const mensaje = error.errors.map((e) => e.message).join("; ");
        return res.status(400).json({ message: mensaje });
      }
      next(error);
    }
  });

  // GET /api/v1/events — Listar eventos
  router.get("/", async (_req, res, next) => {
    try {
      const eventos = await db.event.findMany({
        include: {
          client: { select: { id: true, name: true } },
          eventType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(eventos);
    } catch (error) {
      next(error);
    }
  });

  // GET /api/v1/events/types — Listar tipos de evento
  router.get("/types", async (_req, res, next) => {
    try {
      const tipos = await db.eventType.findMany({
        orderBy: { name: "asc" },
      });
      res.json(tipos);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
