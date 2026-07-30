import type { CareerSearchQuery, CareerSearchResponse } from "@yuvanext/contracts";
import { InvalidCatalogCursorError, type CareerSearchRepository } from "../domain/career-search.js";

export type SearchCareersOptions = {
  now?: () => Date;
};

export async function searchCareers(
  repository: CareerSearchRepository,
  query: CareerSearchQuery,
  options: SearchCareersOptions = {},
): Promise<CareerSearchResponse> {
  const afterSlug = query.cursor === undefined ? undefined : decodeCareerCursor(query.cursor);
  const records = await repository.search({
    ...(query.q === undefined ? {} : { query: query.q }),
    ...(query.domain === undefined ? {} : { domain: query.domain }),
    ...(afterSlug === undefined ? {} : { afterSlug }),
    limit: query.limit + 1,
  });
  const publishedRecords = records.filter((career) => career.publicationStatus === "published");
  const page = publishedRecords.slice(0, query.limit);
  const hasNextPage = publishedRecords.length > query.limit;
  const datasetVersionIds = [...new Set(page.map((career) => career.datasetVersionId))];

  if (datasetVersionIds.length > 1) {
    throw new Error("Career search results must come from one active dataset version");
  }

  const datasetVersionId = datasetVersionIds[0];
  const restrictedCount = page.filter((career) => !career.isCurated).length;

  return {
    data: page.map((career) => ({
      id: career.id,
      slug: career.slug,
      title: career.title,
      shortDescription: career.shortDescription,
      domainCode: career.domainCode,
      detailAvailability: career.isCurated ? "rich" : "restricted",
      datasetVersionId: career.datasetVersionId,
    })),
    nextCursor: hasNextPage && page.length > 0 ? encodeCareerCursor(page.at(-1)!.slug) : null,
    sourceDataVersions: datasetVersionId === undefined ? {} : { careers: datasetVersionId },
    retrievedAt: (options.now ?? (() => new Date()))().toISOString(),
    caveats:
      restrictedCount > 0 ? ["Some careers have summary-only details pending curation."] : [],
  };
}

const encodeCareerCursor = (slug: string): string =>
  Buffer.from(JSON.stringify({ slug }), "utf8").toString("base64url");

const decodeCareerCursor = (cursor: string): string => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("slug" in parsed) ||
      typeof parsed.slug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.slug)
    ) {
      throw new InvalidCatalogCursorError();
    }

    return parsed.slug;
  } catch (error) {
    if (error instanceof InvalidCatalogCursorError) {
      throw error;
    }
    throw new InvalidCatalogCursorError();
  }
};
