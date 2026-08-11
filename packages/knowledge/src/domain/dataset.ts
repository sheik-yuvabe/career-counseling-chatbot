import type { PublishedDataset } from "@yuvanext/contracts";

export interface DatasetRepository {
  listPublished(): Promise<readonly PublishedDataset[]>;
}
