import type { RetrievedEvidence } from "@yuvanext/contracts";

export type ReadKnowledgeEntityInput = {
  entityId: string;
};

export type ReadKnowledgeCollectionInput = {
  entityIds: string[];
  profileSnapshotId: string;
  recommendationId?: string;
};

export interface KnowledgeReader {
  getCareer(input: ReadKnowledgeEntityInput): Promise<RetrievedEvidence>;
  getStreams(input: ReadKnowledgeCollectionInput): Promise<RetrievedEvidence>;
  getColleges(input: ReadKnowledgeCollectionInput): Promise<RetrievedEvidence>;
  getAidSchemes(input: ReadKnowledgeCollectionInput): Promise<RetrievedEvidence>;
}
