import type { Segment } from "@yuvanext/contracts";

export type ApprovedCopy = {
  key: string;
  version: string;
  text: string;
};

export interface ApprovedCopyReader {
  getWelcomeCopy(input: { segment: Segment; language: "en" }): Promise<ApprovedCopy>;
  getCopy(input: { key: string; version: string; language: "en" }): Promise<ApprovedCopy>;
}
