import {
  CareerDatasetRecordsSchema,
  type CareerDatasetRecords,
} from "@yuvanext/contracts";

export type CareerValidationIssue = {
  code:
    | "INVALID_RECORD"
    | "DUPLICATE_CAREER_ID"
    | "DUPLICATE_CAREER_SLUG"
    | "DUPLICATE_INTEREST_PROFILE"
    | "DUPLICATE_CAREER_PROFILE"
    | "DATASET_VERSION_MISMATCH"
    | "ORPHAN_INTEREST_PROFILE"
    | "ORPHAN_CAREER_PROFILE"
    | "MISSING_INTEREST_PROFILE"
    | "UNREVIEWED_CAREER_PROFILE";
  path: string;
  message: string;
};

export type CareerValidationResult =
  | {
      success: true;
      data: CareerDatasetRecords;
      issues: [];
    }
  | { success: false; issues: CareerValidationIssue[] };

export function validateCareerRecords(
  input: unknown,
  expectedDatasetVersionId: string,
): CareerValidationResult {
  const parsed = CareerDatasetRecordsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "INVALID_RECORD",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const issues: CareerValidationIssue[] = [];
  const careerIds = new Set<string>();
  const careerSlugs = new Set<string>();
  const interestCareerIds = new Set<string>();
  const profileCareerIds = new Set<string>();

  parsed.data.careers.forEach((career, index) => {
    if (careerIds.has(career.id)) {
      issues.push({
        code: "DUPLICATE_CAREER_ID",
        path: `careers.${index}.id`,
        message: `Duplicate career ID: ${career.id}`,
      });
    }
    careerIds.add(career.id);

    if (careerSlugs.has(career.slug)) {
      issues.push({
        code: "DUPLICATE_CAREER_SLUG",
        path: `careers.${index}.slug`,
        message: `Duplicate career slug: ${career.slug}`,
      });
    }
    careerSlugs.add(career.slug);

    if (career.datasetVersionId !== expectedDatasetVersionId) {
      issues.push({
        code: "DATASET_VERSION_MISMATCH",
        path: `careers.${index}.datasetVersionId`,
        message: "Career dataset version does not match the manifest",
      });
    }
  });

  parsed.data.interestProfiles.forEach((profile, index) => {
    if (interestCareerIds.has(profile.careerId)) {
      issues.push({
        code: "DUPLICATE_INTEREST_PROFILE",
        path: `interestProfiles.${index}.careerId`,
        message: "Career has more than one interest profile",
      });
    }
    interestCareerIds.add(profile.careerId);

    if (!careerIds.has(profile.careerId)) {
      issues.push({
        code: "ORPHAN_INTEREST_PROFILE",
        path: `interestProfiles.${index}.careerId`,
        message: "Interest profile references an unknown career",
      });
    }

    if (profile.datasetVersionId !== expectedDatasetVersionId) {
      issues.push({
        code: "DATASET_VERSION_MISMATCH",
        path: `interestProfiles.${index}.datasetVersionId`,
        message:
          "Interest-profile dataset version does not match the manifest",
      });
    }
  });

  parsed.data.profiles.forEach((profile, index) => {
    if (profileCareerIds.has(profile.careerId)) {
      issues.push({
        code: "DUPLICATE_CAREER_PROFILE",
        path: `profiles.${index}.careerId`,
        message: "Career has more than one rich profile",
      });
    }
    profileCareerIds.add(profile.careerId);

    if (!careerIds.has(profile.careerId)) {
      issues.push({
        code: "ORPHAN_CAREER_PROFILE",
        path: `profiles.${index}.careerId`,
        message: "Rich profile references an unknown career",
      });
    }

    if (profile.reviewStatus !== "reviewed") {
      issues.push({
        code: "UNREVIEWED_CAREER_PROFILE",
        path: `profiles.${index}.reviewStatus`,
        message: "Only reviewed rich profiles may be published",
      });
    }
  });

  parsed.data.careers.forEach((career, index) => {
    if (
      career.publicationStatus === "published" &&
      !interestCareerIds.has(career.id)
    ) {
      issues.push({
        code: "MISSING_INTEREST_PROFILE",
        path: `careers.${index}.id`,
        message: "Published careers require a RIASEC interest profile",
      });
    }
  });

  return issues.length === 0
    ? { success: true, data: parsed.data, issues: [] }
    : { success: false, issues };
}
