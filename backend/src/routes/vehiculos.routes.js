import { Router } from "express";
import { vehiculosController } from "../controllers/vehiculos.controller.js";
import { validarVehiculo, validarEdicionVehiculo, validarFiltrosVehiculos, validarIdVehiculo, validarPaginaVehiculos } from "../middlewares/vehiculos.validation.js";

export function vehicleRoutes(db) {
  const router = Router();
  const controller = vehiculosController(db);
  router.get("/types", controller.listarTipos);
  router.get("/page", validarPaginaVehiculos, controller.listarPagina);
  router.get("/", validarFiltrosVehiculos, controller.listar);
  router.post("/", validarVehiculo, controller.crear);
  router.patch("/:id", validarIdVehiculo, validarEdicionVehiculo, controller.editar);
  return router;
}
