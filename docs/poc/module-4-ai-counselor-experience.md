# Module 4 POC — AI Counselor & Student Experience

## Assignment outcome

Deliver the React/Vite chat-and-canvas experience and a grounded Claude orchestration layer that explains trusted profile/recommendation data, supports open-ended exploration, produces reports, and degrades safely when Claude is unavailable.

## PRD coverage

- Primary: `US-12`, `US-13`, `US-16`, `US-17`, `US-33`.
- Presentation for: `US-15`, `US-24`, `US-25`, `US-32`, `US-34`–`US-36`.
- Screens/canvas: `S-04`, `S-09`, `S-12`, `W-08`, `W-10`, `W-11`, `W-13`, `W-14`, `CV-1`–`CV-10`, `W-CV-Step`.

## Goals

- Prove AI value without allowing AI to determine facts, scores, ranks, rings, or eligibility.
- Implement typed tool calling and same-turn entity grounding.
- Demonstrate the full responsive chat+canvas interaction model.
- Generate deterministic report content and privacy-safe share assets.
- Preserve core functionality during Claude outage.

## Non-goals

- Assessment scoring and recommendation calculation.
- Internet search or unrestricted RAG at student-response time.
- AI-authored safety responses.
- Final brand-perfect visual design.
- Production PDF rendering scale.
- Enabling Tamil by default before the Phase 2 native-review and safety-copy gates pass.

## Owned paths

```text
packages/counselor/src/domain/
packages/counselor/src/application/
packages/counselor/src/infrastructure/
packages/counselor/src/http/
apps/web/src/app/
apps/web/src/features/chat/
apps/web/src/features/canvas/
apps/web/src/features/guidance/
apps/web/src/features/reports/
apps/web/src/features/sharing/
packages/contracts/src/chat.ts
packages/contracts/src/widgets.ts
```

`apps/web/src/app` is shared with the integration owner. Module 4 may propose composition changes, but feature logic stays in its owned feature directories.

## Integration boundary and conflict rules

- Build against versioned fixtures first; real Module 1–3 adapters replace mocks without changing UI contracts.
- Export one `registerCounselorRoutes()` entry point and one module-owned React route/provider entry point.
- Do not import upstream repositories or database clients; invoke typed application ports.
- The AI may explain immutable payloads but cannot change scores, ranks, rings, entities, URLs, or safety decisions.
- Root router, global providers, Express bootstrap, generated API client, and shared UI primitives require integration-owner review.
- Any new tool must identify its owning module, Zod input/output schema, timeout, audit fields, and deterministic fallback before merge.

## AI responsibility boundary

AI may:

- Interpret a free-text intent.
- Choose approved tools.
- Explain a stored profile and fit evidence.
- Compare retrieved options.
- Answer what-if questions using recalculated tool outputs.
- Personalize phrasing with approved profile facts.
- Polish deterministic summary fragments without changing entities or numbers.

AI may not:

- Calculate or alter assessment scores.
- Rank or partition careers, colleges, or aid schemes.
- Declare eligibility or impossibility.
- Invent entities, facts, salaries, amounts, links, or safety advice.
- Access tables directly.

## Runtime orchestration

```text
Student message
  → input/safety pre-check
  → load bounded conversation state + ProfileSnapshot
  → Claude request with typed tools
  → execute requested application tool
  → return tool result
  → Claude grounded response + widget directive
  → entity/number/URL linter
  → valid? stream/persist
  → invalid? regenerate once
  → still invalid? deterministic safe fallback
```

Claude tool use follows a loop until a final assistant turn or configured tool/turn limit. All tool inputs are schema-validated; outputs are bounded and sanitized before being sent to the model.

## Tool registry

Module 4 exposes only adapters over other modules:

- `get_profile` → Module 1.
- `match_careers` → Module 2.
- `get_career` → Module 3.
- `get_streams` → Module 3 plus Module 2 selection logic where applicable.
- `get_colleges` → Modules 3/2.
- `get_aid_schemes` → Modules 3/2.
- `request_handoff` → Module 5.

Each tool records name, validated input, result hash, source versions, latency, and outcome. Sensitive result fields are excluded from general logs.

## Chat response contract

```ts
type AssistantTurn = {
  turnId: string;
  text: string;
  widgets: WidgetDirective[];
  grounding: {
    toolCallIds: string[];
    entityIds: string[];
    recommendationIds: string[];
  };
  flags: string[];
  createdAt: string;
};
```

Widget directives reference data by ID or embedded approved payload. The frontend never parses assistant prose to decide which widget to render.

## Entity grounding enforcement

The linter builds an allowlist from same-turn tool results and checks:

- Career, college, degree, exam, and scheme names.
- Salary/amount patterns.
- URLs.
- Fit scores and time/duration claims where structured.

Allowed non-entity language and fixed copy dictionaries are excluded from the entity check. Regeneration receives a structured violation list. The second failure returns a template response using tool data directly.

## Conversation state

- Store turns and tool-call metadata.
- Send a bounded profile snapshot and recent conversation context per turn.
- Maintain a sliding, structured summary for older turns.
- Do not include other users, raw phone numbers, or unrestricted safety excerpts.
- Enforce configured daily token ceiling and per-turn budget.

