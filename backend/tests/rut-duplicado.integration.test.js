import { describe, it, expect } from "vitest";
import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { clientService } from "../src/services/clientes.service.js";

const url = process.env.TEST_DATABASE_URL;
const enabled = Boolean(url && new URL(url).hostname === "127.0.0.1" && new URL(url).pathname.endsWith("_test"));
function rutPrueba() {
  const body = String(randomInt(20000000, 89999999));
  let factor = 2, sum = 0;
  for (const digit of [...body].reverse()) { sum += Number(digit) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const result = 11 - sum % 11;
  return body + (result === 11 ? "0" : result === 10 ? "K" : result);
}
describe.skipIf(!enabled)("Unicidad de RUT", () => {
  it("detecta registros históricos con puntos y concurrencia con formatos distintos", async () => {
    const db = new PrismaClient({ datasources: { db: { url } } });
    const rut = rutPrueba();
    const historic = `${rut.slice(0, 2)}.${rut.slice(2, 5)}.${rut.slice(5, 8)}-${rut.slice(8)}`;
    const compact = `${rut.slice(0, -1)}-${rut.slice(-1)}`;
    const data = { name: "Cliente prueba", email: "rut@example.test", phone: "912345678" };
    let historicId;
    let createdId;
    try {
      expect(await db.client.count({ where: { rut: { in: [historic, compact] } } })).toBe(0);
      historicId = (await db.client.create({ data: { ...data, rut: historic } })).id;
      await expect(clientService(db).crear({ ...data, rut: compact })).rejects.toMatchObject({ statusCode: 409 });
      await db.client.delete({ where: { id: historicId } });
      historicId = undefined;
      const results = await Promise.allSettled([
        clientService(db).crear({ ...data, rut: historic }),
        clientService(db).crear({ ...data, rut: compact }),
      ]);
      createdId = results.find(result => result.status === "fulfilled")?.value.id;
      expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    } finally {
      await db.client.deleteMany({ where: { id: { in: [historicId, createdId].filter(Boolean) } } });
      await db.$disconnect();
    }
  });
});
