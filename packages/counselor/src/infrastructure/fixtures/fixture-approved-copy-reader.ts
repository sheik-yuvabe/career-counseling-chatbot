import type { Segment } from "@yuvanext/contracts";
import type { ApprovedCopy, ApprovedCopyReader } from "../../application/index.js";

export type ApprovedWelcomeCopyFixture = ApprovedCopy & {
  segment: Segment;
  language: "en";
};

export class FixtureApprovedCopyReader implements ApprovedCopyReader {
  constructor(private readonly copies: ApprovedWelcomeCopyFixture[]) {}

  getWelcomeCopy(input: { segment: Segment; language: "en" }): Promise<ApprovedCopy> {
    const copy = this.copies.find(
      (candidate) => candidate.segment === input.segment && candidate.language === input.language,
    );
    if (!copy) {
      return Promise.reject(new Error("Approved welcome copy fixture was not found"));
    }

    return Promise.resolve({
      key: copy.key,
      version: copy.version,
      text: copy.text,
    });
  }

  getCopy(input: { key: string; version: string; language: "en" }): Promise<ApprovedCopy> {
    const copy = this.copies.find(
      (candidate) =>
        candidate.key === input.key &&
        candidate.version === input.version &&
        candidate.language === input.language,
    );
    if (!copy) {
      return Promise.reject(new Error("Approved copy fixture was not found"));
    }

    return Promise.resolve({
      key: copy.key,
      version: copy.version,
      text: copy.text,
    });
  }
}
