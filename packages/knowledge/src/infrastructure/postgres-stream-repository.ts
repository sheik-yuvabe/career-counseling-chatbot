import { StreamResultItemSchema } from "@yuvanext/contracts";
import type {
  StreamLookup,
  StreamRepository,
  StreamRepositoryResult,
} from "../domain/streams.js";

type StreamDatabaseRow = {
  streamCode: string;
  title: string;
  description: string;
  rank: number;
  reasonKey: string;
  datasetVersionId: string;
};

export interface StreamQueryExecutor {
  query(
    sql: string,
    values: unknown[],
  ): Promise<{ rows: StreamDatabaseRow[] }>;
}

export class PostgresStreamRepository implements StreamRepository {
  constructor(private readonly database: StreamQueryExecutor) {}

  async findPublished(
    lookup: StreamLookup,
  ): Promise<StreamRepositoryResult> {
    const result = await this.database.query(
      `
        with selected_map as (
          select map.id
          from knowledge.stream_maps as map
          inner join knowledge.dataset_versions as dataset
            on dataset.id = map.dataset_version_id
          inner join knowledge.knowledge_sources as source
            on source.id = dataset.source_id
          where map.top_two_code = $1
            and map.segment = $2
            and map.status = 'published'
            and dataset.import_status = 'published'
            and source.trust_level in ('authoritative_external', 'project_reviewed')
          order by
            case source.trust_level
              when 'authoritative_external' then 0
              else 1
            end,
            dataset.published_at desc nulls last,
            dataset.imported_at desc,
            map.id
          limit 1
        )
        select
          option.stream_code as "streamCode",
          option.title,
          option.description,
          item.rank,
          item.reason_key as "reasonKey",
          map.dataset_version_id::text as "datasetVersionId"
        from knowledge.stream_maps as map
        inner join selected_map
          on selected_map.id = map.id
        inner join knowledge.dataset_versions as dataset
          on dataset.id = map.dataset_version_id
        inner join knowledge.stream_map_items as item
          on item.map_id = map.id
        inner join knowledge.stream_options as option
          on option.id = item.stream_option_id
        where map.top_two_code = $1
          and map.segment = $2
          and map.status = 'published'
          and dataset.import_status = 'published'
          and option.status = 'active'
        order by item.rank, option.stream_code
      `,
      [lookup.topTwo, lookup.segment],
    );
    const datasetVersionIds = [
      ...new Set(result.rows.map((row) => row.datasetVersionId)),
    ];

    if (datasetVersionIds.length > 1) {
      throw new Error(
        "Stream results must come from one active dataset version",
      );
    }

    return {
      items: result.rows.map((row) =>
        StreamResultItemSchema.parse(row),
      ),
      datasetVersionId: datasetVersionIds[0] ?? null,
    };
  }
}
