import { createClientSchema, updateClientSchema } from "./clientes.schema.js";
import { clientService } from "./clientes.service.js";

function formatearErroresZod(error) {
  if (Array.isArray(error?.issues)) {
    return error.issues.map((i) => i.message).filter(Boolean).join("; ");
  }
  return "Datos inválidos";
}

export function clientController(db) {
  const service = clientService(db);

  return {
    async listar(_req, res, next) {
      try {
        const clients = await service.listar();
        res.json(clients);
      } catch (error) {
        next(error);
      }
    },

    async obtenerPorId(req, res, next) {
      try {
        const client = await service.obtenerPorId(req.params.id);
        if (!client) {
          return res.status(404).json({ message: "Cliente no encontrado" });
        }
        res.json(client);
      } catch (error) {
        next(error);
      }
    },

    async crear(req, res, next) {
      try {
        const parseResult = createClientSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            message: formatearErroresZod(parseResult.error),
            issues: parseResult.error.issues,
          });
        }

        const client = await service.crear(parseResult.data);
        res.status(201).json(client);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(409).json({ message: "Ya existe un cliente con ese RUT" });
        }
        if (error.code === "VALIDATION_ERROR") {
          return res.status(400).json({ message: error.message });
        }
        next(error);
      }
    },

    async actualizar(req, res, next) {
      try {
        const { id } = req.params;
        if (!id || typeof id !== "string") {
          return res.status(400).json({ message: "Identificador de cliente inválido" });
        }

        const parseResult = updateClientSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            message: formatearErroresZod(parseResult.error),
            issues: parseResult.error.issues,
          });
        }

        const clientActualizado = await service.actualizar(id, parseResult.data);
        if (!clientActualizado) {
          return res.status(404).json({ message: "Cliente no encontrado para actualizar" });
        }

        res.status(200).json(clientActualizado);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(409).json({ message: "Ya existe un cliente con ese RUT" });
        }
        if (error.code === "VALIDATION_ERROR") {
          return res.status(400).json({ message: error.message });
        }
        next(error);
      }
    },
  };
}
