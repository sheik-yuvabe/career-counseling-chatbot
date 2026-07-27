# Module 3 Knowledge Storage Flow

## Purpose

This is the Phase A implementation walkthrough. For every field and constraint, use [Module 3 data model](module-3-knowledge-data-model.md) and [Module 3 MVP DBML](module-3-knowledge-mvp.dbml).

Module 3 stores reviewed careers, pathways, streams, colleges and aid information. This is catalog data, not per-user data. Phase A uses structured retrieval without RAG or pgvector.

## Two flows

```text
Staff/data import -> validate and publish catalog records
Runtime read      -> return published records to Modules 2 and 4
```

User actions normally do not insert rows into `knowledge`.

## Publication flow

```text
reviewed source file/API
  -> knowledge_sources
  -> dataset_versions (staged)
  -> validate identifiers, links and required fields
  -> insert versioned catalog rows
  -> publish dataset version
  -> expose bounded Express queries
```

### 1. Register the source

`knowledge.knowledge_sources` describes where facts came from.

```text
source_key    onet-reviewed
name          O*NET reviewed career catalog
source_type   onet
trust_level   authoritative
status        active
```

### 2. Register an import

`knowledge.dataset_versions` records the batch.

```text
dataset_key       careers
version           2026-a
checksum          sha256(...)
record_count      250
import_status     staged
```

A failed batch becomes `rejected`; it cannot partly replace published records.

### 3. Store career and route records

```text
careers
  -> career_interest_profiles
  -> career_value_profiles
  -> career_profiles
  -> career_pathways -> pathways -> education_routes
```

Example:

```text
knowledge.careers
  career_code      DATA_SCIENTIST
  title            Data Scientist
  dataset_version  2026-a
  status           published

knowledge.career_interest_profiles
  r/i/a/s/e/c scores  approved career vector
```

Module 3 stores the career vector. Module 2 compares it with the user's profile; Module 3 never calculates user fit.

### 4. Store stream mappings

```text
stream_maps -> stream_map_items -> stream_options
```

A reviewed map uses a RIASEC combination and segment. Items give ordered choices. Changing the meaning requires a new version, not an AI runtime decision.

### 5. Store colleges and programs

```text
colleges -> college_programs -> disciplines
pathways -> pathway_disciplines -> disciplines
```

College records use the official full state/UT name, such as `Tamil Nadu` or `Puducherry`. The MVP does not convert onboarding input into codes. Aliases such as `Pondy` can be resolved at the search boundary when nationwide matching is implemented.

### 6. Store aid schemes

```text
aid_schemes -> aid_criteria
```

The scheme stores provider, official URL, application window and verification metadata. Criteria are structured facts. Module 3 returns them; Module 2 applies deterministic matching using volunteered user facts.

## Runtime retrieval

### Career

```text
GET /api/v1/knowledge/careers/:id
  -> read published career/profile/pathway fields
  -> return CareerRecord with dataset/source metadata
```

### Colleges

```text
GET /api/v1/knowledge/colleges?pathwayId=...&state=Tamil%20Nadu
  -> resolve pathway disciplines
  -> filter published colleges/programs
  -> return verified candidates
```

### Aid

```text
GET /api/v1/knowledge/aid?level=ug&state=Tamil%20Nadu
  -> read published schemes and criteria
  -> return candidates with freshness metadata
```

Runtime reads do not write user IDs, profile facts or search messages to knowledge tables.

## Ownership and Phase A rules

- Module 2 consumes stable IDs, vectors, criteria and versions.
- Module 4 consumes bounded published descriptions, URLs and sources.
- Retired entities remain resolvable for historical recommendations.
- Draft, rejected or unverified records never reach user tools.
- No embeddings, vectors, unrestricted runtime web search or user personal data.
- Narrative/RAG ingestion remains deferred.
