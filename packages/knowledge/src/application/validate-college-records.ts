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
  if (!Array.isArray(input)) {
    return {
      success: false,
      issues: [{
        code: "INVALID_RECORD",
        path: "records",
        message: "College records must be an array",
      }],
    };
  }

  const issues: CollegeValidationIssue[] = [];
  const records: Array<{ college: College; index: number }> = [];

  input.forEach((record, index) => {
    const parsedRecord = CollegeSchema.safeParse(record);

    if (!parsedRecord.success) {
      issues.push(
        ...parsedRecord.error.issues.map((issue) => ({
          code: "INVALID_RECORD" as const,
          path: [index, ...issue.path].join("."),
          message: issue.message,
        })),
      );
      return;
    }

    records.push({ college: parsedRecord.data, index });
  });

  const seenIds = new Set<string>();

  records.forEach(({ college, index }) => {
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
    ? {
        success: true,
        data: records.map(({ college }) => college),
        issues: [],
      }
    : { success: false, issues };
}
