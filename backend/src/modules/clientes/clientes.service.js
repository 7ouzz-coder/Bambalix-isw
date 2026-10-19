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
          throw error;
        }
      }
      return db.client.create({ data });
    },

    async actualizar(id, data) {
      if (!id || typeof id !== "string") return null;

      const clienteExistente = await db.client.findUnique({ where: { id } });
      if (!clienteExistente) {
        return null; // Asegura que nunca cree un cliente nuevo por accidente
      }

      // Validar unicidad del RUT sin colisionar consigo mismo
      if (data.rut && data.rut !== clienteExistente.rut) {
        const duplicado = await db.client.findFirst({
          where: {
            rut: data.rut,
            id: { not: id },
          },
        });
        if (duplicado) {
          const error = new Error("Ya existe un cliente con ese RUT");
          error.code = "P2002";
          throw error;
        }
      }

      // Validar regla de empresa con encargado de contacto si se actualiza a empresa o ya lo era
      const tipoFinal = data.clientType || clienteExistente.clientType;
      const encargadoFinal = data.contactName !== undefined ? data.contactName : clienteExistente.contactName;
      if (tipoFinal === "empresa" && (!encargadoFinal || encargadoFinal.trim().length < 2)) {
        const error = new Error("Para clientes tipo empresa se requiere el nombre del encargado de contacto");
        error.code = "VALIDATION_ERROR";
        throw error;
      }

      // Limpiar campos que no deben modificarse
      const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...camposValidos } = data;

      return db.client.update({
        where: { id },
        data: camposValidos,
      });
    },
  };
}
