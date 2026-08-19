# Module 4 AI Counselor Storage Flow

## Purpose

This is the Phase A implementation walkthrough. For every field and constraint, use [Module 4 data model](module-4-counselor-data-model.md) and [Module 4 MVP DBML](module-4-counselor-mvp.dbml).

Module 4 manages conversations, grounded tools, journey progress and reports. AI may phrase explanations and ask follow-ups, but cannot create assessment scores, recommendation ranks, aid eligibility or safety policy.

## Example context

```text
user_id                    anandi-user-id
profile_snapshot_id        ps-001
recommendation_run_id      rr-career-001
segment                    explorer
language                   ta
```

## Start conversation

```text
POST /api/v1/conversations
  -> authorize user
  -> read the selected or latest profile snapshot
  -> derive segment from the profile and use Phase A web/en defaults
  -> read the current recommendation ID
  -> create counselor.conversations with the start idempotency key
  -> create or resume counselor.journey_states
  -> store approved welcome message
  -> return conversation and journey DTO
```

`conversations` stores ownership, language, status and bounded upstream references. `journey_states` stores the current resumable step. Neither duplicates the complete profile or recommendation set.

## Send message

```text
POST /api/v1/conversations/:id/messages
  -> store user message
  -> call Module 5 safety pre-check
  -> stop or continue according to SafetyDecision
  -> call bounded read-only tools from Modules 1-3
  -> generate grounded assistant wording
  -> validate entities, numbers, URLs and policy
  -> store assistant message and grounding
  -> stream AssistantTurn to React
```

### 1. User message

`counselor.conversation_messages` stores one row per user or assistant turn. The public API requires one retry idempotency key scoped to the conversation. The service derives the stored message ID from that key, so the client does not send a second message identifier. `client_message_id` remains nullable for backward-compatible internal writers.

### 2. Safety before general AI

The message goes to Module 5 before the general counselor model. If Module 5 pauses the journey, Module 4 returns only the approved safety response and handoff state.

### 3. Tool calls

`counselor.tool_calls` records the bounded request and result metadata.

```text
tool_name             get_recommendation_set
input_json            {"recommendationRunId":"rr-career-001"}
status                completed
result_hash           sha256(...)
source_versions_json  {"recommendation":"career-fit-v1"}
```

Tools return DTOs through module contracts. Module 4 does not query another module's private repository directly.

### 4. Ground the assistant response

The assistant response is stored only after validation. `counselor.message_grounding` links its claims/entities to tool calls and stable IDs.

```text
assistant_message_id  msg-assistant-002
tool_call_id          tool-001
entity_type           career
entity_id             career-data-scientist-id
claim_type            recommendation_explanation
```

If validation fails, the model draft is not shown as trusted output; an approved fallback can be stored instead.

## Journey and exploration

```text
user opens recommendation/card/compare view
  -> append journey_events
  -> append exploration_events for entity actions
  -> update journey_states with optimistic version
  -> return resumable breadcrumb
```

- `journey_events` is append-only transition history.
- `journey_events.producer_event_id` durably deduplicates producer retries.
- `journey_states` is the current resumable position.
- `exploration_events` records an opened, compared or selected approved entity.

Recommendation rows are not modified when a user explores or completes a mission.

## Conversation summaries

`conversation_summaries` stores bounded context-window summaries with a covered-message range and version. It never becomes a second source of assessment or recommendation truth.

## Report generation

```text
user requests report
  -> freeze profile/recommendation/plan/exploration references
  -> create counselor.report_snapshots
  -> render PDF/image outside the transaction
  -> create counselor.generated_assets metadata
  -> return short-lived signed URL
```

`report_snapshots` preserves exact approved inputs and deduplicates report writes by user and idempotency key. `generated_assets` stores storage references, hashes, visibility and expiry—not the binary itself.

## AI-disabled fallback

Without the model provider, Module 4 can still show Module 1 results, Module 2 rankings, Module 3 facts, approved static explanations and saved journey state. AI is the communication layer, not deterministic truth.

## Privacy and integrity

- Users access only their own conversations, journey and reports.
- Raw messages are not copied into recommendation, knowledge or analytics tables.
- Tool outputs are bounded and versioned.
- Invalid model-created IDs, ranks, numbers or URLs are rejected.
- Report assets use private storage and expiring access unless explicitly approved as share-safe.
