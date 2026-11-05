export function clientService(db) {
  return {
    async listar() {
      return db.client.findMany({ orderBy: { name: "asc" } });
    },

    async obtenerPorId(id) {
      if (!id || typeof id !== "string") return null;
      return db.client.findUnique({ where: { id } });
    },

    async crear(data) {
      if (data.rut) {
        const existente = await db.client.findFirst({ where: { rut: data.rut } });
        if (existente) {
          const error = new Error("Ya existe un cliente con ese RUT");
          error.code = "P2002";
          error.statusCode = 409;
          throw error;
        }
      }
      return db.client.create({ data });
    },

    async actualizar(id, data) {
      if (!id || typeof id !== "string") return null;

      // 1. Obtener cliente actual para no perder datos no enviados (undefined)
      const clienteActual = await db.client.findUnique({ where: { id } });
      if (!clienteActual) {
        return null; // El controlador responde 404 (evita crear accidentalmente un cliente nuevo)
      }

      // 2. Fusionar sobre el estado final para validar reglas de negocio integradas
      const objetoFusionado = { ...clienteActual };
      for (const [clave, valor] of Object.entries(data)) {
        if (valor !== undefined) {
          objetoFusionado[clave] = valor;
        }
      }

      // 3. Validar regla 'empresa vs contacto' sobre el objeto final fusionado
      if (objetoFusionado.clientType === "empresa") {
        if (!objetoFusionado.contactName || objetoFusionado.contactName.trim().length < 2) {
          const error = new Error("Para clientes tipo empresa se requiere el nombre del encargado de contacto");
          error.statusCode = 400;
          throw error;
        }
      }

      // 4. Validar unicidad del RUT sin colisionar consigo mismo
      if (data.rut !== undefined && data.rut !== null && data.rut !== clienteActual.rut) {
        const duplicado = await db.client.findFirst({
          where: {
            rut: data.rut,
            id: { not: id },
          },
        });
        if (duplicado) {
          const error = new Error("Ya existe un cliente con ese RUT");
          error.code = "P2002";
          error.statusCode = 409;
          throw error;
        }
      }

      // 5. Filtrar estrictamente solo los campos definidos (distingue undefined de null)
      const camposParaActualizar = {};
      for (const [clave, valor] of Object.entries(data)) {
        if (valor !== undefined && clave !== "id" && clave !== "createdAt") {
          camposParaActualizar[clave] = valor;
        }
      }

      return db.client.update({
        where: { id },
        data: camposParaActualizar,
      });
    },
  };
}
