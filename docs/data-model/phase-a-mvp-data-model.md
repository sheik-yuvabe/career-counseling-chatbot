# YuvaNext Phase A MVP Data Model

## 1. Purpose

This document defines the database tables implemented for the YuvaNext Phase A MVP. The five module data-model documents remain the target design for the complete product.

The MVP is a strict subset of the target model:

- An included table keeps the same schema name, table name, responsibility and relational boundary as the target model.
- No MVP table combines data that belongs to multiple target tables.
- A deferred table is added later without splitting or reshaping an MVP table.
- Versioned fixtures may provide configuration, but durable runtime records retain the target model's version identifiers and foreign-key structure.

Supabase `auth.users` is a shared external identity table and is not included in the project-owned count.

## 2. Scope summary

| Module                  | Target | Phase A MVP | Deferred |
| ----------------------- | -----: | ----------: | -------: |
| Assessment              |     17 |          15 |        2 |
| Recommendation          |     11 |          10 |        1 |
| Knowledge               |     20 |          18 |        2 |
| AI Counselor            |     10 |          10 |        0 |
| Safety and Operations   |     16 |          16 |        0 |
| **Total project-owned** | **74** |      **69** |    **5** |

The Phase A product scope already includes assessment versioning, plans, all catalog categories, grounded AI, safety handoff, privacy operations and evaluation history. Consequently, most target tables are also MVP tables.

## 3. Inclusion test

A target table is included when at least one condition is true:

1. A Phase A user flow writes or reads it.
2. An MVP table has a required foreign key to it.
3. It is required to replay a deterministic assessment or recommendation.
4. It protects consent, safety, privacy or staff authorization.
5. It records evidence needed by an MVP acceptance or evaluation test.

A table is deferred only when its feature is not active and no included table requires it.

## 4. Module 1: Assessment

### Included — 15 tables

| Table                                 | Phase A responsibility                                  |
| ------------------------------------- | ------------------------------------------------------- |
| `assessment.user_profiles`            | Platform user identity projection and routing fields    |
| `assessment.journey_sessions`         | Resumable product journey session                       |
| `assessment.guardian_consents`        | Versioned consent ledger for minors                     |
| `assessment.intake_question_sets`     | Versioned segment-specific intake definition            |
| `assessment.intake_questions`         | Typed, ordered intake questions                         |
| `assessment.intake_answers`           | Version-aware student intake responses                  |
| `assessment.assessment_definitions`   | Stable instrument identity                              |
| `assessment.assessment_versions`      | Immutable approved instrument/scoring version           |
| `assessment.assessment_items`         | Versioned assessment questions                          |
| `assessment.assessment_item_options`  | Deterministic response values                           |
| `assessment.assessment_runs`          | Assessment attempt lifecycle and resume state           |
| `assessment.assessment_responses`     | One durable submitted response per run/item             |
| `assessment.assessment_results`       | Immutable deterministic instrument result               |
| `assessment.profile_snapshots`        | Immutable downstream profile contract                   |
| `assessment.profile_snapshot_results` | Links a profile snapshot to IP/WIP/other source results |

### Deferred — 2 tables

| Table                              | Reason                                                   | Activation condition                             |
| ---------------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| `assessment.anonymous_sessions`    | MVP requires authentication before durable journey state | A persistent pre-auth journey is enabled         |
| `assessment.retake_authorizations` | No staff-approved retake workflow in Phase A             | Authorized counselor retake workflow is approved |

`journey_sessions.anonymous_session_id` remains nullable. The foreign key to `anonymous_sessions` is added when that table is activated.

## 5. Module 2: Recommendation

### Included — 10 tables

| Table                                    | Phase A responsibility                             |
| ---------------------------------------- | -------------------------------------------------- |
| `recommendation.matching_configurations` | Immutable weights, tie rules and algorithm version |
| `recommendation.feasibility_rules`       | Deterministic reachability rules                   |
| `recommendation.recommendation_runs`     | Immutable, replayable recommendation execution     |
| `recommendation.recommendation_rings`    | Inner/middle/outer partition metadata              |
| `recommendation.recommendation_items`    | Ranked typed references to knowledge entities      |
| `recommendation.plan_templates`          | Approved segment/plan definitions                  |
| `recommendation.plan_template_steps`     | Ordered approved template actions                  |
| `recommendation.generated_plans`         | Immutable student plan                             |
| `recommendation.generated_plan_steps`    | Materialized deterministic plan steps              |
| `recommendation.missions`                | Explorer-safe missions derived from plans          |

### Deferred — 1 table

| Table                                 | Reason                                       | Activation condition                                    |
| ------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| `recommendation.counselor_priorities` | Phase A has no manually curated career boost | A reviewed, bounded priority-boost workflow is approved |

