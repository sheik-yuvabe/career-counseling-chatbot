# Module 5 POC — Safety, Evaluation & Operations

## Assignment outcome

Deliver a cross-cutting safety and operations layer that can interrupt any journey, create human handoffs, provide a privacy-restricted counselor dashboard, reconstruct audited decisions, and continuously evaluate Modules 1–4.

## PRD coverage

- Primary: `US-18`–`US-23`, `US-31`.
- Cross-cutting: every user story's audit, privacy, accessibility, performance, and Definition of Done.
- Screens/widgets: `W-16`, `S-17`, `S-18`.

## Goals

- Prove safety detection, approved response delivery, alerting, and human queue behavior.
- Restrict counselor visibility according to flags and roles.
- Make recommendation and staff actions reconstructable.
- Establish automated evaluation gates for scoring, recommendation, retrieval, AI grounding, safety, privacy, accessibility, and performance.
- Demonstrate export/delete jobs and retention boundaries.

## Non-goals

- Clinical diagnosis or therapy.
- LLM-authored crisis/safety advice.
- Final production incident-response staffing.
- Full analytics warehouse or business-intelligence platform.
- Counselor editing of student scores/recommendations.

## Owned paths

```text
packages/safety/src/domain/
packages/safety/src/application/
packages/safety/src/infrastructure/
packages/safety/src/http/
packages/evaluation/src/
apps/web/src/features/safety/
apps/web/src/features/counselor/
packages/contracts/src/safety.ts
packages/contracts/src/audit.ts
tests/safety/
tests/load/
tests/evaluation/
```

## Integration boundary and conflict rules

- Safety exposes a synchronous pre-check port that Module 4 calls before general AI processing.
- Evaluation consumes public contracts, events, fixtures, and HTTP surfaces; it must not import private domain internals merely to make tests pass.
- Export `registerSafetyRoutes()`, `registerStaffRoutes()`, and evaluation commands for the composition owner.
- Cross-module test failures are reported to the owning module; Module 5 does not silently rewrite another module's implementation.
- Approved safety copy and tier rules are immutable, versioned inputs and cannot be edited through general prompt or UI work.
- Module 5 owns release gates, but threshold changes require product/safety approval and a documented decision record.

## Safety architecture

```text
Student input/event
  → deterministic keyword/rule pre-check
  → approved classifier where configured
  → tier decision
  → tier? freeze/pause current flow
  → render approved SAFETY.md copy
  → create safety event + handoff packet
  → queue by priority
  → Tier 1 immediate alert
  → counselor action + audit
```

The final tier logic and copy must come from the authoritative `SAFETY.md`. Until that file exists, the POC uses clearly marked synthetic approved fixtures and cannot claim launch readiness.

## Safety rules

- Safety check occurs before sending text to the general counselor model.
- Assessment position is saved when interrupted.
- Tier 1 keeps the support flow in focus.
- Tier 2/3 continuation follows `SAFETY.md` only.
- Approved helpline URLs/numbers are configuration, never model output.
- Safety events use a restricted database role/schema.
- General analytics record tier only, not message text.

## Handoff contract

```ts
type HandoffPacket = {
  handoffId: string;
  user: { firstName: string; ageBand: string; segment: Segment };
  profile: { resultId?: string; code?: string; confidence?: Confidence };
  trigger: {
    reason: "user_request" | "tier1" | "tier2" | "tier3" | "low_confidence";
    excerpt?: string;
    occurredAt: string;
  };
  lastTurns?: Array<{ role: string; content: string }>;
  planState?: Record<string, unknown>;
  consentedContactAvailable: boolean;
  status: "queued" | "alerted" | "actioned";
};
```

`lastTurns` is included only for safety/handoff reasons and is accessed only by authorized counselor roles.

## Counselor dashboard

### Authentication and authorization

- Separate staff account and route.
- Password plus TOTP for POC.
- Roles: counselor, supervisor, and auditor.
- Every login, packet view, export, and queue action is audit-logged.

### Session list

- Date, first name, age band, segment, code, instruments, completion, and flags.
- Filters by date, segment, confidence, handoff, and tier.
- Search by phone last four only if permitted and implemented without exposing full phone.

### Packet

- Intake summary, profile results, confidence, and recommendations.
- Recommendation versions/hashes.
- Conversation excerpts only when a qualifying flag exists.
- No editing of results or recommendations.

### Queue

- Tier 1 before Tier 2/3, then timestamp.
- Immediate-alert status.
- Mark-as-actioned is the only required write action.
- Action requires note/category as defined by policy and writes a separate immutable audit record.

## Audit model

Audit entries contain actor, action, target type/ID, timestamp, request correlation ID, and safe metadata. They do not contain tokens, full phone numbers, OTPs, or unnecessary conversation text.

Recommendation reconstruction consumes Module 2's profile snapshot ID, weights/config version, dataset versions, input hash, output hash, and tool-result hashes.

## Privacy jobs

### Export

- Verify requester authorization.
- Assemble eligible student data into a portable file.
- Store privately with expiry.
- Audit creation and access.

### Delete

- Create deletion job and deadline.
- Soft-delete immediately from normal access.
- Hard-delete cascade within 72 hours.
- Retain only policy-approved safety records and de-identified counters.
- Record completion without retaining erased personal content.

BullMQ jobs must be idempotent and retryable with failed-job visibility.

## Evaluation framework

Evaluation is a test matrix, not the final step after AI.

