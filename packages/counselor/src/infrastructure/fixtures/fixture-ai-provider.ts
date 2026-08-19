import type { AiProvider, AiProviderRequest, AiProviderResult } from "../../application/index.js";

export class FixtureAiProvider implements AiProvider {
  private readonly results: AiProviderResult[];
  private callIndex = 0;

  constructor(result: AiProviderResult | AiProviderResult[]) {
    this.results = Array.isArray(result) ? result : [result];
    if (this.results.length === 0) {
      throw new Error("At least one AI provider fixture result is required");
    }
  }

  generateDraft(input: AiProviderRequest): Promise<AiProviderResult> {
    void input;
    const result = this.results[Math.min(this.callIndex, this.results.length - 1)];
    this.callIndex += 1;
    if (!result) {
      return Promise.reject(new Error("AI provider fixture result is missing"));
    }
    return Promise.resolve(result);
  }
}
