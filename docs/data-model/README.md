# YuvaNext Data Model

## Purpose

This directory is the canonical design source for the single Supabase PostgreSQL database used by YuvaNext. The database is divided into module-owned PostgreSQL schemas; it is not divided into five Supabase projects.

## Documents

| Document                                                                                  | Purpose                                                                | Owner                               |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| [Phase A MVP data model](phase-a-mvp-data-model.md)                                       | Target-compatible 69-table implementation subset and deferral rules    | Integration owner and module owners |
| [Phase A MVP DBML](yuvanext-phase-a-mvp.dbml)                                             | Complete 69-table field-level ERD for cross-module review              | Integration owner                   |
| [Module 1 Assessment MVP DBML](module-1-assessment-mvp.dbml)                              | Complete Assessment fields, documented rules and relationships         | Module 1                            |
| [Module 1 prototype-to-storage flow](module-1-prototype-storage-flow.md)                  | Step-by-step prototype journey, example records and table writes       | Module 1 and frontend integration   |
| [Module 2 Recommendation MVP DBML](module-2-recommendation-mvp.dbml)                      | Complete Recommendation fields, documented rules and relationships     | Module 2                            |
| [Module 2 recommendation storage flow](module-2-recommendation-storage-flow.md)           | Deterministic ranking, rings and plan persistence                      | Module 2 and integration            |
| [Module 3 Knowledge MVP DBML](module-3-knowledge-mvp.dbml)                                | Complete Knowledge fields, documented rules and relationships          | Module 3                            |
| [Module 3 knowledge storage flow](module-3-knowledge-storage-flow.md)                     | Catalog publication and structured retrieval                           | Module 3 and integration            |
| [Module 4 Counselor MVP DBML](module-4-counselor-mvp.dbml)                                | Complete Counselor fields, documented rules and relationships          | Module 4                            |
| [Module 4 counselor storage flow](module-4-counselor-storage-flow.md)                     | Conversation, grounding, journey and report persistence                | Module 4 and frontend integration   |
| [Module 5 Safety and Operations MVP DBML](module-5-safety-operations-mvp.dbml)            | Complete Safety/Operations fields, documented rules and relationships  | Module 5                            |
| [Module 5 safety and operations storage flow](module-5-safety-operations-storage-flow.md) | Safety, handoff, audit, privacy and evaluation                         | Module 5 and integration            |
| [Module 1: Assessment](module-1-assessment-data-model.md)                                 | Identity projection, consent, intake, assessment and profile snapshots | Module 1                            |
| [Module 2: Recommendations](module-2-recommendation-data-model.md)                        | Matching configuration, recommendation runs, rings and plans           | Module 2                            |
| [Module 3: Knowledge](module-3-knowledge-data-model.md)                                   | Versioned careers, pathways, colleges, aid and source provenance       | Module 3                            |
| [Module 4: Counselor](module-4-counselor-data-model.md)                                   | Conversations, tools, journey state, reports and assets                | Module 4                            |
| [Module 5: Safety and Operations](module-5-safety-operations-data-model.md)               | Safety, handoff, staff access, audit, privacy and evaluation           | Module 5                            |

The five module documents describe the **target data model**. The Phase A MVP document is the smaller implementation scope. A table omitted from the MVP is deferred, not removed from the target architecture.

The combined DBML and five module DBML files are generated together by `scripts/generate-data-model-dbml.ps1`. The combined file supports integration review; each colleague should use their module file for implementation review. Cross-module tables in a module file are explicitly labelled key-only external stubs.

## One database, module-owned schemas

```text
Supabase PostgreSQL
├── auth                         # Supabase managed
├── assessment                   # Module 1
├── recommendation               # Module 2
├── knowledge                    # Module 3
├── counselor                    # Module 4
├── safety_private               # Module 5, restricted
└── operations                   # Module 5 and integration operations
```

The React application does not write domain tables directly. React authenticates with Supabase Auth and calls Express. Express validates the user JWT, enforces the use case, and accesses PostgreSQL using module repositories.

## Shared physical conventions

### Identifiers

- Primary keys use `uuid` and are generated server-side/database-side.
- A student identity is `auth.users.id`; application tables reference it as `user_id`.
- Public URLs and logs use opaque IDs, never sequential identifiers.
- External identifiers such as O*NET codes remain alternate unique keys, not internal primary keys.

### Time

- All timestamps use `timestamptz` in UTC.
- Mutable rows use `created_at` and `updated_at`.
- Immutable rows use `created_at` only unless lifecycle state requires another timestamp.
- Expiring rows include an explicit `expires_at`.

### Naming

- PostgreSQL schemas, tables and columns use `snake_case`.
- Foreign keys use `<entity>_id`.
- Version identifiers use `<subject>_version`, such as `algorithm_version`.
- Boolean names start with `is_`, `has_`, `can_` or an unambiguous state phrase.

### State fields