MVP recommendation rows use the target model's explicit career/pathway/stream/college/aid foreign keys. A generic polymorphic target column is not used.

## 6. Module 3: Knowledge

### Included — 18 tables

| Table                                | Phase A responsibility                          |
| ------------------------------------ | ----------------------------------------------- |
| `knowledge.knowledge_sources`        | Approved source identity and trust metadata     |
| `knowledge.dataset_versions`         | Immutable import/version record                 |
| `knowledge.careers`                  | Stable published career identity and summary    |
| `knowledge.career_interest_profiles` | Career RIASEC vector for deterministic matching |
| `knowledge.career_value_profiles`    | Career work-value vector for WIP matching       |
| `knowledge.career_profiles`          | Reviewed salary, skills and progression details |
| `knowledge.education_routes`         | Controlled education-route vocabulary           |
| `knowledge.pathways`                 | Reviewed education/career pathways              |
| `knowledge.career_pathways`          | Career-to-pathway relationship                  |
| `knowledge.stream_options`           | Stable school-stream choices                    |
| `knowledge.stream_maps`              | Versioned top-two RIASEC map header             |
| `knowledge.stream_map_items`         | Ordered stream choices per map                  |
| `knowledge.colleges`                 | Verified institution records                    |
| `knowledge.disciplines`              | Controlled discipline vocabulary                |
| `knowledge.college_programs`         | Programs offered by institutions                |
| `knowledge.pathway_disciplines`      | Pathway-to-discipline ranking map               |
| `knowledge.aid_schemes`              | Verified aid/scholarship facts                  |
| `knowledge.aid_criteria`             | Structured known/unknown eligibility evidence   |

### Deferred — 2 tables

| Table                           | Reason                                                                 | Activation condition                            |
| ------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `knowledge.entity_source_links` | MVP publishes each record through one primary dataset version          | Multi-source field-level provenance is required |
| `knowledge.narrative_documents` | Phase A uses structured catalog retrieval without RAG/narrative search | Reviewed narrative retrieval is enabled         |

No RAG embeddings or vector tables are included in Phase A.

## 7. Module 4: AI Counselor

### Included — 10 tables

| Table                              | Phase A responsibility                             |
| ---------------------------------- | -------------------------------------------------- |
| `counselor.conversations`          | Conversation lifecycle and model/prompt version    |
| `counselor.conversation_messages`  | Persisted user/assistant messages                  |
| `counselor.conversation_summaries` | Versioned bounded context summaries                |
| `counselor.tool_calls`             | Auditable bounded tool execution                   |
| `counselor.message_grounding`      | Enforceable entity/source citations                |
| `counselor.journey_states`         | One resumable journey position per student         |
| `counselor.journey_events`         | Append-only journey and mission-completion history |
| `counselor.exploration_events`     | Student exploration/compare/focus history          |
| `counselor.report_snapshots`       | Immutable report input and output snapshot         |
| `counselor.generated_assets`       | Private PDF/share-card asset metadata              |

All grounding remains relational. It is not embedded into message JSON for later extraction.

## 8. Module 5: Safety and Operations

### Included — 16 tables

| Table                                     | Phase A responsibility                              |
| ----------------------------------------- | --------------------------------------------------- |
| `safety_private.safety_policy_versions`   | Approved immutable safety policy version            |
| `safety_private.approved_safety_messages` | Reviewed non-AI safety responses                    |
| `safety_private.safety_rule_sets`         | Versioned rules/classifier configuration            |
| `safety_private.safety_events`            | Restricted immutable safety decisions               |
| `safety_private.handoffs`                 | Human escalation lifecycle                          |
| `safety_private.alert_deliveries`         | Alert-channel attempts and failure visibility       |
| `safety_private.handoff_actions`          | Append-only staff action history                    |
| `operations.staff_profiles`               | Authorized staff projection                         |
| `operations.staff_role_assignments`       | Auditable multi-role authorization                  |
| `operations.audit_events`                 | Append-only sensitive access/action audit           |
| `operations.privacy_jobs`                 | Export/deletion request lifecycle                   |
| `operations.privacy_job_steps`            | Module-by-module privacy job execution              |
| `operations.analytics_events`             | Allowlisted non-PII funnel/quality events           |
| `operations.evaluation_cases`             | Versioned synthetic/golden evaluation case metadata |
| `operations.evaluation_runs`              | CI/manual/release evaluation execution              |
| `operations.evaluation_results`           | Per-case deterministic and AI-quality results       |

These tables are part of the MVP because safety, privacy and evaluation are acceptance boundaries, not optional reporting features.

## 9. Cross-module relationship spine

