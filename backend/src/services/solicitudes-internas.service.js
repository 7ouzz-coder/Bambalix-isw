const pageSize = 20;
export async function listPublicRequests(db, { page }) {
  const total = await db.publicEventRequest.count();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const items = await db.publicEventRequest.findMany({
    skip: (current - 1) * pageSize, take: pageSize,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, name: true, email: true, phone: true, requestedDate: true, service: true, message: true, createdAt: true },
  });
  return { items, total, pages, page: current };
}
