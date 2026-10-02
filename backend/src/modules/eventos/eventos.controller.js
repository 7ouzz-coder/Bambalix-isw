import { eventosService } from "./eventos.service.js";

export function eventosController(db) {
  const service = eventosService(db);
  return {
    async crear(req, res) {
      res.status(201).json(await service.crear(req.body));
    },
    async listar(_req, res) {
      res.json(await service.listar());
    },
    async listarTipos(_req, res) {
      res.json(await service.listarTipos());
    },
  };
}
