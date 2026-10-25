export function resourceError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function bloquearEquipo(tx, id) {
  // Mantenciones y asignaciones toman el mismo bloqueo antes de comprobar cruces.
  const rows = await tx.$queryRaw`SELECT id FROM "Resource" WHERE id = ${id} AND mode = 'UNIT' FOR UPDATE`;
  if (!rows.length) throw resourceError("Equipo no encontrado", 404);
  return tx.resource.findUnique({ where: { id } });
}

export function periodoOcupado(resourceId, startsAt, endsAt) {
  return { resourceId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } };
}

export async function motivosNoDisponible(tx, equipment, startsAt, endsAt) {
  const reasons = [];
  if (equipment.status !== "OPERATIONAL") reasons.push("El equipo no está operativo");
  const period = periodoOcupado(equipment.id, startsAt, endsAt);
  if (await tx.equipmentMaintenance.findFirst({ where: period, select: { id: true } }))
    reasons.push("El periodo cruza una mantención del equipo");
  if (await tx.equipmentAssignment.findFirst({ where: { ...period, releasedAt: null }, select: { id: true } }))
    reasons.push("El equipo ya está asignado durante ese periodo");
  return reasons;
}
