import type { CareerToolResult } from "@yuvanext/contracts";
import {
  CatalogEntityNotFoundError,
  type CareerRepository,
} from "../domain/career.js";

export type GetCareerOptions = {
  now?: () => Date;
};

export async function getCareer(
  repository: CareerRepository,
  slug: string,
  options: GetCareerOptions = {},
): Promise<CareerToolResult> {
  const normalizedSlug = slug.trim().toLowerCase();
  const entry = await repository.findBySlug(normalizedSlug);

  if (
    entry === null ||
    entry.career.publicationStatus !== "published"
  ) {
    throw new CatalogEntityNotFoundError(
      "career",
      normalizedSlug,
    );
  }

  if (
    entry.interestProfile !== null &&
    entry.interestProfile.datasetVersionId !==
      entry.career.datasetVersionId
  ) {
    throw new Error(
      "Career interest profile must match the career dataset version",
    );
  }

  const reviewedProfile =
    entry.profile?.reviewStatus === "reviewed"
      ? entry.profile
      : null;

  return {
    data: {
      career: entry.career,
      interestProfile: entry.interestProfile,
      profile: reviewedProfile,
    },
    sourceDataVersions: {
      careers: entry.career.datasetVersionId,
    },
    retrievedAt: (options.now ?? (() => new Date()))().toISOString(),
    caveats:
      entry.profile !== null && reviewedProfile === null
        ? ["Rich career profile is awaiting counselor review."]
        : [],
  };
}
