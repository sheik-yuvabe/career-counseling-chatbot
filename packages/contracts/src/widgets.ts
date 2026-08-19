import { z } from "zod";
import { UuidSchema } from "./common.js";

export const WidgetTypeSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z][a-z0-9_]*$/);
export type WidgetType = z.infer<typeof WidgetTypeSchema>;

export const WidgetDirectiveSchema = z
  .object({
    widgetId: UuidSchema,
    widgetType: WidgetTypeSchema,
    schemaVersion: z.number().int().positive(),
    entityIds: z.array(UuidSchema),
    recommendationIds: z.array(UuidSchema),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();
export type WidgetDirective = z.infer<typeof WidgetDirectiveSchema>;
