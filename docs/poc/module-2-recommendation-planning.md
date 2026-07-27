# Module 2 POC — Recommendation & Planning Engine

## Assignment outcome

Deliver a deterministic engine that converts a versioned user profile and verified catalog data into ranked careers, education routes, colleges, scholarships, ring maps, fit explanations, and plan templates without using an LLM.

## PRD coverage

- Primary: `US-15`, `US-32`, `US-35`, `US-36`.
- Supports: `US-12`, `US-13`, `US-16`, `US-17`, `US-23`, `US-30`, `US-34`.
- Canvas payloads: `CV-5`, `CV-6`, `CV-7`, `CV-8`, `CV-9`.

## Goals

- Prove exact matching math and deterministic ordering.
- Keep all verdicts, ranks, rings, and eligibility likelihood outside the AI layer.
- Produce explainable payloads that Module 4 can render without reinterpreting them.
- Preserve the exact input snapshot and algorithm/data versions for audit replay.

## Non-goals

- Catalog ingestion/source verification; owned by Module 3.
- Chat wording and radial-map drawing; owned by Module 4.
- Assessment scoring; owned by Module 1.
- Formal scholarship eligibility decisions or guarantees.

## Owned paths

```text
packages/recommendations/src/domain/
packages/recommendations/src/application/
packages/recommendations/src/infrastructure/
packages/recommendations/src/http/
apps/web/src/features/guidance/components/
packages/contracts/src/recommendations.ts
packages/test-fixtures/recommendations/
tests/test-vectors/matching/
```

## Integration boundary and conflict rules

- Consume `ProfileSnapshot` and catalog interfaces only through `packages/contracts`; never import Module 1 or Module 3 repositories.
- Export one `registerRecommendationRoutes()` entry point for the Express composition owner.
- Module 4 receives complete display payloads; it must not recalculate scores, sorting, eligibility likelihood, or ring membership.
- Module 2 may use Module 3 fixtures until the real catalog adapter passes contract tests.
- Changes to weights, rounding, fallback order, or output ordering require version increments and golden-fixture updates.
- Module 2 does not edit the global React router, Express bootstrap, shared contract barrel, or Module 3 datasets.

## Input contracts

- `ProfileSnapshot` from Module 1.
- Career, pathway, stream, college, aid, and career-profile records from Module 3.
- Versioned `MatchingConfig` from configuration storage.

```ts
type MatchingConfig = {
  weightsVersion: string;
  interestWeight: number;
  valuesWeight: number;
  feasibilityWeight: number;
  contextWeight: number;
  feasibilityLookupVersion: string;
  riasecTieOrder: ["R", "I", "A", "S", "E", "C"];
};
```

## Matching rules

### Career score

1. Normalize the student's RIASEC vector to 0–1.
2. Calculate Pearson correlation with the career O*NET vector.
3. Rescale interest fit with `(r + 1) / 2`.
4. Calculate values fit if WIP exists.
5. If values are missing, redistribute that weight to interest fit.
6. Look up feasibility from segment, marks band, and route reachability: `0.3`, `0.65`, or `1.0`.
7. Calculate context boost from curated/counselor-priority configuration.
8. Apply version 1 weights `.50/.20/.15/.15`.
9. Sort descending by final score; exact ties sort by normalized title ascending.

All intermediate values are returned in `fitExplanationData`. Floating-point rounding strategy must be fixed and tested.

### Career rings

- Request up to 18 ranked careers once.
- Inner 3–4: highest fit whose high-point letter equals the student's top letter.
- Middle 5–6: same domain or hexagon-adjacent top letters.
- Outer 5–6: second/third-code letters and cross-domain discoveries.
- Outer must include at least one vocational/diploma route and one unexpected pairing.
- If insufficient candidates exist, apply documented deterministic fallback rules; do not ask the LLM to fill gaps.

### College rings

- Rank by discipline intersection, then tier, then state proximity, then name.
- Inner 3–4: selected/home-state best matches.
- Middle 5–6: remaining in-state and strong neighboring-state choices.
- Outer 5–6: other southern states and access routes.
- Outer must include vocational/polytechnic/ITI and open-university options when present in the approved catalog.

### Scholarship rings

- Compare only stored/volunteered facts.
- Known matching facts increase likelihood.
- Unknown required facts push a scheme outward, never inward.
- Labels are `likely`, `check_conditions`, and `explore`; never `guaranteed`.
- Application links are copied from approved catalog fields only.

### Segment plans

