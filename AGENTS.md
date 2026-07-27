# YuvaNext Backend Agent Guide

## Current scope

This repository is the shared backend-only implementation for the YuvaNext Phase A career-counseling POC. Do not create the React product frontend in this phase. The only UI included now is the API testing/documentation UI exposed by Express.

## Source-of-truth order

1. `docs/reference/prd-phase1.md.docx` — product requirements.
2. `docs/data-model/yuvanext-data-model-decisions-v1.md` — frozen and open data decisions.
3. `docs/data-model/yuvanext-phase-a-mvp.dbml` — complete Phase A ERD.
4. The assigned module's detailed data model, DBML and storage-flow document.
5. The assigned module POC specification under `docs/poc`.

If two documents conflict, stop and raise the conflict. Do not silently invent assessment questions, scoring weights, safety copy, eligibility rules or tie-break logic.

## Architecture

- `apps/api` is the thin Express composition root.
- `packages/contracts` owns shared Zod schemas and API types.
- Domain logic belongs in the module package, never in route handlers.
- Repository code owns SQL; domain code must not depend on Express or Supabase clients.
- Module packages communicate through contracts/ports, not another module's repository.
- React/browser clients must never receive the service-role key or database URL.

## Module ownership

| Module              | Owned package                            | Primary docs                                                                      |
| ------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| 1 Assessment        | `packages/assessment`                    | `docs/poc/module-1-user-profile-assessment.md`, `docs/data-model/module-1-*`      |
| 2 Recommendations   | `packages/recommendations`               | `docs/poc/module-2-recommendation-planning.md`, `docs/data-model/module-2-*`      |
| 3 Knowledge         | `packages/knowledge`                     | `docs/poc/module-3-grounded-knowledge.md`, `docs/data-model/module-3-*`           |
| 4 Counselor         | `packages/counselor`                     | `docs/poc/module-4-ai-counselor-experience.md`, `docs/data-model/module-4-*`      |
| 5 Safety/Evaluation | `packages/safety`, `packages/evaluation` | `docs/poc/module-5-safety-evaluation-operations.md`, `docs/data-model/module-5-*` |

## Frozen implementation rules

- Use `user_profiles`, `journey_sessions` and `journey_session_id`; do not reintroduce `student_*` schema names.
- Store full state/UT text in `state`; do not add a fixed South-state-code union.
- RIASEC scoring and recommendation ranking are deterministic TypeScript, never LLM-generated.
- RAG/pgvector is excluded from Phase A.
- The hosted database is changed only through committed files in `supabase/migrations`.
- Every retryable write accepts an idempotency key.
- Swagger UI is shared at `/docs`; add every public endpoint to the OpenAPI registry.

## Required checks

Before handing off a change, run:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Do not commit `.env`, service-role keys, database passwords, access tokens or real user data.
