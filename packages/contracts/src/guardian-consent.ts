import { z } from "zod";
import { IsoTimestampSchema, UuidSchema } from "./common.js";

export const GuardianConsentStatusSchema = z.enum([
  "pending",
  "granted",
  "declined",
  "expired",
  "revoked",
]);
export type GuardianConsentStatus = z.infer<typeof GuardianConsentStatusSchema>;

export const GuardianConsentSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  consentType: z.literal("guardian"),
  guardianPhoneLast4: z.string().length(4),
  status: GuardianConsentStatusSchema,
  textVersion: z.string().min(1).max(80),
  requestedAt: IsoTimestampSchema,
  verifiedAt: IsoTimestampSchema.nullable(),
  declinedAt: IsoTimestampSchema.nullable(),
  expiredAt: IsoTimestampSchema.nullable(),
  revokedAt: IsoTimestampSchema.nullable(),
  createdAt: IsoTimestampSchema,
});
export type GuardianConsent = z.infer<typeof GuardianConsentSchema>;

export const RequestGuardianConsentRequestSchema = z.object({
  guardianPhone: z.string().trim().min(8).max(32),
  studentPhone: z.string().trim().min(8).max(32),
  textVersion: z.string().trim().min(1).max(80),
});
export type RequestGuardianConsentRequest = z.infer<
  typeof RequestGuardianConsentRequestSchema
>;

export const VerifyGuardianConsentRequestSchema = z.object({
  consentId: UuidSchema,
  verificationCode: z.string().regex(/^\d{6}$/),
});
export type VerifyGuardianConsentRequest = z.infer<
  typeof VerifyGuardianConsentRequestSchema
>;

export const GuardianConsentResponseSchema = z.object({
  consent: GuardianConsentSchema,
});
export type GuardianConsentResponse = z.infer<typeof GuardianConsentResponseSchema>;

export const GuardianConsentStatusResponseSchema = z.object({
  consentRequired: z.boolean(),
  consent: GuardianConsentSchema.nullable(),
});
export type GuardianConsentStatusResponse = z.infer<
  typeof GuardianConsentStatusResponseSchema
>;