## Frontend experience

### Layout

- Desktop: approximately 390px chat pane plus fluid canvas.
- Mobile under 900px: stacked chat then canvas.
- Chat is the journey controller; canvas reacts to chat events.
- Only OTP, share preview, and career browser use full-screen overlays.

### Canvas

- Welcome, accumulating profile, live bars, reveal, explore, focus, career/college/aid rings, and report states.
- Central identity bubble uses fixed code-name/quality dictionaries.
- Radial map has deterministic positions from stable IDs for visual consistency.
- Every map has a synchronized list-view alternative.
- Detail panels show source/verification notes.

### Journey breadcrumb

- Five persisted steps.
- Completed steps navigate to recap only.
- Upcoming steps are disabled.
- Safety interrupt hides/freezes normal breadcrumb behavior.

### Reveal and guidance

- Six-message reveal sequence.
- Segment-specific cards and next actions.
- Compare widget renders exactly two known entities.
- Career browser distinguishes rich curated and restricted non-curated records.

## Report and share generation

Report input is an immutable assembled snapshot:

- ProfileSnapshot.
- Completed results.
- Recommendation IDs/payload snapshots.
- Tap/exploration log.
- Deterministic summary fragments.

Rendering may not fetch new recommendations. The LLM polish step is optional and must pass entity/number linting; fallback uses raw template fragments.

Share card includes only first name, code, code name, and branding. PDF is private, stored with restricted access, and returned using an expiring URL.

## POC database tables

- `conversations`
- `conversation_summaries`
- `tool_calls`
- `journey_state`
- `exploration_events`
- `report_snapshots`
- `generated_assets`

## API contract

```text
POST /api/v1/chat                     # SSE response
GET  /api/v1/chat/history
GET  /api/v1/journey
POST /api/v1/journey/events
POST /api/v1/reports
GET  /api/v1/reports/:id
POST /api/v1/reports/:id/pdf
POST /api/v1/share-cards
GET  /api/v1/careers/browser
```

## Mock strategy

Before Modules 1–3 integrate, use shared contract fixtures:

- Explorer/Pathfinder/Launcher profiles.
- Normal and soft-confidence results.
- Career, college, aid, stream, and pathway recommendation sets.
- Verified/unverified tool results.
- Claude success, tool-use, timeout, malformed-tool-input, and hallucinated-entity responses.

Mocks must implement the same interfaces as real adapters.

## Implementation sequence

1. Freeze assistant-turn and widget contracts.
2. Build React shell, chat state, canvas state, and responsive layout with fixtures.
3. Implement Claude adapter and typed tool executor.
4. Add SSE streaming and persistence.
5. Add grounding linter, one regeneration, and fallback.
6. Implement reveal, maps, detail panels, and list view.
7. Implement breadcrumb/resume state.
8. Implement report snapshot, PDF POC, and share card.
9. Add Claude outage mode and complete E2E tests.

## Required automated tests

### Orchestration

- Correct tool chosen for career, college, aid, compare, and handoff intents.
- Invalid tool input is rejected before execution.
- Tool loop limit prevents runaway calls.
- Same-turn grounding audit is recorded.
- Hallucinated entity triggers regeneration then fallback.
- LLM cannot change score/rank fields in a widget.
- Timeout/rate limit activates graceful degradation.

### Report/privacy

- Report contains only snapshot data.
- Share image contains no age, phone, city, school, scores, or selections.
- URLs in output match catalog URLs exactly.
- Summary polish cannot introduce a new entity/number.

### Frontend/E2E

- Desktop split and 360px stacked layout.
- Keyboard navigation for chips, cards, breadcrumb, and list view.
- Screen-reader accessible names and focus management.
- Chat event drives canvas; canvas cannot skip the journey.
- Resume restores journey step.
- Claude disabled still displays static top-five guidance and report.

## POC demo script

1. Load a Pathfinder fixture and show the responsive split interface.
2. Ask “compare these two careers”; show tool calls and compare widget.
3. Ask “what if my marks drop?” and show recalculated backup-route data.
4. Ask for a nonexistent college and show grounded not-found handling.
5. Inject a test hallucinated salary and show linter/regeneration/fallback.
6. Open career, college, and aid maps plus accessible list views.
7. Generate report and privacy-safe share card.
8. Disable Claude and complete static guidance successfully.

## Acceptance criteria

- AI never calculates or overwrites deterministic facts.
- Every named entity/number/link is grounded or fixed approved copy.
- Core journey works without Claude.
- Canvas and chat use the same payloads and state events.
- Report and share privacy tests pass.
- Mobile and keyboard-accessible flows pass Playwright/axe checks.

## Risks and production follow-ups

- Tune system prompt and entity recognition against real counselor-reviewed conversations.
- Implement prompt-injection defenses for retrieved narrative documents.
- Validate token/cost limits under long sessions.
- Select production PDF/image rendering and storage services.
- Tamil copy and safety content require human review before Phase 2 enablement.

## Handoff checklist

- Tool registry and schemas.
- Prompt versions and grounding rules.
- Widget catalog with examples.
- Accessibility report and screenshots.
- Claude-off demo.
- Hallucination/fallback test artifacts.
- Report/share privacy audit.
