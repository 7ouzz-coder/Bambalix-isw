export async function registerPublicRequest(db, data) {
 await db.publicEventRequest.create({ data });
 return { message: "Recibimos tu solicitud. La productora revisará la fecha y los servicios. Esto no confirma una reserva." };
}
