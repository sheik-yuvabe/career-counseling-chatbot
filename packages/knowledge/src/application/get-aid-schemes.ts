import type {
  AidSchemeListQuery,
  AidSchemeListResponse,
} from "@yuvanext/contracts";
import type { AidSchemeRepository } from "../domain/aid-scheme.js";

export async function getAidSchemes(
  repository: AidSchemeRepository,
  query: AidSchemeListQuery,
  now: () => Date = () => new Date(),
): Promise<AidSchemeListResponse> {
  const schemes = await repository.list({
    ...(query.state === undefined ? {} : { state: query.state }),
    ...(query.level === undefined ? {} : { level: query.level }),
    limit: query.limit,
  });
  const versions = [...new Set(schemes.map(({ datasetVersionId }) => datasetVersionId))];

  return {
    data: [...schemes].slice(0, query.limit),
    sourceDataVersions: versions.length === 1 ? { aidSchemes: versions[0]! } : {},
    retrievedAt: now().toISOString(),
    caveats: [
      "Aid matching is informational; confirm current eligibility and deadlines on the official portal.",
    ],
  };
}
