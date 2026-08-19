import {
  RetrievedEvidenceSchema,
  type HandoffPacket,
  type RetrievedEvidence,
  type SafetyDecision,
} from "@yuvanext/contracts";
import {
  CounselorDependencyUnavailableError,
  type KnowledgeReader,
  type ReadCatalogCollectionInput,
  type ReadCatalogEntityInput,
  type RequestHandoffInput,
  type SafetyChecker,
  type SafetyPreCheckInput,
} from "../application/index.js";

export class UnavailableKnowledgeReader implements KnowledgeReader {
  getCareer(input: ReadCatalogEntityInput): Promise<RetrievedEvidence> {
    void input;
    return Promise.resolve(this.empty("career_by_id"));
  }

  getStreams(input: ReadCatalogCollectionInput): Promise<RetrievedEvidence> {
    void input;
    return Promise.resolve(this.empty("streams"));
  }

  getColleges(input: ReadCatalogCollectionInput): Promise<RetrievedEvidence> {
    void input;
    return Promise.resolve(this.empty("colleges"));
  }

  getAidSchemes(input: ReadCatalogCollectionInput): Promise<RetrievedEvidence> {
    void input;
    return Promise.resolve(this.empty("aid_schemes"));
  }

  private empty(queryType: string): RetrievedEvidence {
    return RetrievedEvidenceSchema.parse({
      queryType,
      entities: [],
      sourceVersions: { knowledge: "unavailable" },
      retrievedAt: new Date().toISOString(),
    });
  }
}

export class UnavailableSafetyChecker implements SafetyChecker {
  preCheck(input: SafetyPreCheckInput): Promise<SafetyDecision> {
    void input;
    return Promise.reject(
      new CounselorDependencyUnavailableError(
        "Safety screening is unavailable; the counselor message was not generated.",
      ),
    );
  }

  requestHandoff(input: RequestHandoffInput): Promise<HandoffPacket> {
    void input;
    return Promise.reject(
      new CounselorDependencyUnavailableError("Safety handoff service is unavailable."),
    );
  }
}
