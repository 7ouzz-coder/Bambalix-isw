import { z } from "zod";

const optionalText = max => z.string().trim().max(max).optional().transform(value => value || null);

export const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(254).email(),
  rut: optionalText(20),
  phone: optionalText(40),
  address: optionalText(240),
}).strict();
