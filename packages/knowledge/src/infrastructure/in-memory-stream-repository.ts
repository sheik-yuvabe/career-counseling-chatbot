import type {
  StreamMap,
  StreamMapItem,
  StreamOption,
} from "@yuvanext/contracts";
import type {
  StreamLookup,
  StreamRepository,
  StreamRepositoryResult,
} from "../domain/streams.js";

export class InMemoryStreamRepository implements StreamRepository {
  constructor(
    private readonly maps: readonly StreamMap[],
    private readonly items: readonly StreamMapItem[],
    private readonly options: readonly StreamOption[],
  ) {}

  findPublished(
    lookup: StreamLookup,
  ): Promise<StreamRepositoryResult> {
    const map = this.maps.find(
      (candidate) =>
        candidate.status === "published" &&
        candidate.topTwoCode === lookup.topTwo &&
        candidate.segment === lookup.segment,
    );

    if (map === undefined) {
      return Promise.resolve({
        items: [],
        datasetVersionId: null,
      });
    }

    const results = this.items
      .filter((item) => item.mapId === map.id)
      .map((item) => {
        const option = this.options.find(
          (candidate) =>
            candidate.id === item.streamOptionId &&
            candidate.status === "active",
        );

        return option === undefined
          ? null
          : {
              streamCode: option.streamCode,
              title: option.title,
              description: option.description,
              rank: item.rank,
              reasonKey: item.reasonKey,
            };
      })
      .filter((item) => item !== null);

    return Promise.resolve({
      items: results,
      datasetVersionId: map.datasetVersionId,
    });
  }
}
