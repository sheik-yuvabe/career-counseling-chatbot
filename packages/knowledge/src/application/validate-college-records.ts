import {
  CollegeDatasetRecordsSchema,
  CollegeSchema,
  type College,
  type CollegeDatasetRecords,
} from "@yuvanext/contracts";

export type CollegeValidationIssueCode =
  | "INVALID_RECORD"
  | "DUPLICATE_ID"
  | "DUPLICATE_CODE"
  | "DUPLICATE_PROGRAM"
  | "ORPHAN_REFERENCE"
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

export function validateCollegeDatasetRecords(
  input: unknown,
  expectedDatasetVersionId: string,
  knownPathwayIds: readonly string[] = [],
):
  | { success: true; data: CollegeDatasetRecords; issues: [] }
  | { success: false; issues: CollegeValidationIssue[] } {
  const parsed = CollegeDatasetRecordsSchema.safeParse(input);
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

  const collegeValidation = validateCollegeRecords(
    parsed.data.colleges,
    expectedDatasetVersionId,
  );
  const issues = collegeValidation.success
    ? []
    : [...collegeValidation.issues];
  const collegeIds = new Set(parsed.data.colleges.map(({ id }) => id));
  const disciplineIds = new Set<string>();
  const disciplineCodes = new Set<string>();
  const programKeys = new Set<string>();

  parsed.data.disciplines.forEach((discipline, index) => {
    if (disciplineIds.has(discipline.id)) {
      issues.push(duplicate(`disciplines.${index}.id`, discipline.id));
    }
    disciplineIds.add(discipline.id);
    if (disciplineCodes.has(discipline.disciplineCode)) {
      issues.push({
        code: "DUPLICATE_CODE",
        path: `disciplines.${index}.disciplineCode`,
        message: `Duplicate discipline code: ${discipline.disciplineCode}`,
      });
    }
    disciplineCodes.add(discipline.disciplineCode);
  });

  parsed.data.programs.forEach((program, index) => {
    if (!collegeIds.has(program.collegeId) || !disciplineIds.has(program.disciplineId)) {
      issues.push({
        code: "ORPHAN_REFERENCE",
        path: `programs.${index}`,
        message: "Program references an unknown college or discipline",
      });
    }
    if (program.datasetVersionId !== expectedDatasetVersionId) {
      issues.push({
        code: "DATASET_VERSION_MISMATCH",
        path: `programs.${index}.datasetVersionId`,
        message: "Program dataset version does not match the manifest",
      });
    }
    const key = `${program.collegeId}:${program.programName.toLowerCase()}:${program.qualificationLevel}`;
    if (programKeys.has(key)) {
      issues.push({
        code: "DUPLICATE_PROGRAM",
        path: `programs.${index}`,
        message: "Duplicate college program identity",
      });
    }
    programKeys.add(key);
  });

  parsed.data.pathwayDisciplines.forEach((mapping, index) => {
    const pathwayKnown =
      knownPathwayIds.length === 0 || knownPathwayIds.includes(mapping.pathwayId);
    if (!disciplineIds.has(mapping.disciplineId) || !pathwayKnown) {
      issues.push({
        code: "ORPHAN_REFERENCE",
        path: `pathwayDisciplines.${index}`,
        message: "Mapping references an unknown pathway or discipline",
      });
    }
  });

  return issues.length === 0
    ? { success: true, data: parsed.data, issues: [] }
    : { success: false, issues };
}

const duplicate = (path: string, value: string): CollegeValidationIssue => ({
  code: "DUPLICATE_ID",
  path,
  message: `Duplicate ID: ${value}`,
});
