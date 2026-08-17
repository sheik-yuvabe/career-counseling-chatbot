# YuvaNext Module 4: End-to-End Endpoint and Workflow Guide

Mentor handoff | Phase A Career Counseling POC | 13 August 2026

## 1. Executive Summary

Module 4 is the AI Counselor orchestration layer. It does not calculate assessment scores or recommendation ranks. It authenticates the student, opens a conversation, checks every message with Module 5, retrieves the student's immutable profile from Module 1, retrieves deterministic recommendations from Module 2, retrieves published evidence from Module 3, produces a grounded counselor turn when AI is configured, and stores the complete audit trail in Supabase.

Current integrated runtime:

- Supabase Auth validates the student's bearer access token.
- PostgreSQL/Supabase stores conversations, messages, journey state, exploration events and reports.
- Module 1 provides the profile snapshot and assessment journey-session context.
- Module 2 provides completed recommendation sets and stable recommended entity IDs.
- Module 3 resolves those IDs to published or verified catalog evidence.
- Module 5 screens messages before AI and creates staff handoffs for approved safety cases.
- Gemini or Anthropic is optional. When the selected provider is unavailable, Module 4 returns approved fallback copy.

The API testing interface is available at:

```text
http://localhost:3000/docs
```

## 2. Authentication and Common Rules

All public endpoints in this guide require a Supabase user access token:

```text
Authorization: Bearer <session.access_token>
```

The token must belong to the same user who owns the profile, recommendation, conversation, journey and report. The Supabase anon key, service-role key and fixture token are not user access tokens.

Every retryable POST accepts an `idempotencyKey` UUID. The client creates it once for one logical action. If the network fails, the client retries the same action with the same key. A genuinely new action uses a new key.

All IDs and timestamps use:

```text
ID: UUID
Timestamp: UTC ISO-8601
Language: en (Phase A)
```

## 3. Complete Runtime Workflow

```text
Student signs in through Supabase Auth
  -> GET profile snapshot from Module 1
  -> GET completed recommendation from Module 2
  -> POST conversation start/resume in Module 4
  -> POST student message in Module 4
       -> persist user message
       -> call Module 5 safety check
       -> if triggered: approved safety copy + optional handoff + journey pause
       -> if clear: read Module 1 profile
                    read Module 2 recommendation
                    read Module 3 grounded entities and sources
                    call configured AI provider
                    validate IDs, URLs and numbers against retrieved evidence
                    fall back to approved copy on any AI failure
       -> persist assistant turn and grounding audit
       -> return Server-Sent Events (SSE)
  -> record journey and exploration events
  -> create immutable report snapshot
  -> generate private PDF and privacy-safe share card
```

## 4. Endpoint Order for an End-to-End Demo

1. `GET /api/v1/health`
2. `GET /api/v1/profile/snapshot`
3. `GET /api/v1/recommendations/{recommendationId}`
4. `POST /api/v1/conversations`
5. `POST /api/v1/conversations/{conversationId}/messages`
6. `GET /api/v1/conversations/{conversationId}/messages`
7. `GET /api/v1/journey`
8. `POST /api/v1/journey/events`
9. `POST /api/v1/exploration/events`
10. `POST /api/v1/reports`
11. `GET /api/v1/reports/{reportId}`
12. `POST /api/v1/reports/{reportId}/pdf`
13. `POST /api/v1/share-cards`

## 5. Health Endpoint

### GET /api/v1/health

Purpose: Proves the Express API is running and reports whether the integrated database dependency is connected.

Authentication: Not required.

Request body: None.

Expected success:

```json
{
  "status": "ok",
  "service": "yuvanext-api",
  "database": { "status": "connected" },
  "modules": []
}
```

Database writes: None. It executes a lightweight connection check.

Important failure: HTTP 503 with `database.status = disconnected` or `not_configured` means integrated endpoints are not ready.

## 6. Module 1 Profile Endpoint

### GET /api/v1/profile/snapshot

Purpose: Returns the authenticated student's immutable assessment profile snapshot. When `profileSnapshotId` is omitted, it returns the latest owned snapshot.

Query:

```text
profileSnapshotId=<optional UUID>
```

Request body: None.

Important response fields:

- `profile.snapshotId`: used to start a conversation and create a report.
- `profile.segment`: explorer, pathfinder or launcher.
- `profile.riasec`: deterministic Module 1 results when present.
- `profile.sourceResultIds`: trace to assessment results.
- `profile.profileVersion` and `algorithmVersion`: audit versions.

Supabase tables read:

- `assessment.profile_snapshots`
- `assessment.profile_snapshot_results`

Ownership rule: The SQL query scopes by authenticated `userId`; another student's snapshot returns 404.

## 7. Module 2 Recommendation Endpoint

### GET /api/v1/recommendations/{recommendationId}