```text
auth.users
  -> assessment.user_profiles
  -> assessment.journey_sessions
  -> assessment.guardian_consents

assessment.assessment_definitions
  -> assessment.assessment_versions
  -> assessment.assessment_items
  -> assessment.assessment_item_options

assessment.journey_sessions
  -> assessment.intake_answers
  -> assessment.assessment_runs
  -> assessment.assessment_responses
  -> assessment.assessment_results
  -> assessment.profile_snapshots
  -> assessment.profile_snapshot_results

knowledge.knowledge_sources
  -> knowledge.dataset_versions
  -> published career/pathway/stream/college/aid records

assessment.profile_snapshots + knowledge catalog + recommendation.matching_configurations
  -> recommendation.recommendation_runs
  -> recommendation.recommendation_rings
  -> recommendation.recommendation_items
  -> recommendation.generated_plans
  -> recommendation.generated_plan_steps
  -> recommendation.missions

auth.users
  -> counselor.conversations
  -> counselor.conversation_messages
  -> counselor.tool_calls
  -> counselor.message_grounding
  -> counselor.journey_states/events
  -> counselor.report_snapshots/assets

safety policy/rules/messages
  -> safety_private.safety_events
  -> safety_private.handoffs
  -> safety_private.alert_deliveries/actions

operations.staff_profiles/roles
  -> handoff actions and audit events

operations.privacy_jobs
  -> operations.privacy_job_steps

operations.evaluation_cases + operations.evaluation_runs
  -> operations.evaluation_results
```

## 10. Configuration and fixture rule

Seed data may originate as reviewed files, but an included target configuration table is populated during migration/seed and referenced by durable runtime rows.

| Data                         | Repository source            | Database destination                                             |
| ---------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| Assessment instruments/items | Versioned reviewed fixtures  | Assessment definition/version/item tables                        |
| Matching rules               | Versioned reviewed fixtures  | Matching configuration/feasibility tables                        |
| Plan templates               | Versioned reviewed fixtures  | Plan template/step tables                                        |
| Knowledge catalog            | Validated source datasets    | Knowledge publication tables                                     |
| Safety policy/messages/rules | Restricted reviewed fixtures | Safety policy/message/rule tables                                |
| Evaluation vectors           | Versioned synthetic fixtures | Evaluation case metadata; fixtures remain in the test repository |

Every durable result records the applicable algorithm, configuration, dataset, prompt, rule or policy version.

## 11. Migration order

```text
mvp_001_schemas_roles_and_staff
mvp_002_assessment_identity_consent_intake
mvp_003_assessment_instruments_runs_results
mvp_004_knowledge_sources_and_catalog
mvp_005_recommendation_configuration_and_outputs
mvp_006_counselor_conversations_grounding_and_reports
mvp_007_safety_policy_events_and_handoffs
mvp_008_privacy_analytics_and_evaluation
mvp_009_cross_schema_constraints_indexes_and_rls
mvp_010_reviewed_seed_data_and_contract_tests
```

Module migrations remain independently owned, but integration fixes the final ordering. No module should create all of its tables in one migration.

## 12. Freeze gates before SQL

1. Exact Phase A assessment instruments and scoring vectors.
2. RIASEC tie-breaking and numeric rounding rules.
3. Consent text, OTP provider and retention behavior.
4. Recommendation weights, feasibility rules and ring invariants.
5. Published knowledge sources, licenses and freshness thresholds.
6. Safety tiers, approved copy, handoff recipients and encryption policy.
7. Privacy export/deletion deadlines and retention exceptions.
8. JSONB schemas, maximum sizes and redaction rules.
9. Cross-schema foreign-key deletion behavior.
10. RLS/grant policy and backend database roles.

## 13. Visual models

Use the [combined Phase A MVP DBML](yuvanext-phase-a-mvp.dbml) for cross-module review. It contains all 69 project-owned tables and every field defined by the target module documents.

Use the detailed module view assigned to each owner for implementation review:

- [Module 1 Assessment](module-1-assessment-mvp.dbml)
- [Module 2 Recommendation](module-2-recommendation-mvp.dbml)
- [Module 3 Knowledge](module-3-knowledge-mvp.dbml)
- [Module 4 AI Counselor](module-4-counselor-mvp.dbml)
- [Module 5 Safety and Operations](module-5-safety-operations-mvp.dbml)

Module files contain complete owned tables plus key-only external stubs needed to render cross-module relationships. Import any DBML file into dbdiagram.io to inspect fields, primary keys, foreign keys, indexes and relationship lines interactively.

The DBML files are visualization artifacts generated together by `scripts/generate-data-model-dbml.ps1`. The target module documents remain authoritative for business rules, state transitions, privacy requirements and deferred behavior.

## 14. Change rule

Any change to MVP inclusion or a table boundary must update together:

1. this scope document;
2. the DBML visual source;
3. the owning target module document when the target itself changes;
4. TypeScript/Zod contracts;
5. Supabase migrations, seed data and tests.
