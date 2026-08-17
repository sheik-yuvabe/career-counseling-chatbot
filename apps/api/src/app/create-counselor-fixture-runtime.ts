import {
  CreateJourneyEventService,
  CreateExplorationEventService,
  CreateReportService,
  FixtureAiProvider,
  FixtureApprovedCopyReader,
  FixtureKnowledgeReader,
  FixtureProfileReader,
  FixtureRecommendationReader,
  FixtureReportRenderer,
  FixtureSafetyChecker,
  GetConversationHistoryService,
  GetJourneyService,
  GetReportService,
  InMemoryCounselorRepository,
  SendConversationMessageService,
  RenderReportAssetService,
  StartConversationService,
  type CounselorHttpDependencies,
} from "@yuvanext/counselor";
import {
  validHandoffPacket,
  validProfileSnapshot,
  validRecommendationSet,
  validRetrievedEvidence,
  validSafetyDecision,
} from "@yuvanext/test-fixtures";

export const createCounselorFixtureRuntime = (
  bearerToken: string,
): Required<CounselorHttpDependencies> => {
  const repository = new InMemoryCounselorRepository();
  const profiles = new FixtureProfileReader([validProfileSnapshot]);
  const recommendations = new FixtureRecommendationReader(
    [validRecommendationSet],
    validProfileSnapshot.userId,
  );
  const approvedCopy = new FixtureApprovedCopyReader([
    {
      segment: "pathfinder",
      language: "en",
      key: "synthetic_welcome",
      version: "1",
      text: "Welcome to the synthetic counselor journey.",
    },
    {
      segment: "pathfinder",
      language: "en",
      key: "synthetic_fallback",
      version: "1",
      text: "Your synthetic recommendation is ready to explore.",
    },
  ]);

  return {
    createExplorationEvent: new CreateExplorationEventService({
      repository,
      recommendations,
    }),
    createJourneyEvent: new CreateJourneyEventService({ repository }),
    createReport: new CreateReportService({
      repository,
      profiles,
      recommendations,
    }),
    resolveUserId: (request) => {
      const authorization = request.header("authorization");
      const match = authorization ? /^Bearer\s+(\S+)$/i.exec(authorization.trim()) : null;
      return Promise.resolve(match?.[1] === bearerToken ? validProfileSnapshot.userId : null);
    },
    getHistory: new GetConversationHistoryService(repository),
    getJourney: new GetJourneyService(repository),
    getReport: new GetReportService(repository),
    reportAssets: new RenderReportAssetService({
      repository,
      renderer: new FixtureReportRenderer(),
      privateAssetTtlMs: 15 * 60 * 1000,
      shareAssetTtlMs: 24 * 60 * 60 * 1000,
    }),
    startConversation: new StartConversationService({
      repository,
      profiles,
      recommendations,
      approvedCopy,
      configuration: {
        initialJourneyStep: 1,
        initialJourneyStateKey: "synthetic_welcome",
        aiMode: "disabled",
      },
    }),
    sendMessage: new SendConversationMessageService({
      repository,
      profiles,
      recommendations,
      knowledge: new FixtureKnowledgeReader(validRetrievedEvidence),
      safety: new FixtureSafetyChecker(validSafetyDecision, validHandoffPacket),
      ai: new FixtureAiProvider({ status: "disabled" }),
      approvedCopy,
      configuration: {
        fallbackCopyKey: "synthetic_fallback",
        fallbackCopyVersion: "1",
      },
    }),
  };
};