Purpose: Returns one completed deterministic recommendation set owned by the authenticated student.

Path parameter:

```text
recommendationId=<UUID returned by Module 2>
```

Request body: None.

Important response fields:

- `recommendation.recommendationId`: used by exploration and report endpoints.
- `recommendation.profileSnapshotId`: must match the student's profile snapshot.
- `recommendation.kind`: career, stream, pathway, college, aid or plan.
- `recommendation.items`: stable entity IDs, ranks, fit scores and rings.
- Version and hash fields: allow exact reconstruction and auditing.

Supabase tables read:

- `recommendation.recommendation_runs`
- `recommendation.recommendation_items`
- `recommendation.recommendation_rings`

## 8. Start or Resume Conversation

### POST /api/v1/conversations

Purpose: Creates the student's active counselor conversation, initial journey state and approved welcome message. If an active conversation already exists, the endpoint resumes it instead of creating a duplicate.

Payload:

```json
{
  "profileSnapshotId": "345cdb3e-392a-4fec-814a-fcece35d99ad",
  "idempotencyKey": "2ff88786-5956-4f66-9c9c-41914fb2acdd"
}
```

Field use:

- `profileSnapshotId`: selects the owned immutable Module 1 profile. Optional only when the latest profile should be used.
- `idempotencyKey`: prevents duplicate conversation creation during retry.

Internal workflow:

1. Validate bearer token and ownership.
2. Return an earlier response for the same idempotency key.
3. Resume the user's existing active conversation when present.
4. Read the Module 1 profile snapshot.
5. Read the matching Module 2 recommendation set.
6. Select approved welcome copy for the segment.
7. Atomically store conversation, journey and welcome message.

Supabase tables touched:

- Read: `assessment.profile_snapshots`, Module 2 recommendation tables.
- Write: `counselor.conversations`.
- Write: `counselor.journey_states`.
- Write: `counselor.conversation_messages`.

Important response:

```text
conversation.conversationId = the chat session identifier
journey = resumable counselor position
welcomeTurn = first approved system message
```

The `conversationId` is not authentication. It groups messages and records; the bearer token still proves ownership.

## 9. Send Counselor Message

### POST /api/v1/conversations/{conversationId}/messages

Purpose: Stores a student message, performs the mandatory safety check, retrieves grounded context, generates or selects an assistant response, stores the response, and streams it as SSE.

Path parameter:

```text
conversationId=<UUID returned by POST /conversations>
```

Payload:

```json
{
  "content": "Explain my career recommendation",
  "idempotencyKey": "d34bd864-7016-4356-bf85-dd4fd4493d7c"
}
```

Field use:

- `content`: the student's message.
- `idempotencyKey`: makes the user-message and assistant-turn retry-safe.

Normal internal workflow:

1. Confirm the authenticated user owns `conversationId`.
2. Resolve the real Module 1 `journey_session_id` linked to the profile.
3. Persist the user message with a deterministic message UUID.
4. Call Module 5 `POST /api/v1/internal/safety/check`.
5. If clear, load Module 1 profile and Module 2 recommendation.
6. Ask Module 3 for published/verified career, stream, college or aid evidence.
7. Record Module 3 tool calls and source versions.
8. If AI mode is enabled, supply the bounded profile, recommendation and evidence to the selected Gemini or Anthropic provider.
9. Reject unsupported entity IDs, recommendation IDs, URLs or numbers.
10. Use approved fallback copy if AI is disabled, times out, fails or violates grounding.
11. Store the assistant message and grounding links.
12. Stream `assistant_turn`, followed by `done`.

SSE success example:

```text
event: assistant_turn
data: {"turnId":"...","conversationId":"...","text":"...","grounding":{...}}

event: done
data: {"conversationId":"...","turnId":"..."}
```

Supabase tables touched:

- `counselor.conversations`
- `counselor.conversation_messages`
- `counselor.journey_states`
- `counselor.tool_calls`
- `counselor.message_grounding`
- Module 1, Module 2 and Module 3 tables through their owned readers.

Cross-module safety payload sent to Module 5:

```json
{
  "sourceEventId": "USER_MESSAGE_UUID",
  "triggerType": "message",
  "message": "Explain my career recommendation",
  "occurredAt": "2026-08-13T05:00:00.000Z",
  "context": {
    "userId": "USER_UUID",
    "sessionId": "JOURNEY_SESSION_UUID",
    "conversationId": "CONVERSATION_UUID",
    "profileSnapshotId": "PROFILE_UUID",
    "segment": "explorer",
    "language": "en"
  }
}
```

## 10. Safety-Triggered Handoff Workflow

When Module 5 returns `triggered=true`, Module 4 never asks the general AI for safety advice. It uses the approved safety-copy key/version supplied by Module 5.

When `createHandoff=true`, Module 4 calls:

