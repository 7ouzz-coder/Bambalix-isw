import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { isIP } from "node:net";

const [command, ...args] = process.argv.slice(2);
const host = process.env.HOST?.trim();
const port = process.env.PORT;

if (!host || (!isIP(host) && !/^[a-zA-Z0-9.-]+$/.test(host))) {
  throw new Error("Revisa HOST en frontend/.env: usa una IP o un nombre de host, sin http ni puerto.");
}
if (!["dev", "start"].includes(command)) {
  throw new Error("Usa npm run dev o npm start.");
}

const require = createRequire(import.meta.url);
const server = spawn(process.execPath, [
  require.resolve("next/dist/bin/next"), command, ...args,
  "--hostname", host, "--port", port,
], { stdio: "inherit" });

server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
server.on("exit", (code, signal) => { process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1); });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
