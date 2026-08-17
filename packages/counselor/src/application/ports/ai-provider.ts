import type {
  ConversationMessage,
  ProfileSnapshot,
  RecommendationSet,
  RetrievedEvidence,
} from "@yuvanext/contracts";

export type AiProviderRequest = {
  conversationId: string;
  userMessage: string;
  profile: ProfileSnapshot;
  recommendation: RecommendationSet | null;
  groundingEvidence: RetrievedEvidence[];
  recentMessages: ConversationMessage[];
  groundingViolations: string[];
};

export type AiProviderResult =
  | {
      status: "completed";
      text: string;
      grounding: {
        entityIds: string[];
        recommendationIds: string[];
      };
    }
  | { status: "disabled" }
  | { status: "timed_out"; errorCode: string }
  | { status: "failed"; errorCode: string };

export interface AiProvider {
  generateDraft(input: AiProviderRequest): Promise<AiProviderResult>;
}
