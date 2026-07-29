import type {
  CollegeListQuery,
  CollegeListResponse,
} from "@yuvanext/contracts";
import type { CollegeRepository } from "../domain/college.js";
import { listColleges } from "./list-colleges.js";

export type GetCollegesOptions = {
  now?: () => Date;
};

export async function getColleges(
  repository: CollegeRepository,
  query: CollegeListQuery,
  options: GetCollegesOptions = {},
): Promise<CollegeListResponse> {
  const colleges = (
    await listColleges(repository, { state: query.state })
  ).slice(0, query.limit);
  const datasetVersionIds = [
    ...new Set(colleges.map((college) => college.datasetVersionId)),
  ];

  if (datasetVersionIds.length > 1) {
    throw new Error(
      "College results must come from one active dataset version",
    );
  }

  const datasetVersionId = datasetVersionIds[0];

  return {
    data: colleges,
    sourceDataVersions:
      datasetVersionId === undefined
        ? {}
        : { colleges: datasetVersionId },
    retrievedAt: (options.now ?? (() => new Date()))().toISOString(),
    caveats: [],
  };
}
