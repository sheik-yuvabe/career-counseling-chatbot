import { z } from "zod";
import { UuidSchema } from "./common.js";

export const VerificationStatusSchema = z.enum([
  "unverified",
  "verified",
  "stale",
  "retired",
]);

export type VerificationStatus = z.infer<
  typeof VerificationStatusSchema
>;

export const CollegeSchema = z.object({
  id: UuidSchema,
  name: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(160),
  state: z.string().trim().min(1).max(160),
  institutionType: z.string().trim().min(1).max(100),
  websiteUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "College website URL must use HTTPS",
    })
    .nullable(),
  verificationStatus: VerificationStatusSchema,
  lastVerifiedAt: z.string().datetime().nullable(),
  datasetVersionId: UuidSchema,
});

export type College = z.infer<typeof CollegeSchema>;