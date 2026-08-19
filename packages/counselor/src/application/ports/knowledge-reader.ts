import type { RetrievedEvidence } from "@yuvanext/contracts";

export type ReadCatalogEntityInput = {
  entityId: string;
};

export type ReadCatalogCollectionInput = {
  entityIds: string[];
  profileSnapshotId: string;
  recommendationId?: string;
};

export interface KnowledgeReader {
  getCareer(input: ReadCatalogEntityInput): Promise<RetrievedEvidence>;
  getStreams(input: ReadCatalogCollectionInput): Promise<RetrievedEvidence>;
  getColleges(input: ReadCatalogCollectionInput): Promise<RetrievedEvidence>;
  getAidSchemes(input: ReadCatalogCollectionInput): Promise<RetrievedEvidence>;
}