```text
POST Module 5 /api/v1/internal/handoffs
```

The handoff contains:

- Deterministic idempotency and correlation UUIDs.
- Safety tier as the approved reason.
- Module 1 first name, age band and segment.
- Profile snapshot ID and RIASEC code/confidence when available.
- A maximum 500-character triggering excerpt.
- At most ten recent turns, each bounded to 2,000 characters.
- Current journey plan state.
- A consent-backed boolean indicating contact availability.

If `pauseJourney=true`, Module 4 updates `counselor.journey_states.is_safety_paused` using optimistic locking.

Important privacy rule: The boolean does not expose guardian phone hashes or last four digits. Module 5 controls restricted safety storage and staff visibility.

## 11. Conversation History

### GET /api/v1/conversations/{conversationId}/messages

Purpose: Returns the owned conversation metadata and all persisted messages ordered by turn number.

Request body: None.

Supabase tables read:

- `counselor.conversations`
- `counselor.conversation_messages`

Use case: Reloading the chat after refresh or resuming on another authorized client.

## 12. Current Journey

### GET /api/v1/journey

Purpose: Returns the authenticated student's current resumable counselor position.

Important fields:

- `currentStep`: Phase A step 1 through 5.
- `currentStateKey`: approved state-machine key.
- Current profile, recommendation and assessment references.
- `isSafetyPaused`: blocks normal progression when safety requires it.
- `lockVersion`: optimistic concurrency version.

Supabase table read:

- `counselor.journey_states`

Journey is navigation/progress state. It is not conversation history.

## 13. Record Journey Event

### POST /api/v1/journey/events

Purpose: Idempotently records a product event and returns the resulting journey state.

Payload shape:

```json
{
  "conversationId": "CONVERSATION_UUID",
  "eventType": "recommendation_opened",
  "eventSchemaVersion": 1,
  "relatedEntityType": "career",
  "relatedEntityId": "ENTITY_UUID",
  "metadata": {},
  "producerEventId": "PRODUCER_UUID",
  "idempotencyKey": "IDEMPOTENCY_UUID",
  "expectedLockVersion": 0
}
```

Field use:

- `producerEventId`: deduplicates the originating event producer.
- `idempotencyKey`: deduplicates the state-application write.
- `expectedLockVersion`: prevents two clients from overwriting journey progress.

Supabase tables touched:

- `counselor.journey_events`
- `counselor.journey_states`

Current limitation: Final product-approved event-to-state transition rules are still an explicit approval gate. Module 4 records and validates events without inventing product transitions.

## 14. Record Exploration Event

### POST /api/v1/exploration/events

Purpose: Records that a student viewed, compared, selected, deselected or opened a plan for a recommended item.

Payload:

```json
{
  "conversationId": "CONVERSATION_UUID",
  "recommendationId": "RECOMMENDATION_UUID",
  "recommendationItemId": "ITEM_UUID",
  "action": "viewed",
  "clientEventId": "CLIENT_EVENT_UUID"
}
```

The server creates `event.eventId` and `occurredAt`. Save the returned `eventId` if the activity should be included in a report.

Supabase table written:

- `counselor.exploration_events`

Validation: Recommendation and item ownership are checked through the Module 2 port.

## 15. Create Report Snapshot

### POST /api/v1/reports

Purpose: Creates an immutable, hashable report snapshot from the exact profile, recommendation sets and optional exploration events selected by the student.

Payload:

```json
{
  "profileSnapshotId": "PROFILE_UUID",
  "recommendationIds": ["RECOMMENDATION_UUID"],
  "explorationEventIds": ["EXPLORATION_EVENT_UUID"],
  "language": "en",
  "idempotencyKey": "IDEMPOTENCY_UUID"
}
```

Field use:

- `profileSnapshotId`: exact Module 1 snapshot represented in the report.
- `recommendationIds`: one or more owned completed Module 2 runs.
- `explorationEventIds`: optional owned exploration records; use an empty array when none are required.
- `language`: `en` in Phase A.
- `idempotencyKey`: prevents duplicate snapshots.

Supabase tables touched:

- Read through Module 1 and Module 2 ports.
- Read `counselor.exploration_events`.
- Write `counselor.report_snapshots` and report/exploration associations.

Common 404: `report_source_not_found` means an exploration ID, profile or recommendation does not exist for that authenticated user.

## 16. Get Report Snapshot

### GET /api/v1/reports/{reportId}

Purpose: Returns the immutable owned report snapshot and its version/hash metadata.

Request body: None.

Supabase table read:

- `counselor.report_snapshots`

Ownership: A report belonging to another user is returned as not found.

## 17. Generate Private PDF

### POST /api/v1/reports/{reportId}/pdf

Purpose: Renders a private PDF from an existing report snapshot, uploads it to Supabase Storage and stores generated-asset metadata.

