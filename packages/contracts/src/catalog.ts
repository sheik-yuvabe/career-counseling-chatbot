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

export const KnowledgeSourceManifestSchema = z.object({
  id: UuidSchema,
  sourceKey: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(200),
  sourceType: z.string().trim().min(1).max(80),
  publisher: z.string().trim().min(1).max(200),
  trustLevel: z.string().trim().min(1).max(80),
  status: z.enum(["active", "inactive"]),
  baseUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "Knowledge source URL must use HTTPS",
    })
    .nullable(),
  licenseRef: z.string().trim().min(1).max(500),
});

export type KnowledgeSourceManifest = z.infer<
  typeof KnowledgeSourceManifestSchema
>;

export const CollegeDatasetManifestSchema = z.object({
  schemaVersion: z.literal(1),
  datasetKey: z.string().trim().min(1).max(160),
  version: z.string().trim().min(1).max(80),
  datasetVersionId: UuidSchema,
  recordsFile: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/),
  recordCount: z.number().int().nonnegative(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewStatus: z.literal("approved"),
  createdAt: IsoTimestampSchema,
  source: KnowledgeSourceManifestSchema,
});

export type CollegeDatasetManifest = z.infer<
  typeof CollegeDatasetManifestSchema
>;
