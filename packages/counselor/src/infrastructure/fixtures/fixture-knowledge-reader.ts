import {
  RetrievedEvidenceSchema,
  type CatalogEntityType,
  type RetrievedEvidence,
} from "@yuvanext/contracts";
import type {
  KnowledgeReader,
  ReadCatalogCollectionInput,
  ReadCatalogEntityInput,
} from "../../application/index.js";

const collectionTypeMap = {
  streams: "stream",
  colleges: "college",
  aid_schemes: "aid",
} as const satisfies Record<string, CatalogEntityType>;

export class FixtureKnowledgeReader implements KnowledgeReader {
  private readonly evidence: RetrievedEvidence;

  constructor(evidence: RetrievedEvidence) {
    this.evidence = RetrievedEvidenceSchema.parse(evidence);
  }

  getCareer(input: ReadCatalogEntityInput): Promise<RetrievedEvidence> {
    return Promise.resolve(
      this.result(
        "career_by_id",
        this.evidence.entities.filter(
          (entity) => entity.entityType === "career" && entity.id === input.entityId,
        ),
      ),
    );
  }

  getStreams(input: ReadCatalogCollectionInput): Promise<RetrievedEvidence> {
    void input;
    return Promise.resolve(this.collection("streams"));
  }

  getColleges(input: ReadCatalogCollectionInput): Promise<RetrievedEvidence> {
    void input;
    return Promise.resolve(this.collection("colleges"));
  }

  getAidSchemes(input: ReadCatalogCollectionInput): Promise<RetrievedEvidence> {
    void input;
    return Promise.resolve(this.collection("aid_schemes"));
  }

  private collection(queryType: keyof typeof collectionTypeMap): RetrievedEvidence {
    const entityType = collectionTypeMap[queryType];
    return this.result(
      queryType,
      this.evidence.entities.filter((entity) => entity.entityType === entityType),
    );
  }

  private result(queryType: string, entities: RetrievedEvidence["entities"]): RetrievedEvidence {
    return RetrievedEvidenceSchema.parse({
      ...this.evidence,
      queryType,
      entities,
    });
  }
}
