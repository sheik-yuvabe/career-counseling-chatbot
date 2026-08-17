import {
  RecommendationSetResponseSchema,
  UuidSchema,
  type RecommendationSetResponse,
} from "@yuvanext/contracts";
import type { RecommendationSetReader } from "./recommendation-set-reader.js";

export class RecommendationSetNotFoundError extends Error {
  constructor() {
    super("Recommendation set was not found");
    this.name = "RecommendationSetNotFoundError";
  }
}

export type GetRecommendationSetCommand = {
  userId: string;
  recommendationId: string;
};

export class GetRecommendationSetService {
  constructor(private readonly recommendations: RecommendationSetReader) {}

  async execute(command: GetRecommendationSetCommand): Promise<RecommendationSetResponse> {
    const input = {
      userId: UuidSchema.parse(command.userId),
      recommendationId: UuidSchema.parse(command.recommendationId),
    };
    const recommendation = await this.recommendations.getRecommendationSet(input);
    if (!recommendation) {
      throw new RecommendationSetNotFoundError();
    }
    return RecommendationSetResponseSchema.parse({ recommendation });
  }
}
