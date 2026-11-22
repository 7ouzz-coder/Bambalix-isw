import { z } from "zod";
import { equipmentEvidenceService } from "../services/evidencia-equipos.service.js";

export const imageTypes = ["image/jpeg", "image/png"];
const incidentSchema = z.object({ description: z.string().trim().min(3).max(500) }).strict();

function handle(action) {
  return async (req, res, next) => {
    try {
      await action(req, res, next);
    } catch (error) {
      if (error.status === 400 || error.status === 404) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  };
}

export function equipmentEvidenceController(db) {
  const service = equipmentEvidenceService(db);
  return {
    photoKey: handle(async (req, res, next) => {
      res.locals.photoKey = await service.photoKey(res.locals.equipmentId, res.locals.maintenanceId, req.params.stage);
      next();
    }),
    getPhoto: handle(async (_req, res) => {
      const photo = await service.getPhoto(res.locals.photoKey);
      res.type(photo.mime).send(Buffer.from(photo.content));
    }),
    savePhoto: handle(async (req, res) => {
      await service.savePhoto(res.locals.photoKey, req.is(imageTypes), req.body);
      res.status(204).end();
    }),
    checkAssignment: handle(async (_req, res, next) => {
      await service.checkAssignment(res.locals.equipmentId, res.locals.assignmentId);
      next();
    }),
    listIncidents: handle(async (_req, res) => {
      res.json(await service.listIncidents(res.locals.assignmentId));
    }),
    createIncident: handle(async (req, res) => {
      const parsed = incidentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Describe la incidencia en 3 a 500 caracteres" });
      res.status(201).json(await service.createIncident(res.locals.assignmentId, parsed.data.description));
    }),
  };
}
