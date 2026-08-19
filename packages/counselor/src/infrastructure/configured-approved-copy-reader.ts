import type { Segment } from "@yuvanext/contracts";
import { CounselorContractError } from "../application/errors.js";
import type { ApprovedCopy, ApprovedCopyReader } from "../application/index.js";

export type SafetyApprovedCopyReader = {
  getCopy(input: {
    key: string;
    version: string;
    language: "en";
  }): Promise<ApprovedCopy | null>;
};

export type ConfiguredApprovedCopyReaderOptions = {
  welcomeBySegment: Record<Segment, string>;
  fallback: string;
  version: string;
  safety?: SafetyApprovedCopyReader;
};

export class ConfiguredApprovedCopyReader implements ApprovedCopyReader {
  constructor(private readonly options: ConfiguredApprovedCopyReaderOptions) {}

  getWelcomeCopy(input: { segment: Segment; language: "en" }): Promise<ApprovedCopy> {
    void input.language;
    return Promise.resolve({
      key: `welcome_${input.segment}`,
      version: this.options.version,
      text: this.options.welcomeBySegment[input.segment],
    });
  }

  async getCopy(input: { key: string; version: string; language: "en" }): Promise<ApprovedCopy> {
    if (
      input.key !== "counselor_unavailable" ||
      input.version !== this.options.version ||
      input.language !== "en"
    ) {
      const safetyCopy = await this.options.safety?.getCopy(input);
      if (!safetyCopy) {
        throw new CounselorContractError("Approved counselor copy was not found");
      }
      return safetyCopy;
    }
    return {
      key: input.key,
      version: input.version,
      text: this.options.fallback,
    };
  }
}
