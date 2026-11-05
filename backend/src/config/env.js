import "dotenv/config";
import { z } from "zod";

const settings = z.object({
  DATABASE_URL: z.string().min(1),
  HOST: z.string().trim().min(1),
  WEB_ORIGIN: z.url(),
}).safeParse(process.env);

if (!settings.success) {
  throw new Error(`Revisa las variables de entorno: ${settings.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

export const env = { ...settings.data, PORT: Number(process.env.PORT) };
