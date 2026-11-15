export async function registerPublicRequest(db, data, idempotencyKey) {
 try {
  await db.publicEventRequest.create({ data: { ...data, ...(idempotencyKey ? { idempotencyKey } : {}) } });
 } catch (error) {
  if (!idempotencyKey || error.code !== "P2002") throw error;
  const existing = await db.publicEventRequest.findUnique({
   where: { idempotencyKey },
   select: { name: true, email: true, phone: true, requestedDate: true, service: true, message: true },
  });
  if (!existing) throw error;
  const sameRequest = existing.name === data.name && existing.email === data.email &&
   (existing.phone || "") === (data.phone || "") && existing.requestedDate === data.requestedDate &&
   existing.service === data.service && existing.message === data.message;
  if (!sameRequest) {
   const conflict = new Error("La solicitud cambió. Actualiza la página antes de volver a enviarla.");
   conflict.statusCode = 409;
   throw conflict;
  }
 }
 return { message: "Recibimos tu solicitud. La productora revisará la fecha y los servicios. Esto no confirma una reserva." };
}
