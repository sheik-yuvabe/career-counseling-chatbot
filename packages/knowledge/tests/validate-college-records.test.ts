import {
  badUrlCollegeFixture,
  duplicateCollegeFixtures,
  mismatchedVersionCollegeFixture,
  missingVerificationDateCollegeFixture,
} from "../../test-fixtures/src/index.js";
import { describe, expect, it } from "vitest";
import { validateCollegeRecords } from "../src/index.js";

const expectedDatasetVersionId =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("validateCollegeRecords", () => {
  it("rejects non-HTTPS college URLs", () => {
    const result = validateCollegeRecords(
      [badUrlCollegeFixture],
      expectedDatasetVersionId,
    );

    expect(result.success).toBe(false);
    expect(result.issues[0]?.code).toBe("INVALID_RECORD");
  });

  it("rejects duplicate stable IDs", () => {
    const result = validateCollegeRecords(
      duplicateCollegeFixtures,
      expectedDatasetVersionId,
    );

    expect(result.success).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "DUPLICATE_ID",
    );
  });

  it("rejects records from a different dataset version", () => {
    const result = validateCollegeRecords(
      [mismatchedVersionCollegeFixture],
      expectedDatasetVersionId,
    );

    expect(result.success).toBe(false);
    expect(result.issues[0]?.code).toBe(
      "DATASET_VERSION_MISMATCH",
    );
  });

  it("requires a freshness date for verified colleges", () => {
    const result = validateCollegeRecords(
      [missingVerificationDateCollegeFixture],
      expectedDatasetVersionId,
    );

    expect(result.success).toBe(false);
    expect(result.issues[0]?.code).toBe(
      "VERIFIED_DATE_MISSING",
    );
  });
});
