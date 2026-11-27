import { resourceError } from "./disponibilidad.service.js";

export function validImage(mime, content) {
  if (!Buffer.isBuffer(content)) return false;
  if (mime === "image/png") return content.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  return mime === "image/jpeg" && content.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))
    && content.subarray(-2).equals(Buffer.from("ffd9", "hex"));
}

export function equipmentEvidenceService(db) {
  async function photoKey(equipmentId, maintenanceId, stage) {
    if (stage !== "before" && stage !== "after") throw resourceError("Etapa inválida", 400);
    const maintenance = await db.equipmentMaintenance.findFirst({
      where: { id: maintenanceId, resourceId: equipmentId }, select: { id: true },
    });
    if (!maintenance) throw resourceError("Mantención no encontrada para este equipo", 404);
    return { maintenanceId_stage: { maintenanceId, stage } };
  }

  async function checkAssignment(equipmentId, assignmentId) {
    const assignment = await db.equipmentAssignment.findFirst({
      where: { id: assignmentId, resourceId: equipmentId }, select: { id: true },
    });
    if (!assignment) throw resourceError("Asignación no encontrada para este equipo", 404);
  }

  return {
    photoKey,
    checkAssignment,
    async getPhoto(where) {
      const photo = await db.equipmentMaintenancePhoto.findUnique({ where });
      if (!photo) throw resourceError("No hay foto registrada para esta etapa", 404);
      return photo;
    },
    async savePhoto(where, mime, content) {
      if (!validImage(mime, content)) throw resourceError("Selecciona una imagen JPEG o PNG válida", 400);
      const data = { mime, content };
      await db.equipmentMaintenancePhoto.upsert({
        where, create: { ...where.maintenanceId_stage, ...data }, update: data,
      });
    },
    listIncidents(assignmentId) {
      return db.equipmentIncident.findMany({
        where: { assignmentId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
      });
    },
    createIncident(assignmentId, description) {
      return db.equipmentIncident.create({ data: { assignmentId, description } });
    },
  };
}