- Explorer: stream suggestions and three safe exploration missions.
- Pathfinder: 3–5 pathway clusters with degree/exam/college and backup-route references.
- Launcher: ranked careers and a deterministic 90-day-plan template.
- Plan actions come from approved templates/data, not generated facts.

## Output contract

```ts
type RecommendationSet = {
  recommendationId: string;
  profileSnapshotId: string;
  kind: "career" | "stream" | "pathway" | "college" | "aid" | "plan";
  items: RecommendationItem[];
  rings?: {
    inner: RecommendationItem[];
    middle: RecommendationItem[];
    outer: RecommendationItem[];
  };
  algorithmVersion: string;
  weightsVersion: string;
  sourceDataVersions: Record<string, string>;
  inputHash: string;
  outputHash: string;
  createdAt: string;
};
```

Each item includes stable entity ID, title, fit score where allowed, route, ring reason, `fitExplanationData`, and verification/source references. Explorer display policy can hide percentage without deleting the underlying auditable score.

## POC database tables

- `recommendations`
- `recommendation_items` or a versioned JSONB payload
- `matching_configs`
- `plan_templates`
- Optional `counselor_priorities`

Recommendation rows are immutable. A recalculation creates a new recommendation set with new version references.

## API contract

```text
POST /api/v1/recommendations/careers
POST /api/v1/recommendations/streams
POST /api/v1/recommendations/pathways
POST /api/v1/recommendations/colleges
POST /api/v1/recommendations/aid
POST /api/v1/recommendations/plans
GET  /api/v1/recommendations/:id
POST /api/v1/recommendations/:id/replay
```

The replay endpoint is staff/test-only and proves that stored inputs/config/data versions reproduce the result hash.

## POC fixtures

Module 3 may not be ready, so this POC must start with:

- 18–30 synthetic careers across all RIASEC letters.
- At least three education-route levels.
- Five-state college fixtures with vocational and open routes.
- Central, state, CSR, institution, and meta aid fixtures.
- Explorer, Pathfinder, and Launcher profiles.
- Exact `TV-6` and `TV-7` fixtures from the PRD.

## Implementation sequence

1. Freeze profile/catalog/config input schemas.
2. Implement vector normalization, correlation, weighting, and rounding as pure functions.
3. Implement feasibility lookup and explanation data.
4. Add stable sorting and immutable recommendation persistence.
5. Implement career ring partition plus invariants.
6. Implement college and aid ranking/rings.
7. Add segment plan templates.
8. Expose APIs and replay/audit hashing.

## Required automated tests

### Unit/property

- `TV-6` exact career ranking.
- `TV-7` exact career rings.
- Same inputs/config/data produce identical JSON and hash.
- Input list ordering does not affect final ordering.
- Missing WIP redistributes weight correctly.
- Pearson correlation edge cases: constant vectors, negative correlation, and zero variance.
- Exact score ties resolve by title.
- Outer career ring invariants.
- Unknown scholarship facts never move inward.
- College priority order and selected-state recentering.

### Contract/integration

- Reject unknown profile/config versions.
- Reject unverified malformed catalog records.
- Persist profile snapshot ID and every version.
- Replay produces the same output hash.
- API cannot accept an LLM-provided fit score or ring assignment.

## POC demo script

1. Submit the `TV-6` profile and display intermediate scoring components.
2. Reorder the input career fixture and prove output is unchanged.
3. Render career inner/middle/outer JSON and explain each membership.
4. Select a different college state and show deterministic recentering.
5. Remove an income fact and demonstrate that an aid scheme moves outward.
6. Replay the saved recommendation and compare hashes.
7. Turn off any AI integration and show that every output still works.

## Acceptance criteria

- Zero Claude/LLM imports or calls.
- `TV-6` and `TV-7` pass exactly.
- All rankings and rings are reproducible.
- Each recommendation explains itself using stored calculation fields.
- Module 4 can render output without calculating rank or ring membership.
- Every named entity ID resolves through Module 3.

## Risks and production follow-ups

- Confirm exact normalization and floating-point rounding with the product/scoring owner.
- Complete counselor review of feasibility lookup values.
- Define fallback behavior when catalogs lack ring-invariant candidates.
- Validate fairness across segments, gender/category volunteered facts, routes, and states.
- Salary must remain excluded from matching.

## Handoff checklist

- Algorithm specification and version identifier.
- Pure function test coverage report.
- `TV-6`/`TV-7` fixtures and expected JSON.
- OpenAPI and generated client.
- Replay demonstration and hashes.
- Known catalog-quality dependencies listed for Module 3.
