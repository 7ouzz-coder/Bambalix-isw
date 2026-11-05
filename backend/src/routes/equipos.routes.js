import { Router } from "express";
import { reemplazosRoutes } from "./reemplazos.routes.js";
import { asignacionesController } from "../controllers/asignaciones.controller.js";
import { validarAsignacion, validarPaginaAsignaciones, validarEventosAsignacion, validarDisponibilidad, validarLiberacion, validarIdAsignacion } from "../middlewares/asignaciones.validation.js";
import { equiposController } from "../controllers/equipos.controller.js";
import { mantencionesController } from "../controllers/mantenciones.controller.js";
import { validarMantencion, validarPaginaMantenciones, validarIdMantencion, validarNotaMantencion, validarCierreMantencion } from "../middlewares/mantenciones.validation.js";
import { validarEquipo, validarFiltrosEquipos, validarIdEquipo, validarEstadoEquipo, validarEdicionEquipo, validarPaginaEquipos, validarPaginaHistorialEquipo } from "../middlewares/equipos.validation.js";

export function equipmentRoutes(db) {
  const router = Router();
  const controller = equiposController(db);
  const maintenance = mantencionesController(db);
  const assignments = asignacionesController(db);
  router.use("/:id/assignments/:assignmentId/replacements", validarIdEquipo, validarIdAsignacion, reemplazosRoutes(db));
  router.get("/assignment-events", validarEventosAsignacion, assignments.eventos);
  router.get("/:id/availability", validarIdEquipo, validarDisponibilidad, assignments.disponibilidad);
  router.get("/:id/assignments", validarIdEquipo, validarPaginaAsignaciones, assignments.listar);
  router.post("/:id/assignments", validarIdEquipo, validarAsignacion, assignments.crear);
  router.patch("/:id/assignments/:assignmentId/release", validarIdEquipo, validarIdAsignacion, validarLiberacion, assignments.liberar);
  router.get("/:id/maintenances", validarIdEquipo, validarPaginaMantenciones, maintenance.listar);
  router.post("/:id/maintenances", validarIdEquipo, validarMantencion, maintenance.crear);
  router.get("/:id/maintenances/:maintenanceId/notes", validarIdEquipo, validarIdMantencion, validarPaginaMantenciones, maintenance.notas);
  router.post("/:id/maintenances/:maintenanceId/notes", validarIdEquipo, validarIdMantencion, validarNotaMantencion, maintenance.agregarNota);
  router.patch("/:id/maintenances/:maintenanceId/close", validarIdEquipo, validarIdMantencion, validarCierreMantencion, maintenance.cerrar);
  router.get("/categories", controller.listarCategoriasEquipos);
  router.get("/page", validarPaginaEquipos, controller.listarPaginaEquipos);
  router.get("/", validarFiltrosEquipos, controller.listarEquipos);
  router.post("/", validarEquipo, controller.crearEquipo);
  router.patch("/:id/status", validarIdEquipo, validarEstadoEquipo, controller.cambiarEstadoEquipo);
  router.get("/:id/status-history", validarIdEquipo, controller.listarHistorialEquipo);
  router.get("/:id/status-history/page", validarIdEquipo, validarPaginaHistorialEquipo, controller.listarPaginaHistorialEquipo);
  router.patch("/:id", validarIdEquipo, validarEdicionEquipo, controller.editarEquipo);
  return router;
}
