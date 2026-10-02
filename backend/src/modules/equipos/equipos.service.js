export function equipmentService(db) {
  return {
    listar() {
      return db.resource.findMany({
        where: { mode: "UNIT" }, take: 200,
        orderBy: [{ category: "asc" }, { name: "asc" }, { id: "asc" }],
      });
    },
    crear(data) {
      return db.resource.create({ data });
    },
  };
}
