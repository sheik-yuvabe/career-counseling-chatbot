import {
  CreateJourneyEventService,
  CreateExplorationEventService,
  CreateReportService,
  GetConversationHistoryService,
  GetJourneyService,
  GetReportService,
  PostgresCounselorRepository,
  SendConversationMessageService,
  RenderReportAssetService,
  StartConversationService,
  type AiProvider,
  type ApprovedCopyReader,
  type CounselorHttpDependencies,
  type KnowledgeReader,
  type ProfileReader,
  type RecommendationReader,
  type ReportRenderer,
  type SafetyChecker,
} from "@yuvanext/counselor";
import {
  createSupabaseUserResolver,
  type SupabaseAuthClient,
} from "../auth/supabase-user-resolver.js";

type CounselorDatabasePool = ConstructorParameters<typeof PostgresCounselorRepository>[0];

export type CounselorRuntimeAdapters = {
  databasePool: CounselorDatabasePool;
  supabaseAuth: SupabaseAuthClient;
  profiles: ProfileReader;
  recommendations: RecommendationReader;
  knowledge: KnowledgeReader;
  safety: SafetyChecker;
  ai: AiProvider;
  approvedCopy: ApprovedCopyReader;
  reportRenderer: ReportRenderer;
  privateAssetTtlMs: number;
  shareAssetTtlMs: number;
  aiMode: "enabled" | "degraded" | "disabled";
};

export const createCounselorRuntime = (
  adapters: CounselorRuntimeAdapters,
): Required<CounselorHttpDependencies> => {
  const repository = new PostgresCounselorRepository(adapters.databasePool);
  return {
    createExplorationEvent: new CreateExplorationEventService({
      repository,
      recommendations: adapters.recommendations,
    }),
    createJourneyEvent: new CreateJourneyEventService({ repository }),
    createReport: new CreateReportService({
      repository,
      profiles: adapters.profiles,
      recommendations: adapters.recommendations,
    }),
    resolveUserId: createSupabaseUserResolver(adapters.supabaseAuth),
    getHistory: new GetConversationHistoryService(repository),
    getJourney: new GetJourneyService(repository),
    getReport: new GetReportService(repository),
    reportAssets: new RenderReportAssetService({
      repository,
      renderer: adapters.reportRenderer,
      privateAssetTtlMs: adapters.privateAssetTtlMs,
      shareAssetTtlMs: adapters.shareAssetTtlMs,
    }),
    startConversation: new StartConversationService({
      repository,
      profiles: adapters.profiles,
      recommendations: adapters.recommendations,
      approvedCopy: adapters.approvedCopy,
      configuration: {
        initialJourneyStep: 1,
        initialJourneyStateKey: "welcome",
        aiMode: adapters.aiMode,
      },
    }),
    sendMessage: new SendConversationMessageService({
      repository,
      profiles: adapters.profiles,
      recommendations: adapters.recommendations,
      knowledge: adapters.knowledge,
      safety: adapters.safety,
      ai: adapters.ai,
      approvedCopy: adapters.approvedCopy,
      configuration: {
        fallbackCopyKey: "counselor_unavailable",
        fallbackCopyVersion: "1",
      },
    }),
  };
};
