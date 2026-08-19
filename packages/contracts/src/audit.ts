import { z } from "zod";
import { IsoTimestampSchema, UuidSchema } from "./common.js";

export const AuditActorTypeSchema = z.enum(["user", "staff", "service", "job"]);
export type AuditActorType = z.infer<typeof AuditActorTypeSchema>;

export const AuditActionSchema = z.enum([
  "staff.login",
  "staff.packet.view",
  "staff.queue.action",
  "privacy.export.request",
  "privacy.export.access",
  "privacy.delete.request",
  "evaluation.run.start",
  "evaluation.run.complete",
  "safety.handoff.create",
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditTargetTypeSchema = z.enum([
  "staff_session",
  "safety_event",
  "handoff",
  "handoff_action",
  "privacy_job",
  "evaluation_run",
  "evaluation_result",
  "user_profile",
]);
export type AuditTargetType = z.infer<typeof AuditTargetTypeSchema>;

const prohibitedAuditMetadataKeys = [
  "answer",
  "answers",
  "content",
  "conversation",
  "fullPhone",
  "message",
  "note",
  "otp",
  "password",
  "phone",
  "phoneNumber",
  "rawMessage",
  "secret",
  "text",
  "token",
  "totp",
] as const;

const auditMetadataValueSchema: z.ZodType<
  string | number | boolean | null | string[] | number[] | boolean[]
> = z.union([
  z.string().max(160),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.string().max(80)).max(20),
  z.array(z.number().finite()).max(20),
  z.array(z.boolean()).max(20),
]);

export const SafeAuditMetadataSchema = z
  .record(z.string().min(1).max(80), auditMetadataValueSchema)
  .refine(
    (metadata) =>
      Object.keys(metadata).every(
        (key) =>
          !prohibitedAuditMetadataKeys.some(
            (prohibitedKey) => key.toLowerCase() === prohibitedKey.toLowerCase(),
          ),
      ),
    { message: "Audit metadata contains a prohibited key" },
  );
export type SafeAuditMetadata = z.infer<typeof SafeAuditMetadataSchema>;

export const AuditEventSchema = z.object({
  id: UuidSchema,
  actorType: AuditActorTypeSchema,
  actorId: UuidSchema.nullable(),
  action: AuditActionSchema,
  targetType: AuditTargetTypeSchema,
  targetId: UuidSchema.nullable(),
  requestCorrelationId: UuidSchema,
  safeMetadata: SafeAuditMetadataSchema,
  ipHash: z.string().min(16).max(128).nullable(),
  occurredAt: IsoTimestampSchema,
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
