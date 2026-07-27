# YuvaNext — Five-Module POC Master Plan

## Purpose

This directory contains independently assignable Proof of Concept specifications for YuvaNext. The POCs prove the highest-risk behavior and integration contracts before the full MVP is built.

For colleague ownership, branch rules, contract changes, and merge sequencing, use the [Collaboration and Integration Plan](../architecture/yuvanext-collaboration-integration-plan.md). This README defines what must be built; the integration plan defines how five people build it without creating five competing applications.

Backend database design is indexed in the [YuvaNext Data Model](../data-model/README.md). The [Data Model and Assessment Decisions v1](../data-model/yuvanext-data-model-decisions-v1.md) freeze register must be reviewed before physical Supabase migrations begin.

The selected implementation stack is:

- Frontend: React, Vite, TypeScript, React Router, TanStack Query, Zustand or XState, Tailwind CSS, Radix UI, Zod, Dexie.
- Backend: Node.js, Express 5, TypeScript in strict mode, Zod, OpenAPI, PostgreSQL, Drizzle ORM or Kysely, Redis, BullMQ, Pino.
- AI: Claude Messages API with typed application tools and SSE streaming.
- Tests: Vitest, Supertest, React Testing Library, Playwright, axe, and k6 or Locust.
- Analytics scripts: Python may be used later for psychometric analysis and data pipelines, but the runtime API remains Express.

## Why five separate files

Each module has a separate file so it can be assigned to a colleague and reviewed independently. This master file defines the contracts that no module may change unilaterally.

| Module | Specification                                                               | Primary output                                          |
| ------ | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1      | [User Profile & Assessment](module-1-user-profile-assessment.md)            | Versioned `ProfileSnapshot`                             |
| 2      | [Recommendation & Planning](module-2-recommendation-planning.md)            | Deterministic recommendation sets                       |
| 3      | [Grounded Knowledge Platform](module-3-grounded-knowledge.md)               | Verified catalog and retrieval tools                    |
| 4      | [AI Counselor & Student Experience](module-4-ai-counselor-experience.md)    | Grounded conversational journey and reports             |
| 5      | [Safety, Evaluation & Operations](module-5-safety-evaluation-operations.md) | Safety handoff, counselor operations, and quality gates |

## System relationship

```text
Module 1: identity + intake + assessment
                    │
                    ▼ ProfileSnapshot
Module 3: catalog ──┼──► Module 2: deterministic recommendations
                    │                    │
                    └────────────────────┤
                                         ▼
                         Module 4: AI counselor + student UI

Module 5: safety, audit, counselor operations, and evaluation across Modules 1–4
```

The architecture is not a simple linear chain:

- Module 2 consumes the profile from Module 1 and catalog data from Module 3.
- Module 4 consumes Modules 1–3 through typed APIs/tools.
- Module 5 receives events from all modules and can interrupt the student flow.
- The core journey must still work if the Claude API is unavailable.

## POC definition

A POC is complete only when it has:

1. Working code on the shared scaffold.
2. Real PostgreSQL migrations for owned tables.
3. Stable request/response schemas.
4. Synthetic seed data with no personal information.
5. Unit, API/contract, and module-level integration tests.
6. A repeatable demo script.
7. Documented limitations and explicit production follow-ups.
8. No unresolved TypeScript, lint, or test failures.

A static UI mock or a collection of API examples alone is not a completed POC.

## Canonical repository structure

```text
career-counseling-chatbot/
├─ apps/
│  ├─ web/
│  │  ├─ src/app/                  # composition only
│  │  ├─ src/features/             # module-owned UI adapters
│  │  ├─ src/components/           # shared UI only
│  │  ├─ src/lib/                  # generated client and app utilities
│  │  └─ tests/
│  └─ api/
│     ├─ src/app/                  # Express composition root
│     ├─ src/adapters/             # runtime adapters
│     ├─ src/jobs/                 # worker composition
│     ├─ src/server.ts
│     └─ tests/
├─ packages/
│  ├─ contracts/
│  ├─ assessment/
│  ├─ recommendations/
│  ├─ knowledge/
│  ├─ counselor/
│  ├─ safety/
│  ├─ evaluation/
│  ├─ ui/
│  ├─ config/
│  └─ test-fixtures/
├─ data/
│  ├─ raw/
│  ├─ seed/
│  └─ schemas/
├─ tests/
│  ├─ contract/
│  ├─ e2e/
│  ├─ load/
│  ├─ safety/
│  └─ test-vectors/
├─ docs/
├─ scripts/
└─ infra/
```

## Shared coding boundaries

Domain package structure:

```text
packages/<domain>/
├─ src/application/
├─ src/domain/
├─ src/infrastructure/
├─ src/http/
├─ src/index.ts
└─ tests/
```

Rules:

- Routes translate HTTP only; they do not contain business rules.
- Services coordinate use cases and transactions.
- Repositories contain database queries only.
- Deterministic calculations live in pure `rules` functions.
- Zod schemas are the runtime boundary and generate OpenAPI definitions.
- Shared public schemas are exported from `packages/contracts`.
- The frontend must not duplicate scoring or recommendation rules.
- `apps/api` imports and registers module routers; business rules do not live in the Express composition root.
- `apps/web/src/app` composes module-owned routes and providers; product features do not place logic in the root router.
- A module may depend on `contracts`, `config`, and approved upstream package interfaces. Circular domain-package imports are forbidden.

## Frozen shared types

