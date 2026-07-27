# Module 1 POC — Student Profile & Assessment Platform

## Assignment outcome

Deliver a working onboarding-to-result vertical slice that creates a verified user profile, handles guardian consent where required, delivers an assessment reliably, and produces a deterministic versioned result without using AI.

## PRD coverage

- Primary: `US-01`–`US-11`, `US-14`.
- Supports: `US-13`, `US-22`, `US-29`, `US-30`, `US-33`.
- Screens/widgets: `S-01`, `S-02`, `S-03`, `W-05`, `W-06`, `W-07`, initial `S-15`.

## Goals

- Prove identity, consent, intake, assessment, scoring, offline retry, and resume boundaries.
- Produce a stable `ProfileSnapshot` consumed by Modules 2, 4, and 5.
- Demonstrate that scoring is testable and independent of Claude.
- Prevent persistence of a minor's assessment responses until guardian consent is granted.

## Non-goals

- Career recommendations, colleges, scholarships, or 90-day plans.
- Free-form AI conversation.
- Production SMS-provider selection.
- Full locally normed aptitude battery.
- Counselor dashboard.

## Owned paths

```text
packages/assessment/src/domain/
packages/assessment/src/application/
packages/assessment/src/infrastructure/
packages/assessment/src/http/
apps/web/src/features/identity/
apps/web/src/features/intake/
apps/web/src/features/assessment/
packages/contracts/src/profile.ts
packages/contracts/src/assessment.ts
tests/test-vectors/assessment/
```

## Integration boundary and conflict rules

- Export one `registerAssessmentRoutes()` entry point for the Express composition owner.
- Export assessment UI routes through the module feature index; do not edit the root React router directly.
- Publish `ProfileSnapshot` fixtures before Module 2 or Module 4 begins integration.
- Module 1 owns scoring behavior but not the shared contract barrel, Express server bootstrap, root migration runner, or global UI shell.
- Contract changes require a compatibility note, updated fixtures, and approval from the contract maintainer plus affected consumers.
- Module 1 must not import recommendation, knowledge, counselor, safety, or evaluation implementations.

## Required user flow

```text
Landing
  → name, age, city, state, country
  → under 12? friendly no-save stop
  → phone OTP
  → segment route using age + self-stage
  → minor? guardian consent request
  → segment intake
  → assessment selection
  → batches + progress + response capture
  → QC/tie-break if required
  → deterministic scoring
  → versioned result + ProfileSnapshot
```

## Backend components

### Identity service

- Creates anonymous sessions with no durable personal profile.
- Validates Indian phone input after canonicalization.
- Requests/verifies OTP through `SmsProvider`.
- Applies 5-minute expiry, 3 verification attempts, 30-minute lock, 30-second resend delay, and maximum 3 resends.
- Merges the anonymous session into the verified account transactionally.
- Issues short-lived access and refresh credentials using the agreed auth strategy.

POC provider interface:

```ts
interface SmsProvider {
  sendStudentOtp(input: { phone: string; code: string; expiresInSeconds: number }): Promise<void>;
  sendGuardianOtp(input: { phone: string; code: string; explanation: string }): Promise<void>;
}
```

The POC uses a development provider that exposes OTP codes only in local test output, never in normal application logs.

### Routing and intake service

- Implements age boundaries 12, 13, 14, 16, 17, 18, and 19.
- Self-described stage overrides age while retaining both values.
- Returns versioned questions for Explorer 5, Pathfinder 7, and Launcher 9.
- Enforces allowed chip values server-side.
- Supports “Prefer not to say” on sensitive questions.
- Captures marks bands rather than exact marks.

### Consent service

- Rejects a guardian number equal to the student number.
- Records guardian phone using the approved protected representation.
- Stores consent text version, status, and timestamp.
- Exposes a polling/status endpoint.
- Emits `consent.granted`, `consent.declined`, and `consent.expired` events.
- Does not accept minor response persistence while consent is pending.

### Assessment delivery service

- Filters active items by instrument, age band, and approved language variant.
- Maintains fixed order and batch size: Explorer 5, others 10.
- Injects QC items at required positions.
- Supports photo-pair and MCQ item types without changing the response envelope.
- Returns exact progress and the next unanswered item/batch.
- Treats `(userId, resultVersion, itemId)` as an idempotency boundary.

### Scoring service

Pure functions implement:

- RIASEC sums with QC exclusion.
- QC confidence rule.
- Rank 3/4 tie-break decision.
- Final fixed-order fallback `R > I > A > S > E > C`.
- WIP normalization and forced-choice bounds.
- Big Five reverse scoring and bands.
- Photo quiz `+2` rule.
- Aptitude sample subtype raw totals and POC display rules.

The service accepts validated responses and returns a result. It must not read conversations or call Claude.

## POC database tables

Minimum tables/migrations:

- `users`
- `consents`
- `sessions`
- `intake_answers`
- `assessment_items`
- `assessment_runs`
- `responses`
- `results`
- `otp_challenges` may be Redis-backed instead of PostgreSQL

