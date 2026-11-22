import { raw } from "express";
import { equipmentEvidenceController, imageTypes } from "../controllers/evidencia-equipos.controller.js";
import { validarIdEquipo } from "../middlewares/equipos.validation.js";
import { validarIdMantencion } from "../middlewares/mantenciones.validation.js";
import { validarIdAsignacion } from "../middlewares/asignaciones.validation.js";

export function mountEquipmentEvidence(router, db) {
  const controller = equipmentEvidenceController(db);
  const photos = "/:id/maintenances/:maintenanceId/photos/:stage";
  const incidents = "/:id/assignments/:assignmentId/incidents";
  router.get(photos, validarIdEquipo, validarIdMantencion, controller.photoKey, controller.getPhoto);
  router.post(photos, validarIdEquipo, validarIdMantencion, controller.photoKey,
    raw({ type: imageTypes, limit: "2mb" }), controller.savePhoto);
  router.get(incidents, validarIdEquipo, validarIdAsignacion, controller.checkAssignment, controller.listIncidents);
  router.post(incidents, validarIdEquipo, validarIdAsignacion, controller.checkAssignment, controller.createIncident);
}
