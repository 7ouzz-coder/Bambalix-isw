import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { internalUserSchema } from "../schemas/sesiones.schema.js";

const scrypt = promisify(derive);
export const sessionDuration = 8 * 60 * 60 * 1000;
export const hashToken = token => createHash("sha256").update(token).digest("hex");
export const publicUser = user => ({ id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions, authenticated: true });

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${hash.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  const [algorithm, salt, digest] = (stored || "").split("$");
  const valid = algorithm === "scrypt" && /^[a-f0-9]{32}$/.test(salt || "") && /^[a-f0-9]{128}$/.test(digest || "");
  const expected = Buffer.from(valid ? digest : "0".repeat(128), "hex");
  const actual = await scrypt(password, valid ? salt : "0".repeat(32), 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(actual, expected) && valid;
}
// Administración local: no existe registro público ni asignación de roles desde HTTP.
export async function createInternalUser(db, input) {
  const { password, ...data } = internalUserSchema.parse(input);
  return publicUser(await db.internalUser.create({ data: { ...data, passwordHash: await hashPassword(password) } }));
}
export async function login(db, data, previousToken) {
  const user = await db.internalUser.findUnique({ where: { email: data.email } });
  const valid = await verifyPassword(data.password, user?.passwordHash);
  if (!valid || !user?.active) return null;
  const token = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionDuration);
  await db.$transaction(async tx => {
    await tx.internalSession.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date() } }, ...(previousToken ? [{ tokenHash: hashToken(previousToken) }] : [])] } });
    await tx.internalSession.create({ data: { tokenHash: hashToken(token), csrfToken, userId: user.id, expiresAt } });
  });
  return { token, csrfToken, expiresAt, user: publicUser(user) };
}
export async function getSession(db, token) {
  if (!/^[a-f0-9]{64}$/.test(token || "")) return null;
  const session = await db.internalSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return { ...session, user: publicUser(session.user) };
}
export async function logout(db, token) {
  if (token) await db.internalSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}