Important constraints:

- Unique response per assessment-run/item.
- Result has instrument, scores JSON, code, confidence, algorithm version, result version, and timestamp.
- Intake answer stores question version.
- Soft-deleted user is excluded from normal queries.

## API contract

```text
POST /api/v1/sessions/anonymous
POST /api/v1/auth/otp/request
POST /api/v1/auth/otp/verify
POST /api/v1/consents/guardian
POST /api/v1/consents/guardian/verify
GET  /api/v1/consents/status
GET  /api/v1/intake/questions?segment=
POST /api/v1/intake/answers
GET  /api/v1/assessments/next?instrument=
POST /api/v1/assessments/responses
POST /api/v1/assessments/score
GET  /api/v1/results
GET  /api/v1/profile/snapshot
```

Every retryable response POST accepts `Idempotency-Key`.

## ProfileSnapshot handoff

```ts
type ProfileSnapshot = {
  snapshotId: string;
  userId: string;
  firstName: string;
  ageBand: string;
  city: string;
  state: string;
  segment: Segment;
  selfStage: string;
  wantsAid: boolean;
  intakeSummary: Record<string, unknown>;
  riasec?: {
    scores: Record<"R" | "I" | "A" | "S" | "E" | "C", number>;
    code: string;
    confidence: Confidence;
    instrument: Instrument;
  };
  values?: { normalized: Record<string, number>; topTwo: string[] };
  bigFive?: Record<string, { score: number; band: "low" | "mid" | "high" }>;
  aptitude?: Record<string, { raw: number; displayBand?: string }>;
  profileVersion: number;
  algorithmVersion: string;
  createdAt: string;
};
```

## Frontend requirements

- Landing and conversational pre-OTP details.
- OTP modal states: entry, sent, invalid, locked, success.
- Guardian states: requested, pending, granted, declined/expired.
- Persistent pending-consent banner.
- Intake chips with keyboard navigation.
- Likert/photo/MCQ assessment widgets.
- Progress header with pause action.
- Read-only display of previous batches.
- Offline toast and visible sync state.
- Resume message and exact restored progress.

Pending minor answers use IndexedDB with explicit expiry metadata. They are flushed only after consent and deleted on decline, expiry, logout, or restart.

## Implementation sequence

1. Publish contracts and fixture factories.
2. Add identity/session migrations and mock SMS provider.
3. Implement routing and versioned intake.
4. Add consent state machine and pending storage rules.
5. Add item ingestion and assessment-run state machine.
6. Implement pure scoring functions and test vectors.
7. Add offline queue and resume UI.
8. Add API integration and E2E paths.

## Required automated tests

### Unit

- Every age boundary and stage override.
- OTP expiry, attempts, resend, and lock.
- Guardian/student-number rejection.
- Consent transition matrix.
- Batch sizing and QC position rules.
- All scoring test vectors `TV-1`–`TV-5`.
- Tie determinism and QC-soft behavior.
- Retake cooldown boundary at 89/90/91 days.

### API/contract

- Anonymous data cannot be retrieved as a verified profile.
- OTP merge is transactional and idempotent.
- Pending minor response is rejected from durable persistence.
- Duplicate answer retry does not create another row.
- Resume returns exact next unanswered item.

### Frontend/E2E

- Explorer minor pending → local answers → guardian approval → server flush.
- Guardian decline → local purge.
- Adult Launcher OTP → intake → assessment → result.
- Simulated offline/reconnect without duplicate answers.
- Pause and resume in a fresh browser context.

## POC demo script

1. Enter an under-12 age and show the no-save stop.
2. Start a 15-year-old Explorer, verify OTP, and request guardian consent.
3. Continue two batches while guardian status is pending and disconnect the network during one batch.
4. Reconnect, approve guardian consent, and show queued answers syncing once.
5. Trigger a QC-soft fixture and a tie-break fixture.
6. Close the app, reopen, and resume at the correct item.
7. Complete scoring and display the exported `ProfileSnapshot`.

## Acceptance criteria

- No Claude request occurs anywhere in the module.
- Same valid responses always produce the same serialized score/code.
- Minor answers are not durably persisted before consent.
- Offline retry creates no duplicates.
- All boundary, contract, and E2E tests pass.
- Module 2 can consume `ProfileSnapshot` without importing Module 1 internals.

## Risks and production follow-ups

- Decide how phone numbers are encrypted/tokenized for OTP delivery and account lookup.
- Replace mock SMS with primary/fallback providers.
- Complete DPDP review of browser-side ephemeral storage.
- Add abuse protection, CAPTCHA/risk controls, and production rate limiting.
- Native-review gate is required before Tamil assessment content is enabled.

## Handoff checklist

- Migrations and rollback notes.
- OpenAPI output and generated frontend client.
- Test-vector fixtures and expected outputs.
- Consent state diagram.
- Demo recording and known limitations.
- No secrets or real phone numbers in repository history.
