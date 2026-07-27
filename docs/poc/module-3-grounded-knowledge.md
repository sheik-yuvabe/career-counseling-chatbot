# Module 3 POC — Grounded Knowledge Platform

## Assignment outcome

Deliver a versioned, source-aware catalog and typed retrieval layer for careers, pathways, streams, colleges, scholarships, career profiles, and approved narrative content. Structured retrieval is primary; vector RAG is optional and limited to approved prose.

## PRD coverage

- Primary data support for `US-12`, `US-15`, `US-16`, `US-26`–`US-28`, `US-34`–`US-36`.
- Tool contracts: `get_career`, `get_streams`, `get_colleges`, `get_aid_schemes`.
- `match_careers` is owned by Module 2 but reads this module's repositories.

## Goals

- Prove repeatable ingestion, validation, versioning, and retrieval.
- Ensure every student-facing entity comes from an approved record.
- Attach source, verified/reviewed status, and freshness metadata.
- Provide tools whose results are safe for Module 4 to give Claude.
- Prevent model-generated links, salary figures, college names, and eligibility facts.

## Non-goals

- Assessment scoring or career-fit ranking.
- Free-form internet search at student-response time.
- Full five-state AISHE parity in the POC.
- Automatic publication of AI-drafted career profiles.
- Using vector similarity as the source of truth for structured facts.

## Owned paths

```text
packages/knowledge/src/domain/
packages/knowledge/src/application/
packages/knowledge/src/infrastructure/
packages/knowledge/src/http/
data/raw/
data/seed/
data/schemas/
scripts/ingest/
scripts/validate/
packages/contracts/src/catalog.ts
packages/contracts/src/tools.ts
packages/test-fixtures/catalog/
```

## Integration boundary and conflict rules

- Publish catalog and retrieval ports; Modules 2 and 4 must not query knowledge tables directly.
- Export one `registerKnowledgeRoutes()` entry point for the Express composition owner.
- `data/raw` is append-only and source-versioned; reviewed output changes require validation reports.
- Structured records remain the source of truth even when optional vector retrieval is enabled.
- Module 3 owns entity IDs and source metadata, but not recommendation rank, ring membership, chat wording, or safety copy.
- Tool-schema changes require compatibility tests against Module 4 mocks and Module 2 catalog adapters.

## Data categories

### Structured authoritative catalog

- Curated careers and O*NET/NCO identifiers.
- RIASEC and work-values vectors.
- Pathways, degrees, examinations, duration, and backup routes.
- Stream map.
- Colleges, disciplines, admission routes, fee bands, state, and verification.
- Aid schemes, eligibility summary, benefit/amount, official application URL, application window, and verification.
- Career profile image reference, salary band/note, skills, progression, and last reviewed date.

### Approved narrative knowledge

- Counselor-reviewed career descriptions.
- FAQ and parent explanations.
- Approved education-route guidance.
- Policy/process explanations with source and review dates.

Narrative documents may use keyword or hybrid/vector retrieval. Facts that already have structured fields must still be returned from structured records.

## Ingestion pipeline

```text
raw file
  → file checksum and source manifest
  → schema validation
  → normalization
  → referential-integrity checks
  → duplicate detection
  → review gate
  → versioned seed artifact
  → transactional import
  → row counts/checksums/audit report
```

No ingest run may mutate `data/raw`. A new dataset version is created for every accepted import.

## Validation requirements

- Required fields and types.
- Stable unique IDs.
- Valid RIASEC letters/vectors.
- Valid state codes and provider types.
- Pathway references resolve.
- URLs use `https` and come from source data.
- Salary/amount fields have a note and last-reviewed/verified date.
- Unverified records are retained only with `verified=false` and caveat metadata.
- No duplicate normalized `(name, city, state)` colleges without a review decision.
- No student-facing career profile with `reviewed=false`.

## POC database tables

- `dataset_versions`
- `data_sources`
- `careers`
- `career_profiles`
- `pathways`
- `streams_map`
- `colleges`
- `aid_schemes`
- Optional `knowledge_documents` and `knowledge_chunks`

Every row records `datasetVersionId`, source reference, verification/review status, and relevant freshness date.

## Tool contracts

```ts
type ToolResult<T> = {
  data: T;
  sourceDataVersions: Record<string, string>;
  retrievedAt: string;
  caveats: string[];
};
```

### `get_career`

Input: stable career code.  
Output: approved title, description, domain, education route, pathway, career profile, source/review metadata.  
Not found: typed `CATALOG_ENTITY_NOT_FOUND`; the AI must say it is not yet in the database.

