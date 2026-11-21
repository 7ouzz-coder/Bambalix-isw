import { raw } from "express";
import { z } from "zod";
import { validarIdEquipo } from "../middlewares/equipos.validation.js";
import { validarIdMantencion } from "../middlewares/mantenciones.validation.js";
import { validarIdAsignacion } from "../middlewares/asignaciones.validation.js";

const imageTypes = ["image/jpeg", "image/png"];
const photoPath = "/:id/maintenances/:maintenanceId/photos/:stage";
const incidentPath = "/:id/assignments/:assignmentId/incidents";
const incidentSchema = z.object({ description: z.string().trim().min(3).max(500) }).strict();

function validImage(mime, content) {
  if (!Buffer.isBuffer(content)) return false;
  if (mime === "image/png") return content.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  return mime === "image/jpeg" && content.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))
    && content.subarray(-2).equals(Buffer.from("ffd9", "hex"));
}

export function mountEquipmentEvidence(router, db) {
  async function photoKey(req, res, next) {
    const { stage } = req.params;
    if (stage !== "before" && stage !== "after") return res.status(400).json({ message: "Etapa inválida" });
    const { equipmentId, maintenanceId } = res.locals;
    const maintenance = await db.equipmentMaintenance.findFirst({
      where: { id: maintenanceId, resourceId: equipmentId }, select: { id: true },
    });
    if (!maintenance) return res.status(404).json({ message: "Mantención no encontrada para este equipo" });
    res.locals.photoKey = { maintenanceId_stage: { maintenanceId, stage } };
    next();
  }
  router.get(photoPath, validarIdEquipo, validarIdMantencion, photoKey, async (_req, res) => {
    const photo = await db.equipmentMaintenancePhoto.findUnique({ where: res.locals.photoKey });
    if (!photo) return res.status(404).json({ message: "No hay foto registrada para esta etapa" });
    res.type(photo.mime).send(Buffer.from(photo.content));
  });
  router.post(photoPath, validarIdEquipo, validarIdMantencion, photoKey, raw({ type: imageTypes, limit: "2mb" }), async (req, res) => {
    const mime = req.is(imageTypes);
    if (!validImage(mime, req.body)) return res.status(400).json({ message: "Selecciona una imagen JPEG o PNG válida" });
    const data = { mime, content: req.body };
    await db.equipmentMaintenancePhoto.upsert({
      where: res.locals.photoKey, create: { ...res.locals.photoKey.maintenanceId_stage, ...data }, update: data,
    });
    res.status(204).end();
  });

  async function checkAssignment(_req, res, next) {
    const { equipmentId, assignmentId } = res.locals;
    const assignment = await db.equipmentAssignment.findFirst({
      where: { id: assignmentId, resourceId: equipmentId }, select: { id: true },
    });
    if (!assignment) return res.status(404).json({ message: "Asignación no encontrada para este equipo" });
    next();
  }
  router.get(incidentPath, validarIdEquipo, validarIdAsignacion, checkAssignment, async (_req, res) => {
    res.json(await db.equipmentIncident.findMany({
      where: { assignmentId: res.locals.assignmentId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
    }));
  });
  router.post(incidentPath, validarIdEquipo, validarIdAsignacion, checkAssignment, async (req, res) => {
    const parsed = incidentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Describe la incidencia en 3 a 500 caracteres" });
    res.status(201).json(await db.equipmentIncident.create({
      data: { ...parsed.data, assignmentId: res.locals.assignmentId },
    }));
  });
}