```ts
type Segment = "explorer" | "pathfinder" | "launcher";
type ConsentStatus = "pending" | "granted" | "declined" | "expired";
type Confidence = "normal" | "soft";
type Instrument = "mini_ip" | "ip_60" | "photo_ip" | "wip" | "mini_ipip" | "aptitude";
type State = string; // Full state/UT text; normalization belongs to the lookup boundary.

type ApiError = {
  code: string;
  message: string;
  retry?: { allowed: boolean; afterSeconds?: number };
};

type EventEnvelope<T> = {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  userId?: string;
  sessionId?: string;
  payload: T;
};
```

The complete `ProfileSnapshot`, recommendation, tool, and safety schemas must be implemented in `packages/contracts` before the first integration merge.

## API and data conventions

- IDs are UUIDs.
- Timestamps are UTC ISO-8601; local conversion happens only in the UI.
- Every POST that may be retried accepts an idempotency key.
- Error bodies always use `ApiError`.
- Algorithms include `algorithmVersion`, `weightsVersion`, and source-data versions.
- Public endpoints are versioned under `/api/v1`.
- API schemas are generated into OpenAPI; frontend types/clients are generated from the same contract.
- Free-text and phone numbers must not appear in logs.
- `data/raw` is immutable. Reviewed import output goes to versioned files in `data/seed`.

## Branch and ownership rules

| Module | Branch                        | Primary owned paths                                                 |
| ------ | ----------------------------- | ------------------------------------------------------------------- |
| 1      | `poc/m1-profile-assessment`   | `packages/assessment`, identity/intake/assessment web features      |
| 2      | `poc/m2-recommendations`      | `packages/recommendations`, recommendation/guidance web features    |
| 3      | `poc/m3-knowledge`            | `packages/knowledge`, data ingestion and reviewed datasets          |
| 4      | `poc/m4-counselor-experience` | `packages/counselor`, chat/canvas/report web features               |
| 5      | `poc/m5-safety-operations`    | `packages/safety`, `packages/evaluation`, safety/staff web features |

The scaffold and `packages/contracts` need designated maintainers. Any public-schema, root-config, or cross-module migration change requires their review.

## User-story ownership matrix

| PRD stories     | Primary owner   | Required collaborators                            |
| --------------- | --------------- | ------------------------------------------------- |
| `US-01`–`US-05` | Module 1        | Module 5 reviews consent/privacy                  |
| `US-06`–`US-11` | Module 1        | Module 5 evaluates correctness                    |
| `US-12`–`US-13` | Module 4        | Modules 1–3 supply immutable facts                |
| `US-14`         | Module 1        | Module 5 audits override                          |
| `US-15`–`US-17` | Modules 2 and 4 | Module 3 supplies catalog/tools                   |
| `US-18`–`US-23` | Module 5        | All modules emit required events                  |
| `US-24`–`US-25` | Module 4        | Modules 1 and 3 supply approved localized content |
| `US-26`–`US-28` | Module 3        | Modules 2 and 5 validate freshness/use            |
| `US-29`–`US-30` | Module 1        | Module 5 enforces norming/evaluation gates        |
| `US-31`         | Module 5        | Modules 1 and 4 expose pilot instrumentation      |
| `US-32`         | Module 2        | Module 4 renders; Module 3 supplies records       |
| `US-33`         | Module 4        | Module 1 publishes journey events                 |
| `US-34`         | Module 3        | Module 2 supplies plan/fit; Module 4 renders      |
| `US-35`–`US-36` | Module 2        | Module 3 retrieves; Module 4 renders              |

## Integration order

### Gate 0 — Scaffold

- Workspace, linting, formatting, tests, Docker services, migrations, and CI are green.
- Shared enums, errors, events, and fixture factories exist.

### Gate 1 — Contract freeze

1. Module 1 publishes `ProfileSnapshot` and assessment-result schemas.
2. Module 3 publishes catalog/tool schemas.
3. Module 2 publishes recommendation and ring-map schemas.
4. Module 5 publishes safety-event and handoff schemas.
5. Module 4 consumes these schemas; it does not create alternate versions.

### Gate 2 — Module demos

Every module passes its own POC acceptance criteria with mocks for dependencies.

### Gate 3 — First integrated journey

```text
Onboarding → assessment → scoring → matching → grounded chat → report
```

### Gate 4 — Safety and degradation

- A safety trigger interrupts the integrated journey and creates a counselor queue item.
- Turning off Claude does not break onboarding, assessment, scoring, results, maps, or static recommendations.

## Shared CI gates

```text
format
  → lint
  → TypeScript typecheck
  → unit tests
  → contract tests
  → integration tests
  → frontend build
  → Playwright smoke tests
  → accessibility checks
  → dependency and secret scans
```

## Final POC demonstration

The combined POC must demonstrate:

1. Explorer minor with guardian consent and Mini-IP.
2. Pathfinder with word/photo choice, college rings, and aid exploration.
3. Launcher with ranked careers and 90-day plan.
4. Offline answer retry and cross-session resume.
5. Claude outage with static guidance.
6. Unsupported entity blocked by grounding enforcement.
7. Safety event, handoff queue, counselor packet, and audit trail.

## Explicit POC exclusions

- Production-scale college coverage.
- Full 335 reviewed career profiles.
- Full Tamil production release.
- Production OTP/alert vendor contracts.
- Locally normed aptitude bands.
- Complete payment, WhatsApp, school-code, parent-portal, or native-app features.

The POCs must preserve extension points for these items without pretending that they are production-complete.
