function rutNormalizado(rut) {
  return rut.replace(/[.\s-]/g, "").toUpperCase().replace(/^0+(?=\d)/, "");
}

function rutGuardado(rut) {
  const limpio = rutNormalizado(rut);
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

async function rutEnUso(db, rut, excludedId) {
  const clients = await db.client.findMany({ where: { rut: { not: null } }, select: { id: true, rut: true } });
  return clients.some(client => client.id !== excludedId && client.rut && rutNormalizado(client.rut) === rutNormalizado(rut));
}

function duplicadoRut() {
  const error = new Error("Ya existe un cliente con ese RUT");
  error.code = "P2002";
  error.statusCode = 409;
  return error;
}

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
      if (data.rut && (await db.client.findFirst({ where: { rut: data.rut } }) || await rutEnUso(db, data.rut))) throw duplicadoRut();
      return db.client.create({ data: { ...data, rut: data.rut ? rutGuardado(data.rut) : data.rut } });
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

      for (const [field, label] of [["rut", "RUT"], ["phone", "teléfono"]]) {
        if (!objetoFusionado[field]?.trim()) {
          const error = new Error(`El ${label} es obligatorio`);
          error.statusCode = 400;
          throw error;
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

      if (data.rut !== undefined) {
        const duplicado = await db.client.findFirst({ where: { rut: data.rut, id: { not: id } } });
        if (duplicado || await rutEnUso(db, data.rut, id)) throw duplicadoRut();
        data = { ...data, rut: rutGuardado(data.rut) };
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
