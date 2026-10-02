import { equipmentService } from "./equipos.service.js";

export function equipmentController(db) {
  const service = equipmentService(db);
  return {
    async listar(_req, res) {
      res.json(await service.listar());
    },
    async crear(req, res) {
      try {
        res.status(201).json(await service.crear(req.body));
      } catch (error) {
        if (error.code === "P2002") return res.status(409).json({ message: "Ya existe un equipo con ese código" });
        throw error;
      }
    },
  };
}
