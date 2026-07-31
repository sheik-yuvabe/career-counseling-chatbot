import { z } from "zod";
import { IsoTimestampSchema, UuidSchema } from "./common.js";

export const JourneySessionStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "expired",
  "abandoned",
]);
export type JourneySessionStatus = z.infer<typeof JourneySessionStatusSchema>;

export const JourneySessionChannelSchema = z.literal("web");
export type JourneySessionChannel = z.infer<typeof JourneySessionChannelSchema>;

export const JourneySessionSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  anonymousSessionId: UuidSchema.nullable(),
  channel: JourneySessionChannelSchema,
  status: JourneySessionStatusSchema,
  startedAt: IsoTimestampSchema,
  lastSeenAt: IsoTimestampSchema,
  expiresAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema.nullable(),
});
export type JourneySession = z.infer<typeof JourneySessionSchema>;

export const CreateJourneySessionRequestSchema = z.object({
  anonymousSessionId: UuidSchema.optional(),
});
export type CreateJourneySessionRequest = z.infer<typeof CreateJourneySessionRequestSchema>;

export const JourneySessionResponseSchema = z.object({
  session: JourneySessionSchema,
});
export type JourneySessionResponse = z.infer<typeof JourneySessionResponseSchema>;
