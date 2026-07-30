import {
  CollegeSchema,
  type College,
} from "@yuvanext/contracts";

export type CollegeValidationIssueCode =
  | "INVALID_RECORD"
  | "DUPLICATE_ID"
  | "DATASET_VERSION_MISMATCH"
  | "VERIFIED_DATE_MISSING";

export type CollegeValidationIssue = {
  code: CollegeValidationIssueCode;
  path: string;
  message: string;
};

export type CollegeValidationResult =
  | { success: true; data: College[]; issues: [] }
  | { success: false; issues: CollegeValidationIssue[] };

export function validateCollegeRecords(
  input: unknown,
  expectedDatasetVersionId: string,
): CollegeValidationResult {
  const parsed = CollegeSchema.array().safeParse(input);

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

  const issues: CollegeValidationIssue[] = [];
  const seenIds = new Set<string>();

  parsed.data.forEach((college, index) => {
    if (seenIds.has(college.id)) {
      issues.push({
        code: "DUPLICATE_ID",
        path: `${index}.id`,
        message: `Duplicate college ID: ${college.id}`,
      });
    }
    seenIds.add(college.id);

    if (college.datasetVersionId !== expectedDatasetVersionId) {
      issues.push({
        code: "DATASET_VERSION_MISMATCH",
        path: `${index}.datasetVersionId`,
        message: "College dataset version does not match the manifest",
      });
    }

    if (
      college.verificationStatus === "verified" &&
      college.lastVerifiedAt === null
    ) {
      issues.push({
        code: "VERIFIED_DATE_MISSING",
        path: `${index}.lastVerifiedAt`,
        message: "Verified colleges require a verification date",
      });
    }
  });

  return issues.length === 0
    ? { success: true, data: parsed.data, issues: [] }
    : { success: false, issues };
}
