import { z } from "zod";
import { IsoTimestampSchema, SegmentSchema, StateSchema, UuidSchema } from "./common.js";

export const EducationStageSchema = z.enum([
  "school",
  "higher_secondary",
  "college",
  "graduate",
  "working",
  "other",
]);
export type EducationStage = z.infer<typeof EducationStageSchema>;

export const AgeBandSchema = z.enum(["minor_12_13", "minor_14_15", "minor_16_17", "adult_18", "adult_19_plus"]);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export const UserProfileSchema = z.object({
  userId: UuidSchema,
  firstName: z.string().trim().min(1).max(100),
  ageAtOnboarding: z.number().int().min(12).max(100),
  ageBand: AgeBandSchema,
  city: z.string().trim().min(1).max(160),
  state: StateSchema,
  countryCode: z.string().length(2),
  segment: SegmentSchema,
  selfStage: EducationStageSchema,
  wantsAid: z.boolean(),
  profileStatus: z.enum(["active", "deletion_pending", "deleted"]),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
  deletedAt: IsoTimestampSchema.nullable(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.");

export const UpsertUserProfileRequestSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    dateOfBirth: DateOnlySchema.optional(),
    ageAtOnboarding: z.number().int().min(0).max(120).optional(),
    city: z.string().trim().min(1).max(160),
    state: StateSchema,
    countryCode: z.string().trim().length(2).default("IN"),
    selfStage: EducationStageSchema,
    wantsAid: z.boolean().default(false),
  })
  .refine((input) => input.dateOfBirth || input.ageAtOnboarding !== undefined, {
    message: "Either dateOfBirth or ageAtOnboarding is required.",
    path: ["dateOfBirth"],
  });
export type UpsertUserProfileRequest = z.infer<typeof UpsertUserProfileRequestSchema>;

export const UserProfileResponseSchema = z.object({
  profile: UserProfileSchema,
});
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
