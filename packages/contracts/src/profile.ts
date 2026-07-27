import { z } from "zod";
import { SegmentSchema, StateSchema, UuidSchema } from "./common.js";

export const UserProfileSchema = z.object({
  userId: UuidSchema,
  firstName: z.string().trim().min(1).max(100),
  ageAtOnboarding: z.number().int().min(10).max(100),
  city: z.string().trim().min(1).max(160),
  state: StateSchema,
  segment: SegmentSchema,
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