Frequently evolving workflow states use `text` plus a `check` constraint during the POC. Stable scientific codes such as RIASEC letters also use constrained text. Native PostgreSQL enum types are avoided initially because changing them complicates migrations and rollback.

### Mutable versus immutable data

Immutable after completion:

```text
submitted assessment responses
assessment results
profile snapshots
recommendation runs and items
tool result audit snapshots
report snapshots
safety decisions
audit events
evaluation results
```

Mutable with guarded transitions:

```text
consent status while pending
assessment run progress
journey position
handoff operational status
privacy/background job status
catalog review status before publication
```

### JSONB policy

Use typed columns for fields that are filtered, joined, constrained, sorted, audited or reported independently. Use JSONB only for bounded versioned snapshots or provider payloads whose internal keys are validated by Zod.

Every JSONB contract must have:

- a schema/version field.
- a Zod schema in `packages/contracts`.
- size limits at the application boundary.
- fixtures and contract tests.

### Soft deletion

- `user_profiles.deleted_at` removes a student from normal access immediately.
- A privacy job performs hard deletion within the approved deadline.
- Catalog records are retired/versioned rather than deleted when already referenced by results.
- Safety retention exceptions require approved policy and remain outside general application access.

## Cross-module contract rule

Modules exchange DTOs and stable IDs through Express/application ports. They do not import another module's repository or query its private tables directly.

| Producer | Output                                               | Consumers              |
| -------- | ---------------------------------------------------- | ---------------------- |
| Module 1 | `ProfileSnapshot`                                    | Modules 2, 4, 5        |
| Module 3 | Catalog records and `RetrievedEvidence`              | Modules 2, 4, 5        |
| Module 2 | `RecommendationSet` and plan                         | Modules 4, 5           |
| Module 4 | `AssistantTurn`, journey events, `ReportSnapshot`    | React, Module 5        |
| Module 5 | `SafetyDecision`, `HandoffPacket`, evaluation report | Module 4, staff UI, CI |

Cross-schema foreign keys are permitted for stable immutable identities such as `profile_snapshot_id` and catalog entity IDs. Runtime code still accesses those records through the owning module.

## Data classification

| Class              | Examples                                           | Default control               |
| ------------------ | -------------------------------------------------- | ----------------------------- |
| Public catalog     | Published career title, pathway description        | Read through approved API     |
| Internal           | Algorithm configuration, unpublished catalog draft | Backend only                  |
| Student personal   | Name, city, age band                               | Student/authorized staff only |
| Student assessment | Responses, results, recommendations                | Student/authorized staff only |
| Guardian personal  | Phone hash/last four, consent record               | Consent service only          |
| Safety restricted  | Trigger excerpt, tier, handoff context             | Restricted staff role/schema  |
| Operational        | Hashes, durations, non-PII funnel events           | Backend/operations            |

## Security baseline

- No service-role key or database credential is exposed to React.
- Internal schemas are not exposed through the Supabase Data API by default.
- Any future directly exposed view/function requires grants plus RLS review.
- Express uses least-privilege database roles per environment.
- Phone numbers, OTPs, raw messages and secrets never appear in general logs.
- Staff access and safety packet reads are audited.
- Storage buckets for reports/share assets are private unless an asset is deliberately public.

## Migration convention

Supabase migration files remain one ordered chain:

```text
supabase/migrations/
├── <timestamp>_m1_assessment_core.sql
├── <timestamp>_m3_knowledge_core.sql
├── <timestamp>_m2_recommendation_core.sql
├── <timestamp>_m4_counselor_core.sql
└── <timestamp>_m5_safety_operations_core.sql
```

Each module owns migrations for its schema. Altering another module's table requires both owners and the integration owner. A clean `supabase db reset` plus seed must pass before merge.

## Recommended design and migration order

```text
Shared extensions and roles
        ↓
Module 1 assessment identity/profile foundations
        ↓
Module 3 verified knowledge catalog
        ↓
Module 2 recommendations and plans
        ↓
Module 4 conversations and reports
        ↓
Module 5 safety, audit, privacy and evaluation
        ↓
Cross-module constraints, views and integrated fixtures
```

Module 2 may build pure matching code against Module 1/3 fixtures before their physical migrations are integrated. Module 4 may build against fixtures for all upstream outputs.

## Design status meanings

| Status             | Meaning                                                     |
| ------------------ | ----------------------------------------------------------- |
| Proposed           | Needs domain-owner review                                   |
| Frozen for Phase A | Backend POC may implement it                                |
| Phase A only       | Deliberate simplification; not proof of full PRD compliance |
| Open P0            | Must be resolved before Phase 1 launch claim                |
| Deferred           | Extension point retained, no current implementation         |

## Review gate before SQL

No module should write production Supabase migrations until its document has passed:

1. Domain-owner review.
2. Input/output contract review.
3. Privacy and access review.
4. Cross-module foreign-key review.
5. State-transition review.
6. Retention/deletion review.
7. Fixture and test-vector review.
8. Integration-owner approval.
