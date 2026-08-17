import {
  RetrievedEvidenceSchema,
  UuidSchema,
  type CatalogEntity,
  type RetrievedEvidence,
} from "@yuvanext/contracts";
import type { createDatabasePool } from "@yuvanext/database";
import type {
  KnowledgeReader,
  ReadKnowledgeCollectionInput,
  ReadKnowledgeEntityInput,
} from "../application/knowledge-reader.js";

type DatabasePool = ReturnType<typeof createDatabasePool>;

type EvidenceRow = {
  id: string;
  title: string;
  entity_type: CatalogEntity["entityType"];
  status: CatalogEntity["status"];
  dataset_key: string;
  dataset_version: string;
  source_ref: string | null;
  entity_ref: string | null;
  last_verified_at: string | Date | null;
};

const validateCollectionInput = (input: ReadKnowledgeCollectionInput): string[] => {
  UuidSchema.parse(input.profileSnapshotId);
  if (input.recommendationId) UuidSchema.parse(input.recommendationId);
  return input.entityIds.map((id) => UuidSchema.parse(id));
};

const toEvidence = (queryType: string, rows: EvidenceRow[]): RetrievedEvidence => {
  const entities = rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    title: row.title,
    status: row.status,
    datasetVersion: row.dataset_version,
    sourceRefs: [...new Set([row.entity_ref, row.source_ref].filter((ref): ref is string => !!ref))],
    ...(row.last_verified_at
      ? { lastVerifiedAt: new Date(row.last_verified_at).toISOString() }
      : {}),
  }));
  const sourceVersions = Object.fromEntries(
    rows.map((row) => [row.dataset_key, row.dataset_version]),
  );
  return RetrievedEvidenceSchema.parse({
    queryType,
    entities,
    sourceVersions,
    retrievedAt: new Date().toISOString(),
  });
};

export class PostgresKnowledgeReader implements KnowledgeReader {
  constructor(private readonly pool: DatabasePool) {}

  async getCareer(input: ReadKnowledgeEntityInput): Promise<RetrievedEvidence> {
    const entityId = UuidSchema.parse(input.entityId);
    const result = await this.pool.query<EvidenceRow>(
      `select
         c.id, c.title, 'career'::text as entity_type,
         c.publication_status as status, dv.dataset_key,
         dv.version as dataset_version, source.base_url as source_ref,
         null::text as entity_ref, cp.last_reviewed_at as last_verified_at
       from knowledge.careers c
       join knowledge.dataset_versions dv on dv.id = c.dataset_version_id
       join knowledge.knowledge_sources source on source.id = dv.source_id
       left join knowledge.career_profiles cp
         on cp.career_id = c.id and cp.review_status = 'reviewed'
       where c.id = $1
         and c.publication_status in ('published', 'retired')
         and dv.import_status = 'published'
         and source.status = 'active'`,
      [entityId],
    );
    return toEvidence("career_by_id", result.rows);
  }

  async getStreams(input: ReadKnowledgeCollectionInput): Promise<RetrievedEvidence> {
    const entityIds = validateCollectionInput(input);
    if (entityIds.length === 0) return toEvidence("streams_by_recommendation", []);
    const result = await this.pool.query<EvidenceRow>(
      `select
         option.id, option.title, 'stream'::text as entity_type,
         'published'::text as status, dv.dataset_key,
         dv.version as dataset_version, source.base_url as source_ref,
         null::text as entity_ref, dv.published_at as last_verified_at
       from knowledge.stream_options option
       join knowledge.stream_map_items item on item.stream_option_id = option.id
       join knowledge.stream_maps map on map.id = item.map_id and map.status = 'published'
       join knowledge.dataset_versions dv on dv.id = map.dataset_version_id
       join knowledge.knowledge_sources source on source.id = dv.source_id
       where option.id = any($1::uuid[])
         and option.status = 'active'
         and dv.import_status = 'published'
         and source.status = 'active'
       group by option.id, option.title, dv.dataset_key, dv.version,
         source.base_url, dv.published_at
       order by array_position($1::uuid[], option.id)`,
      [entityIds],
    );
    return toEvidence("streams_by_recommendation", result.rows);
  }

  async getColleges(input: ReadKnowledgeCollectionInput): Promise<RetrievedEvidence> {
    const entityIds = validateCollectionInput(input);
    if (entityIds.length === 0) return toEvidence("colleges_by_recommendation", []);
    const result = await this.pool.query<EvidenceRow>(
      `select
         college.id, college.name as title, 'college'::text as entity_type,
         'published'::text as status, dv.dataset_key,
         dv.version as dataset_version, source.base_url as source_ref,
         college.website_url as entity_ref, college.last_verified_at
       from knowledge.colleges college
       join knowledge.dataset_versions dv on dv.id = college.dataset_version_id
       join knowledge.knowledge_sources source on source.id = dv.source_id
       where college.id = any($1::uuid[])
         and college.verification_status = 'verified'
         and dv.import_status = 'published'
         and source.status = 'active'
       order by array_position($1::uuid[], college.id)`,
      [entityIds],
    );
    return toEvidence("colleges_by_recommendation", result.rows);
  }

  async getAidSchemes(input: ReadKnowledgeCollectionInput): Promise<RetrievedEvidence> {
    const entityIds = validateCollectionInput(input);
    if (entityIds.length === 0) return toEvidence("aid_by_recommendation", []);
    const result = await this.pool.query<EvidenceRow>(
      `select
         aid.id, aid.name as title, 'aid'::text as entity_type,
         'published'::text as status, dv.dataset_key,
         dv.version as dataset_version, source.base_url as source_ref,
         aid.application_url as entity_ref, aid.last_verified_at
       from knowledge.aid_schemes aid
       join knowledge.dataset_versions dv on dv.id = aid.dataset_version_id
       join knowledge.knowledge_sources source on source.id = dv.source_id
       where aid.id = any($1::uuid[])
         and aid.verification_status = 'verified'
         and dv.import_status = 'published'
         and source.status = 'active'
       order by array_position($1::uuid[], aid.id)`,
      [entityIds],
    );
    return toEvidence("aid_by_recommendation", result.rows);
  }
}
