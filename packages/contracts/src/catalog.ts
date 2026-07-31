import { z } from "zod";
import {
  IsoTimestampSchema,
  SegmentSchema,
  StateSchema,
  UuidSchema,
} from "./common.js";

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

export const CareerDatasetRecordsSchema = z.object({
  careers: z.array(CareerSchema),
  interestProfiles: z.array(CareerInterestProfileSchema),
  profiles: z.array(CareerProfileSchema),
});

export type CareerDatasetRecords = z.infer<
  typeof CareerDatasetRecordsSchema
>;

export const CareerDatasetManifestSchema = z.object({
  schemaVersion: z.literal(1),
  datasetKey: z.string().trim().min(1).max(160),
  version: z.string().trim().min(1).max(80),
  datasetVersionId: UuidSchema,
  recordsFile: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/),
  recordCounts: z.object({
    careers: z.number().int().nonnegative(),
    interestProfiles: z.number().int().nonnegative(),
    profiles: z.number().int().nonnegative(),
  }),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewStatus: z.literal("approved"),
  createdAt: IsoTimestampSchema,
  source: KnowledgeSourceManifestSchema,
});

export type CareerDatasetManifest = z.infer<
  typeof CareerDatasetManifestSchema
>;

export const RiasecTopTwoSchema = z
  .string()
  .regex(/^[RIASEC]{2}$/)
  .refine((value) => value[0] !== value[1], {
    message: "RIASEC top-two code must contain two different letters",
  });

export const EducationRouteSchema = z.object({
  id: UuidSchema,
  routeCode: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  routeLevel: z.enum([
    "school_stream",
    "certificate",
    "iti",
    "diploma",
    "degree",
    "postgraduate",
    "open",
  ]),
  description: z.string().trim().min(1).max(600).nullable(),
  publicationStatus: z.enum(["draft", "published", "retired"]),
});

export type EducationRoute = z.infer<typeof EducationRouteSchema>;

export const PathwaySchema = z.object({
  id: UuidSchema,
  pathwayCode: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(600).nullable(),
  educationRouteId: UuidSchema,
  durationBand: z.string().trim().min(1).max(120).nullable(),
  backupRouteNote: z.string().trim().min(1).max(600).nullable(),
  publicationStatus: z.enum(["draft", "published", "retired"]),
  datasetVersionId: UuidSchema,
});

export type Pathway = z.infer<typeof PathwaySchema>;

export const StreamOptionSchema = z.object({
  id: UuidSchema,
  streamCode: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(600),
  status: z.enum(["active", "inactive", "retired"]),
});

export type StreamOption = z.infer<typeof StreamOptionSchema>;

export const StreamMapSchema = z.object({
  id: UuidSchema,
  topTwoCode: RiasecTopTwoSchema,
  segment: SegmentSchema,
  version: z.string().trim().min(1).max(80),
  datasetVersionId: UuidSchema,
  status: z.enum(["draft", "published", "retired"]),
});

export type StreamMap = z.infer<typeof StreamMapSchema>;

export const StreamMapItemSchema = z.object({
  mapId: UuidSchema,
  streamOptionId: UuidSchema,
  rank: z.number().int().positive(),
  reasonKey: z.string().trim().min(1).max(160),
});

export type StreamMapItem = z.infer<typeof StreamMapItemSchema>;

export const StreamListQuerySchema = z.object({
  topTwo: RiasecTopTwoSchema,
  segment: SegmentSchema,
});

export type StreamListQuery = z.infer<typeof StreamListQuerySchema>;

export const StreamResultItemSchema = z.object({
  streamCode: z.string(),
  title: z.string(),
  description: z.string(),
  rank: z.number().int().positive(),
  reasonKey: z.string(),
});

export type StreamResultItem = z.infer<
  typeof StreamResultItemSchema
>;

export const StreamListResponseSchema = z.object({
  data: z.array(StreamResultItemSchema),
  sourceDataVersions: z.record(z.string(), z.string()),
  retrievedAt: IsoTimestampSchema,
  caveats: z.array(z.string()),
});

export type StreamListResponse = z.infer<
  typeof StreamListResponseSchema
>;

export const StreamDatasetRecordsSchema = z.object({
  educationRoutes: z.array(EducationRouteSchema),
  pathways: z.array(PathwaySchema),
  streamOptions: z.array(StreamOptionSchema),
  streamMaps: z.array(StreamMapSchema),
  streamMapItems: z.array(StreamMapItemSchema),
});

export type StreamDatasetRecords = z.infer<
  typeof StreamDatasetRecordsSchema
>;

export const StreamDatasetManifestSchema = z.object({
  schemaVersion: z.literal(1),
  datasetKey: z.string().trim().min(1).max(160),
  version: z.string().trim().min(1).max(80),
  datasetVersionId: UuidSchema,
  recordsFile: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/),
  recordCounts: z.object({
    educationRoutes: z.number().int().nonnegative(),
    pathways: z.number().int().nonnegative(),
    streamOptions: z.number().int().nonnegative(),
    streamMaps: z.number().int().nonnegative(),
    streamMapItems: z.number().int().nonnegative(),
  }),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewStatus: z.literal("approved"),
  createdAt: IsoTimestampSchema,
  source: KnowledgeSourceManifestSchema,
});

export type StreamDatasetManifest = z.infer<
  typeof StreamDatasetManifestSchema
>;

export const DisciplineSchema = z.object({
  id: UuidSchema,
  disciplineCode: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  domainCode: z.string().trim().min(1).max(80),
  status: z.enum(["active", "inactive", "retired"]),
});

export type Discipline = z.infer<typeof DisciplineSchema>;

export const QualificationLevelSchema = z.enum([
  "certificate",
  "iti",
  "diploma",
  "ug",
  "pg",
  "open",
]);

export const CollegeProgramSchema = z
  .object({
    id: UuidSchema,
    collegeId: UuidSchema,
    disciplineId: UuidSchema,
    programName: z.string().trim().min(1).max(240),
    qualificationLevel: QualificationLevelSchema,
    durationBand: z.string().trim().min(1).max(120).nullable(),
    admissionRoute: z.string().trim().min(1).max(300).nullable(),
    feesBand: z.string().trim().min(1).max(160).nullable(),
    verificationStatus: VerificationStatusSchema,
    lastVerifiedAt: IsoTimestampSchema.nullable(),
    datasetVersionId: UuidSchema,
  })
  .superRefine((program, context) => {
    if (
      program.verificationStatus === "verified" &&
      program.lastVerifiedAt === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["lastVerifiedAt"],
        message: "Verified programs require a verification date",
      });
    }
  });

export type CollegeProgram = z.infer<typeof CollegeProgramSchema>;

export const PathwayDisciplineSchema = z.object({
  pathwayId: UuidSchema,
  disciplineId: UuidSchema,
  relevanceWeight: z.number().min(0).max(1),
  mappingVersion: z.string().trim().min(1).max(80),
});

export type PathwayDiscipline = z.infer<
  typeof PathwayDisciplineSchema
>;
