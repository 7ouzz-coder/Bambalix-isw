import { clientService } from "../services/clientes.service.js";

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
        const client = await service.crear(req.validatedBody || req.body);
        res.status(201).json(client);
      } catch (error) {
        if (error.code === "P2002" || error.statusCode === 409) {
          return res.status(409).json({ message: "Ya existe un cliente con ese RUT" });
        }
        if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
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

        const clientActualizado = await service.actualizar(id, req.validatedBody || req.body);
        if (!clientActualizado) {
          return res.status(404).json({ message: "Cliente no encontrado para editar" });
        }

        res.status(200).json(clientActualizado);
      } catch (error) {
        if (error.code === "P2002" || error.statusCode === 409) {
          return res.status(409).json({ message: "Ya existe un cliente con ese RUT" });
        }
        if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
      }
    },
  };
}
