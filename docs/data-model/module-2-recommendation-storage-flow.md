# Module 2 Recommendation Storage Flow

## Purpose

This is the Phase A implementation walkthrough. For every field and constraint, use [Module 2 data model](module-2-recommendation-data-model.md) and [Module 2 MVP DBML](module-2-recommendation-mvp.dbml).

Module 2 converts a frozen Module 1 profile snapshot and published Module 3 catalog data into deterministic rankings and plans. AI does not calculate scores, ranks, rings or eligibility.

## Example input

```text
user                         Anandi
profile_snapshot_id          ps-001
segment                      explorer
RIASEC code                  IAS
state                        Tamil Nadu
recommendation kind          career
```

The profile payload remains owned by `assessment.profile_snapshots`. Module 2 stores its ID and the exact calculation versions.

## Career recommendation flow

```text
POST /api/v1/recommendations/careers
  -> authorize user
  -> read profile snapshot, active matching configuration and published careers
  -> calculate deterministic fit scores
  -> create recommendation_runs, recommendation_rings and recommendation_items
  -> finalize hashes
  -> return RecommendationSet
```

### 1. Create the run

`recommendation.recommendation_runs` records one calculation request.

```text
id                         rr-career-001
user_id                    anandi-user-id
profile_snapshot_id        ps-001
kind                       career
configuration_id           career-match-v1-id
algorithm_version          career-fit-v1
source_data_versions_json  {"careers":"2026-a"}
status                     running
input_hash                 sha256(...)
```

### 2. Calculate candidates

Express reads:

- `assessment.profile_snapshots` for RIASEC and intake context.
- `recommendation.matching_configurations` for weights and tie order.
- `recommendation.feasibility_rules` for reachable-route rules.
- Module 3 career interest/value profiles for candidate vectors.

The calculation runs in deterministic TypeScript. No LLM score is accepted.

### 3. Store rings and items

`recommendation_rings` stores the inner, middle and outer groups. `recommendation_items` stores one row per ranked entity.

```text
recommendation_run_id  rr-career-001
career_id              career-data-scientist-id
rank                   1
fit_score              0.842500
interest_fit           0.880000
feasibility_score      0.750000
ring_id                inner-ring-id
fit_explanation_json   approved calculation evidence
```

Exactly one catalog foreign key is populated. A career item cannot also reference a college or aid scheme.

### 4. Finalize atomically

After every item and ring passes validation:

```text
status        completed
output_hash   sha256(...)
completed_at  timestamp
```

On failure the run becomes `failed`; partial rankings are not returned.

## Other recommendation kinds

| Kind      | Important reads                            | Stored reference   |
| --------- | ------------------------------------------ | ------------------ |
| `stream`  | profile, stream maps/options               | `stream_option_id` |
| `pathway` | profile, pathways/routes                   | `pathway_id`       |
| `college` | selected pathway, colleges/programs, state | `college_id`       |
| `aid`     | volunteered facts, schemes/criteria        | `aid_scheme_id`    |

Each kind gets a separate run. Unknown aid facts remain unknown and never become assumed eligibility.

## Plan generation flow

```text
user selects a recommended entity
  -> read approved plan_templates and plan_template_steps
  -> create generated_plans and generated_plan_steps
  -> optionally create explorer-safe missions
  -> return immutable Plan DTO
```

Mission completion is recorded later as Module 4 journey events; the generated plan is not mutated.

## API and database calls

One API request can insert the run, rings and many items in one PostgreSQL transaction. Multiple rows do not require multiple frontend requests.

## Output and replay rules

- Module 4 receives the completed DTO and must not recalculate ranks.
- New configuration/catalog versions create new runs; history is never edited.
- Completed runs and items are immutable.
- Stored versions must reproduce the same output hash.
- No raw assessment responses or chat messages are stored here.