### `get_streams`

Input: profile top-two code and segment.  
Output: versioned Table A rows only.

### `get_colleges`

Input: state, optional pathway/discipline, maximum results.  
Output: typed college rows with verification flag and caveats.  
This tool filters; Module 2 applies personalized ranking/rings.

### `get_aid_schemes`

Input: volunteered filters and maximum results.  
Output: candidate scheme records with official URL, eligibility fields, freshness, and caveats.  
This tool does not declare the student eligible; Module 2 partitions likelihood.

### Search

Career browser search supports titles and domains. Curated careers return rich details; non-curated titles return restricted summary/handoff behavior defined by contract.

## API contract

```text
GET  /api/v1/catalog/careers/search?q=&domain=&cursor=
GET  /api/v1/catalog/careers/:code
GET  /api/v1/catalog/streams?topTwo=&segment=
GET  /api/v1/catalog/colleges?state=&pathwayId=&discipline=&limit=
GET  /api/v1/catalog/aid?state=&level=&gender=&category=&limit=
GET  /api/v1/catalog/datasets
POST /api/v1/internal/catalog/imports
GET  /api/v1/internal/catalog/imports/:id/report
```

Internal import endpoints require staff/service authorization and are audit-logged.

## POC dataset

Use small reviewed subsets sufficient for all paths:

- 24–30 curated careers across six RIASEC high-point letters.
- At least one vocational and one degree route per relevant fixture family.
- 8–12 pathways and associated streams/degrees/exams.
- 20–30 colleges covering all five states plus vocational/open options.
- 15–20 aid schemes covering all provider types.
- 10 career profiles with image references, salary honesty notes, skills, and progression.
- 8–12 approved narrative documents if hybrid retrieval is demonstrated.

## RAG decision for the POC

Start without vector RAG. Implement structured filters and PostgreSQL full-text search first. Add a small hybrid-retrieval experiment only if an approved narrative question cannot be served well through structured tools.

Any RAG response must return chunk IDs, document version, source, review status, and date. Module 4 may quote only retrieved content within configured limits.

## Implementation sequence

1. Publish catalog schemas and dataset manifest format.
2. Add validation scripts and deliberately invalid fixtures.
3. Add dataset/source migrations and repositories.
4. Implement transactional importer and report.
5. Implement typed tools and public catalog APIs.
6. Add caveat/freshness behavior.
7. Add browser search.
8. Optionally evaluate narrative hybrid retrieval against a small question set.

## Required automated tests

### Ingestion

- Missing field, invalid enum, bad URL, duplicate ID, orphan pathway, and unreviewed-profile failures.
- Same dataset import is idempotent.
- Failed import rolls back entirely.
- Import report row counts and checksums match fixtures.

### Retrieval

- All returned entity IDs exist in the active version.
- Unverified college always carries confirmation caveat.
- Aid response always carries yearly-change/official-portal caveat.
- Inactive/deactivated scheme never renders.
- Unreviewed career profile is excluded.
- Pagination and deterministic ordering.
- No query can return a raw/non-active dataset row.

### Optional RAG

- Golden questions return approved documents.
- Retrieved chunk always includes traceable source/version.
- Prompt-injection text in a document is treated as content, not instructions.
- Structured facts override conflicting prose chunks.

## POC demo script

1. Run an intentionally invalid import and show the readable validation report with no database mutation.
2. Import a valid version and display counts/checksums.
3. Search careers and retrieve a rich reviewed career profile.
4. Query an unverified college and show the required caveat.
5. Query aid and show official stored links and freshness fields.
6. Attempt to retrieve an unknown code and show the typed not-found behavior.
7. Activate a newer dataset version and prove old recommendations can still reference the previous version for audit.

## Acceptance criteria

- All student-facing entities are traceable to active approved records.
- Import is transactional, repeatable, and versioned.
- No tool constructs a URL, salary, amount, or entity name.
- Module 2 can consume catalog repositories without depending on ingestion internals.
- Module 4 receives bounded typed tool results with caveats and versions.

## Risks and production follow-ups

- Confirm licenses for career images and source datasets.
- Create counselor review workflow for remaining career profiles.
- Implement AISHE/state-portal scaling and fuzzy-dedup review queue for Phase 2.
- Assign annual salary/aid freshness owners.
- Complete NCO/ISCO coverage and confidence review in Phase 2.

## Handoff checklist

- Dataset schema documentation.
- Source/attribution and licensing manifest.
- Valid and invalid fixture sets.
- Import report example.
- Tool contract examples and OpenAPI.
- Active dataset version and rollback procedure.
