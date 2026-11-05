import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";
import { createApp } from "./app.js";

const server = createApp({ db: prisma, webOrigin: env.WEB_ORIGIN }).listen(env.PORT, env.HOST, () => {
  console.info(`Bambalix API escuchando en ${env.HOST}:${env.PORT}`);
});

async function shutdown() {
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
