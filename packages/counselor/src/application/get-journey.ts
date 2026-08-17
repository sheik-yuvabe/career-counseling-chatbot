import { JourneyResponseSchema, UuidSchema, type JourneyResponse } from "@yuvanext/contracts";
import { CounselorNotFoundError } from "./errors.js";
import type { CounselorRepository } from "./ports/index.js";

export type GetJourneyCommand = {
  userId: string;
};

export class GetJourneyService {
  constructor(private readonly repository: CounselorRepository) {}

  async execute(command: GetJourneyCommand): Promise<JourneyResponse> {
    const userId = UuidSchema.parse(command.userId);
    const journey = await this.repository.getJourneyState(userId);
    if (!journey) {
      throw new CounselorNotFoundError("Journey state was not found");
    }
    return JourneyResponseSchema.parse({ journey });
  }
}
