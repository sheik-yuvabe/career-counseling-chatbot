import { z } from "zod";
import { ModuleDescriptorSchema } from "./common.js";

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  retry: z
    .object({ allowed: z.boolean(), afterSeconds: z.number().int().positive().optional() })
    .optional(),
});

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("yuvanext-api"),
  timestamp: z.string().datetime(),
  modules: z.array(ModuleDescriptorSchema),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
