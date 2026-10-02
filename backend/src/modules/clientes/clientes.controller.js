import { clientService } from "./clientes.service.js";

export function clientController(db) {
  const service = clientService(db);
  return {
    async listar(_req, res) {
      res.json(await service.listar());
    },
    async crear(req, res) {
      try {
        res.status(201).json(await service.crear(req.body));
      } catch (error) {
        if (error.code === "P2002") return res.status(409).json({ message: "Ya existe un cliente con ese RUT" });
        throw error;
      }
    },
  };
}
