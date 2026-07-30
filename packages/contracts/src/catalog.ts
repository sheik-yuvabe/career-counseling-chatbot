import { z } from "zod";
import { IsoTimestampSchema, StateSchema, UuidSchema } from "./common.js";

export const VerificationStatusSchema = z.enum(["unverified", "verified", "stale", "retired"]);

export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

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

export type CollegeListResponse = z.infer<typeof CollegeListResponseSchema>;

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

export type KnowledgeSourceManifest = z.infer<typeof KnowledgeSourceManifestSchema>;

export const CollegeDatasetManifestSchema = z.object({
  schemaVersion: z.literal(1),
  datasetKey: z.string().trim().min(1).max(160),
  version: z.string().trim().min(1).max(80),
  datasetVersionId: UuidSchema,
  recordsFile: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/),
  recordCount: z.number().int().nonnegative(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewStatus: z.literal("approved"),
  createdAt: IsoTimestampSchema,
  source: KnowledgeSourceManifestSchema,
});

export type CollegeDatasetManifest = z.infer<typeof CollegeDatasetManifestSchema>;

export const RiasecLetterSchema = z.enum(["R", "I", "A", "S", "E", "C"]);

export const CareerPublicationStatusSchema = z.enum(["draft", "review", "published", "retired"]);

export const CareerSchema = z
  .object({
    id: UuidSchema,
    onetCode: z.string().trim().min(1).max(40).nullable(),
    ncoCode: z.string().trim().min(1).max(40).nullable(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(200),
    shortDescription: z.string().trim().min(1).max(600).nullable(),
    domainCode: z.string().trim().min(1).max(80),
    primaryEducationRouteId: UuidSchema.nullable(),
    isCurated: z.boolean(),
    publicationStatus: CareerPublicationStatusSchema,
    datasetVersionId: UuidSchema,
    publishedAt: IsoTimestampSchema.nullable(),
    retiredAt: IsoTimestampSchema.nullable(),
  })
  .superRefine((career, context) => {
    if (career.publicationStatus === "published" && career.publishedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Published careers require a publication date",
      });
    }

    if (career.publicationStatus === "retired" && career.retiredAt === null) {
      context.addIssue({
        code: "custom",
        path: ["retiredAt"],
        message: "Retired careers require a retirement date",
      });
    }
  });

export type Career = z.infer<typeof CareerSchema>;

const RiasecScoreSchema = z.number().min(0).max(1);

export const CareerInterestProfileSchema = z.object({
  careerId: UuidSchema,
  realistic: RiasecScoreSchema,
  investigative: RiasecScoreSchema,
  artistic: RiasecScoreSchema,
  social: RiasecScoreSchema,
  enterprising: RiasecScoreSchema,
  conventional: RiasecScoreSchema,
  highPointCode: RiasecLetterSchema,
  profileVersion: z.string().trim().min(1).max(80),
  datasetVersionId: UuidSchema,
});

export type CareerInterestProfile = z.infer<typeof CareerInterestProfileSchema>;

export const CareerProfileReviewStatusSchema = z.enum(["draft", "reviewed", "retired"]);

export const CareerProfileSchema = z
  .object({
    careerId: UuidSchema,
    imageRef: z.string().trim().min(1).max(500).nullable(),
    salaryEntryBand: z.string().trim().min(1).max(200).nullable(),
    salaryNote: z.string().trim().min(1).max(600).nullable(),
    skills: z.array(z.string().trim().min(1).max(100)).max(20),
    nextRole3yr: z.string().trim().min(1).max(200).nullable(),
    progressionNote: z.string().trim().min(1).max(600).nullable(),
    reviewStatus: CareerProfileReviewStatusSchema,
    lastReviewedAt: IsoTimestampSchema.nullable(),
    reviewedBy: UuidSchema.nullable(),
  })
  .superRefine((profile, context) => {
    if (profile.reviewStatus === "reviewed" && profile.lastReviewedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["lastReviewedAt"],
        message: "Reviewed career profiles require a review date",
      });
    }

    if (profile.salaryEntryBand !== null && profile.salaryNote === null) {
      context.addIssue({
        code: "custom",
        path: ["salaryNote"],
        message: "Salary bands require an approved honesty note",
      });
    }
  });

export type CareerProfile = z.infer<typeof CareerProfileSchema>;

export const CareerDetailsSchema = z.object({
  career: CareerSchema,
  interestProfile: CareerInterestProfileSchema.nullable(),
  profile: CareerProfileSchema.nullable(),
});

export type CareerDetails = z.infer<typeof CareerDetailsSchema>;

export const CareerToolResultSchema = z.object({
  data: CareerDetailsSchema,
  sourceDataVersions: z.record(z.string(), z.string()),
  retrievedAt: IsoTimestampSchema,
  caveats: z.array(z.string()),
});

export type CareerToolResult = z.infer<typeof CareerToolResultSchema>;

export const CareerSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export type CareerSlugParams = z.infer<typeof CareerSlugParamsSchema>;

export const CareerSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  domain: z.string().trim().min(1).max(80).optional(),
  cursor: z.string().trim().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CareerSearchQuery = z.infer<typeof CareerSearchQuerySchema>;

export const CareerSearchItemSchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string().nullable(),
  domainCode: z.string(),
  detailAvailability: z.enum(["rich", "restricted"]),
  datasetVersionId: UuidSchema,
});

export type CareerSearchItem = z.infer<typeof CareerSearchItemSchema>;

export const CareerSearchResponseSchema = z.object({
  data: z.array(CareerSearchItemSchema),
  nextCursor: z.string().nullable(),
  sourceDataVersions: z.record(z.string(), z.string()),
  retrievedAt: IsoTimestampSchema,
  caveats: z.array(z.string()),
});

export type CareerSearchResponse = z.infer<typeof CareerSearchResponseSchema>;
