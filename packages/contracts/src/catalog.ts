import { z } from "zod";
import {
  IsoTimestampSchema,
  StateSchema,
  UuidSchema,
} from "./common.js";

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
  state: StateSchema,
  institutionType: z.string().trim().min(1).max(100),
  websiteUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "College website URL must use HTTPS",
    })
    .nullable(),
  verificationStatus: VerificationStatusSchema,
  lastVerifiedAt: IsoTimestampSchema.nullable(),
  datasetVersionId: UuidSchema,
});

export type College = z.infer<typeof CollegeSchema>;

export const CollegeListQuerySchema = z.object({
  state: StateSchema,
  pathwayId: UuidSchema.optional(),
  discipline: z.string().trim().min(1).max(160).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CollegeListQuery = z.infer<typeof CollegeListQuerySchema>;

export const CollegeListResponseSchema = z.object({
  data: z.array(CollegeSchema),
  sourceDataVersions: z.record(z.string(), z.string()),
  retrievedAt: IsoTimestampSchema,
  caveats: z.array(z.string()),
});

export type CollegeListResponse = z.infer<
  typeof CollegeListResponseSchema
>;
