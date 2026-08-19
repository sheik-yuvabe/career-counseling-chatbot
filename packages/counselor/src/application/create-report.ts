import { createHash, randomUUID } from "node:crypto";
import {
  CreateReportRequestSchema,
  ReportResponseSchema,
  UuidSchema,
  type ExplorationEvent,
  type RecommendationSet,
  type ReportResponse,
} from "@yuvanext/contracts";
import { CounselorContractError, CounselorNotFoundError } from "./errors.js";
import type { CounselorRepository, ProfileReader, RecommendationReader } from "./ports/index.js";

export type CreateReportCommand = {
  userId: string;
  request: unknown;
};

export type CreateReportDependencies = {
  repository: CounselorRepository;
  profiles: ProfileReader;
  recommendations: RecommendationReader;
  createId?: () => string;
  now?: () => Date;
};

const hashPayload = (payload: Record<string, unknown>): string =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex");

export class CreateReportService {
  constructor(private readonly dependencies: CreateReportDependencies) {}

  async execute(command: CreateReportCommand): Promise<ReportResponse> {
    const userId = UuidSchema.parse(command.userId);
    const request = CreateReportRequestSchema.parse(command.request);
    const profile = await this.dependencies.profiles.getProfileSnapshot({
      userId,
      profileSnapshotId: request.profileSnapshotId,
    });
    if (!profile || profile.userId !== userId) {
      throw new CounselorNotFoundError("Profile snapshot was not found");
    }

    const journey = await this.dependencies.repository.getJourneyState(userId);
    if (journey?.profileSnapshotId && journey.profileSnapshotId !== profile.snapshotId) {
      throw new CounselorContractError("Profile snapshot is not the current journey profile");
    }
    const recommendation = await this.dependencies.recommendations.getRecommendationSet({
      userId,
      profileSnapshotId: profile.snapshotId,
      ...(journey?.currentRecommendationId
        ? { recommendationId: journey.currentRecommendationId }
        : {}),
    });
    if (!recommendation) {
      throw new CounselorNotFoundError("Recommendation was not found");
    }
    const recommendations = [recommendation];
    const explorationEvents =
      await this.dependencies.repository.listExplorationEventsForRecommendation(
        userId,
        recommendation.recommendationId,
      );
    this.assertExplorationReferences(recommendations, explorationEvents);

    const exploredEntityIds = [
      ...new Set(
        explorationEvents.flatMap((event) =>
          recommendations.flatMap((recommendation) =>
            recommendation.items
              .filter((item) => item.itemId === event.recommendationItemId)
              .map((item) => item.entityId),
          ),
        ),
      ),
    ];
    const payload: Record<string, unknown> = {
      schemaVersion: 1,
      profile,
      recommendations,
      explorationEvents,
      summaryFragments: [],
    };
    const report = await this.dependencies.repository.saveReport({
      userId,
      idempotencyKey: request.idempotencyKey,
      explorationEventIds: explorationEvents.map((event) => event.eventId),
      report: {
        reportId: (this.dependencies.createId ?? randomUUID)(),
        profileSnapshotId: profile.snapshotId,
        recommendationIds: [recommendation.recommendationId],
        exploredEntityIds,
        reportSchemaVersion: 1,
        language: "en",
        payload,
        payloadHash: hashPayload(payload),
        summaryMode: "template",
        promptVersion: null,
        createdAt: (this.dependencies.now ?? (() => new Date()))().toISOString(),
      },
    });
    return ReportResponseSchema.parse({ report });
  }

  private assertExplorationReferences(
    recommendations: RecommendationSet[],
    events: ExplorationEvent[],
  ): void {
    const recommendationById = new Map(
      recommendations.map((recommendation) => [recommendation.recommendationId, recommendation]),
    );
    for (const event of events) {
      const recommendation = recommendationById.get(event.recommendationId);
      if (!recommendation) {
        throw new CounselorContractError(
          "Exploration event references a recommendation outside the report",
        );
      }
      if (
        event.recommendationItemId &&
        !recommendation.items.some((item) => item.itemId === event.recommendationItemId)
      ) {
        throw new CounselorContractError(
          "Exploration event references an invalid recommendation item",
        );
      }
    }
  }
}
