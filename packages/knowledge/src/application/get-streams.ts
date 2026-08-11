import type {
  StreamListQuery,
  StreamListResponse,
} from "@yuvanext/contracts";
import type { StreamRepository } from "../domain/streams.js";

export type GetStreamsOptions = {
  now?: () => Date;
};

export async function getStreams(
  repository: StreamRepository,
  query: StreamListQuery,
  options: GetStreamsOptions = {},
): Promise<StreamListResponse> {
  const result = await repository.findPublished({
    topTwo: query.topTwo,
    segment: query.segment,
  });

  return {
    data: result.items.slice().sort((a, b) => a.rank - b.rank),
    sourceDataVersions:
      result.datasetVersionId === null
        ? {}
        : { streams: result.datasetVersionId },
    retrievedAt: (options.now ?? (() => new Date()))().toISOString(),
    caveats:
      result.items.length === 0
        ? [
            "No approved stream mapping is available for this profile yet.",
          ]
        : [],
  };
}
