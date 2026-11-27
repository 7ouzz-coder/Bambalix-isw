import { Router } from "express";
import { vehicleMaintenanceSchema, vehicleAssignmentSchema } from "../schemas/vehiculos.schema.js";
import { vehiculosController } from "../controllers/vehiculos.controller.js";
import { validarVehiculo, validarEdicionVehiculo, validarFiltrosVehiculos, validarIdVehiculo, validarPaginaVehiculos } from "../middlewares/vehiculos.validation.js";

export function vehicleRoutes(db) {
  const router = Router();
  const controller = vehiculosController(db);
  router.get("/types", controller.listarTipos);
  router.get("/page", validarPaginaVehiculos, controller.listarPagina);
  router.get("/", validarFiltrosVehiculos, controller.listar);
  router.post("/", validarVehiculo, controller.crear);
  router.get("/:id/maintenances", validarIdVehiculo, controller.listarMantenciones);
  router.post("/:id/maintenances", validarIdVehiculo, (req, res, next) => {
    const parsed = vehicleMaintenanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Revisa las fechas y el motivo de la mantención" });
    res.locals.maintenance = parsed.data;
    next();
  }, controller.crearMantencion);
  router.get("/:id/assignments", validarIdVehiculo, controller.listarAsignaciones);
  router.post("/:id/assignments", validarIdVehiculo, (req, res, next) => {
    const parsed = vehicleAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Revisa el evento y las fechas" });
    res.locals.assignment = parsed.data;
    next();
  }, controller.asignar);
  router.delete("/:id", validarIdVehiculo, controller.eliminar);
  router.patch("/:id", validarIdVehiculo, validarEdicionVehiculo, controller.editar);
  return router;
}