| Layer    | POC evaluation                                           | Required signal            |
| -------- | -------------------------------------------------------- | -------------------------- |
| Module 1 | Scoring vectors, consent, resume, idempotency            | Exact correctness          |
| Module 2 | Ranking/ring determinism and fairness invariants         | Exact hashes/invariants    |
| Module 3 | Retrieval grounding, source/freshness, ingestion quality | Traceable records          |
| Module 4 | Tool choice, entity grounding, degradation, privacy      | No unsupported facts       |
| Safety   | Tier recall, approved copy, queue/alert                  | 100% red-team suite target |
| Product  | E2E completion, accessibility, latency, load             | PRD thresholds             |

### Evaluation case format

```ts
type EvaluationCase = {
  caseId: string;
  category: string;
  input: unknown;
  fixtureVersions: Record<string, string>;
  expected: unknown;
  assertions: string[];
  owner: string;
  severity: "blocking" | "warning";
};
```

Results are machine-readable and produce a human summary. A model-graded assertion cannot be the only gate for safety or deterministic correctness.

## POC database tables

- `staff`
- `staff_sessions`
- `safety_events`
- `handoffs`
- `handoff_actions`
- `audit_log`
- `privacy_jobs`
- `analytics_events`
- `evaluation_runs`
- `evaluation_results`

## API contract

```text
POST /api/v1/internal/safety/check
POST /api/v1/internal/handoffs
GET  /api/v1/staff/sessions
GET  /api/v1/staff/packets/:userId
GET  /api/v1/staff/queue
POST /api/v1/staff/queue/:id/action
POST /api/v1/privacy/export
POST /api/v1/privacy/delete
GET  /api/v1/privacy/jobs/:id
POST /api/v1/internal/evaluations/run
GET  /api/v1/internal/evaluations/:id
```

Reduced POC request-body rules:

- Safety check accepts sourceEventId and message; Module 5 resolves relational context from the persisted counselor message.
- Handoff creation accepts sourceEventId and idempotencyKey; Module 5 reconstructs the handoff packet from related records.
- Staff reads have no body; staff identity and role come from the bearer token and operations staff tables.
- Queue action accepts actionCategory, note and idempotencyKey; actor, action type, time and correlation are server-owned.
- Privacy export/delete accept idempotencyKey; the authenticated requester and server metadata are derived.
- Evaluation run accepts runType and idempotencyKey; environment, revision, fixtures, time and correlation are server-owned.

## Analytics

POC events use the PRD's privacy-first funnel names. Event payloads contain segment, instrument, state-machine step, counts, durations, and tier where required—not PII or answer content.

Provide a minimal funnel view:

```text
landing → OTP → consent → intake → assessment → reveal → recommendation → share
```

## Implementation sequence

1. Freeze safety-event/handoff/audit contracts.
2. Add restricted tables and database access roles.
3. Implement synthetic safety rules and approved-copy registry.
4. Add journey-interrupt event and alert adapter.
5. Implement staff auth/RBAC and counselor list/packet/queue.
6. Add privacy export/delete workers.
7. Create evaluation-case runner and reports.
8. Add accessibility/load/grounding/safety suites to CI.
9. Integrate events from Modules 1–4.

## Required automated tests

### Safety

- Every synthetic Tier 1/2/3 phrase maps to expected tier.
- Normal career questions do not false-trigger in the fixture suite.
- Approved copy matches registry exactly.
- Tier 1 creates immediate alert and highest-priority queue item.
- Interrupt pauses/saves assessment state.
- Model output cannot overwrite tier or safety copy.

### Authorization/privacy

- Student cannot access staff routes.
- Counselor sees permitted packet; unflagged conversation excerpts are absent.
- Auditor cannot action a queue item if role forbids it.
- Every packet view/action creates an audit entry.
- Export authorization and link expiry.
- Delete job is idempotent and honors retention exceptions.

### Evaluation/operations

- Broken scoring fixture blocks the pipeline.
- Hallucinated entity test blocks the pipeline.
- Missing safety-copy key blocks release.
- Accessibility violations fail the configured gate.
- Load test reaches 200 concurrent synthetic students in the integrated environment.

## POC demo script

1. Run a normal message and show no safety event.
2. Run synthetic Tier 3, Tier 2, and Tier 1 cases.
3. Show flow freeze, approved response, queue priority, and immediate Tier 1 alert adapter.
4. Sign in as counselor with TOTP, inspect a permitted packet, and action the queue.
5. Show audit entries for view and action.
6. Open an unflagged packet and prove conversation excerpts are hidden.
7. Request export/delete and show job lifecycle.
8. Run evaluation suite and display module-by-module pass/fail report.

## Acceptance criteria

- Safety response content never comes from the LLM.
- Tier ordering, alerts, and action logs are correct.
- Conversation excerpts are protected by flag and role.
- Every staff-sensitive action is audited.
- Evaluation covers Modules 1–4 rather than only AI output.
- Blocking fixture failure produces a non-zero CI result.

## Risks and production follow-ups

- Obtain final signed `SAFETY.md` and replace synthetic copy/rules.
- Confirm counselor staffing, response SLAs, and alert channels.
- Conduct legal review of safety-event retention and deletion exceptions.
- Calibrate safety classifier with counselor-reviewed multilingual data.
- Define incident response, backup, restore, and breach processes.

## Handoff checklist

- Safety rule/copy registry and version.
- Red-team fixtures and coverage report.
- RBAC matrix.
- Audit-event catalog.
- Privacy job lifecycle/retention document.
- Evaluation report and CI instructions.
- Counselor demo recording and unresolved policy dependencies.