Payload:

```json
{
  "idempotencyKey": "IDEMPOTENCY_UUID"
}
```

Storage and database:

- Supabase Storage bucket: `private-reports`.
- Database: `counselor.generated_assets`.
- Privacy class: `private_report`.
- The returned asset has an expiry timestamp.

The Supabase server key remains backend-only and is never returned to Swagger/browser clients.

## 18. Generate Privacy-Safe Share Card

### POST /api/v1/share-cards

Purpose: Produces a share-safe visual summary from an existing report without profile location/age details.

Payload:

```json
{
  "reportId": "REPORT_UUID",
  "idempotencyKey": "IDEMPOTENCY_UUID"
}
```

Storage and database:

- Supabase Storage bucket: `share-cards`.
- Database: `counselor.generated_assets`.
- Privacy class: `share_safe`.

The report must belong to the authenticated user.

## 19. Supabase Table Responsibility Summary

```text
Module 1 Assessment
  assessment.user_profiles
  assessment.journey_sessions
  assessment.guardian_consents
  assessment.profile_snapshots
  assessment.profile_snapshot_results

Module 2 Recommendations
  recommendation.recommendation_runs
  recommendation.recommendation_items
  recommendation.recommendation_rings

Module 3 Knowledge
  knowledge.knowledge_sources
  knowledge.dataset_versions
  knowledge.careers
  knowledge.stream_options / stream_maps / stream_map_items
  knowledge.colleges
  knowledge.aid_schemes

Module 4 Counselor
  counselor.conversations
  counselor.conversation_messages
  counselor.journey_states
  counselor.journey_events
  counselor.exploration_events
  counselor.tool_calls
  counselor.message_grounding
  counselor.report_snapshots
  counselor.generated_assets

Module 5 Safety/Operations
  restricted safety decisions and handoffs owned by Module 5
```

## 20. Error Interpretation

```text
400 invalid_request
  Payload, UUID or schema is invalid.

401 authentication_required
  Missing, expired or invalid Supabase user bearer token.

403/404 access or not_found
  Resource does not exist for the authenticated user.

409 conflict
  Usually journey optimistic-lock mismatch.

503 counselor_dependency_unavailable
  Module 5, AI, Storage or another required dependency failed.
```

For Module 5 connection failures, verify from the Module 4 computer:

```powershell
Test-NetConnection <MODULE5_IP> -Port 3001
```

Both laptops must share a network, Module 5 must listen on `0.0.0.0:3001`, and its firewall must allow inbound TCP 3001. A router DHCP reservation is recommended so the Module 5 IP does not change.

## 21. Mentor Demo Checklist

Before the demo:

- Module 5 is running and reachable.
- Module 4 `/api/v1/health` returns 200 and database connected.
- Swagger is authorized with a real Supabase user access token.
- The chosen profile and recommendation belong to that user.
- Use a new UUID for each new write, and retain keys for retry demonstrations.

Demonstrate:

1. Read the owned profile and recommendation.
2. Start/resume a conversation and explain `conversationId`.
3. Send a safe message and show safety-before-AI ordering.
4. Show Module 3 tool/source grounding or approved fallback behavior.
5. Reload history and journey state.
6. Record an exploration event and reuse its returned `eventId` in a report.
7. Generate the report, PDF and share card.
8. Use only an approved Module 5 synthetic case to demonstrate a safety handoff.
9. Retry one request with the same idempotency key and show no duplicate write.

## 22. Current POC Status and Honest Limitations

Implemented:

- Real Supabase authentication and persistence.
- Module 1 profile and journey-session integration.
- Module 2 recommendation integration.
- Module 3 published/verified structured grounding.
- Module 5 safety pre-check and complete handoff packet mapping.
- Conversation SSE, journey/event storage, exploration, reports, PDF and share cards.
- Idempotency, ownership checks, grounding validation and automated tests.

Pending or environment-dependent:

- Gemini requires valid `GEMINI_API_KEY` and `GEMINI_MODEL`; Anthropic remains available as an alternative.
- Without AI credentials, approved fallback copy is intentional.
- Product-approved journey event-to-state mappings remain an approval gate.
- Module 5 availability depends on its laptop/service/network during the local POC.
- A live handoff demo must use an approved synthetic safety test, not real crisis content.

## 23. Short Mentor Explanation

"Module 4 is an orchestration and safety boundary, not a scoring engine. It authenticates the student, stores the conversation, calls Module 5 before any general AI, retrieves immutable Module 1 profile data, deterministic Module 2 recommendations and published Module 3 evidence through typed ports, validates the generated response against that evidence, and persists an auditable assistant turn. It fails closed for safety and falls back to approved non-safety copy when AI is unavailable. The same authenticated workflow records journey/exploration activity and produces immutable reports, private PDFs and privacy-safe share cards."
