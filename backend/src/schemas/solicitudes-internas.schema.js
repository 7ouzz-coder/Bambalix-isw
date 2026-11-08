import { z } from "zod";
export const requestListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).strict();
