export function clientService(db) {
  return {
    listar() {
      return db.client.findMany({ orderBy: { name: "asc" } });
    },
    crear(data) {
      return db.client.create({ data });
    },
  };
}
