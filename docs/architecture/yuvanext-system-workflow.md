# YuvaNext System and AI Workflow

## Document purpose

This document is the version-controlled source of truth for the YuvaNext runtime workflow. It explains:

- How React/Vite and Express are separated.
- Which operations are deterministic.
- Where Claude adds value.
- Why YuvaNext is bounded-agentic rather than a multi-agent system.
- How assessment, recommendation, knowledge, AI, safety, and evaluation interact.
- How the same workflow should be drawn in FigJam/Figma.

Related documents:

- [Five-module POC master plan](../poc/README.md)
- [Collaboration and integration plan](yuvanext-collaboration-integration-plan.md)
- [Module 1 — User Profile & Assessment](../poc/module-1-user-profile-assessment.md)
- [Module 2 — Recommendation & Planning](../poc/module-2-recommendation-planning.md)
- [Module 3 — Grounded Knowledge](../poc/module-3-grounded-knowledge.md)
- [Module 4 — AI Counselor & Student Experience](../poc/module-4-ai-counselor-experience.md)
- [Module 5 — Safety, Evaluation & Operations](../poc/module-5-safety-evaluation-operations.md)

Editable visual:

- [YuvaNext Bounded AI Workflow — FigJam](https://www.figma.com/board/yFo1w9NIVTjGb9EJaNG7dO?utm_source=other&utm_content=edit_in_figjam&oai_id=v1%2FrjgAognFiNmRFdpk9Ak9Yd7wgALJV7nVbSX5MQt1I3SuhTpeS5H6O8&request_id=c012aeb1-fcbe-4770-98ba-4122bd14261a)

---

## 1. Architecture decisions

### Runtime stack

- Student and counselor UI: React + Vite + TypeScript.
- API: Express 5 + TypeScript.
- Runtime validation/contracts: Zod + generated OpenAPI.
- Database: PostgreSQL.
- Short-lived state and queues: Redis + BullMQ.
- AI: Claude Messages API with application-executed tools.
- Offline student response queue: IndexedDB through Dexie.
- Deterministic rules: ordinary TypeScript functions with versioned configuration.
- Later psychometric analytics: optional offline Python scripts, not the student-facing API.

### AI classification

YuvaNext is a **bounded tool-using AI application**. It is agentic in a narrow sense because Claude can:

1. Interpret an open-ended student question.
2. Select from an approved tool list.
3. Request one or more tool calls.
4. Observe tool results.
5. Produce a grounded explanation or request another approved tool.

It is not an autonomous multi-agent platform because it cannot:

- Create goals independently.
- Change assessment or recommendation algorithms.
- Browse arbitrary sources during a student session.
- Delegate to self-created agents.
- Run indefinitely.
- Modify student records outside approved tools.
- Decide safety policy.
- Publish unreviewed content.

### Multi-agent decision

**Do not introduce multi-agent workflows in the Phase 1 POC.**

Use:

- One deterministic journey state machine.
- One bounded AI counselor orchestrator.
- Seven typed application tools.
- One safety pre-check and interrupt layer.
- One evaluation framework outside the runtime response loop.

This is simpler to test, cheaper to operate, faster for students, and easier to audit.

---

## 2. System context

```mermaid
flowchart LR
    Student["Student or Guardian"] --> Web["React + Vite Web App"]
    Counselor["Yuvabe Counselor"] --> StaffUI["React Staff Dashboard"]

    Web --> API["Express 5 API"]
    StaffUI --> API

    API --> M1["M1: Profile and Assessment"]
    API --> M2["M2: Recommendation Engine"]
    API --> M3["M3: Grounded Knowledge"]
    API --> M4["M4: AI Counselor Orchestrator"]
    API --> M5["M5: Safety and Operations"]

    M1 --> DB[("PostgreSQL")]
    M2 --> DB
    M3 --> DB
    M4 --> DB
    M5 --> SecureDB[("Restricted Safety Schema")]

    M1 --> Redis[("Redis")]
    M5 --> Jobs["BullMQ Workers"]
    Jobs --> DB

    M4 --> Claude["Claude API"]
    M1 --> SMS["SMS/OTP Adapter"]
    M5 --> Alert["Counselor Alert Adapter"]
    M4 --> Storage["Private Object Storage"]
```

### Important boundaries

- The browser never talks directly to Claude, PostgreSQL, Redis, SMS, or storage.
- Claude never talks directly to PostgreSQL.
- All model-visible data passes through typed Express tools.
- Safety can interrupt Module 4 and the normal student journey.
- Module 2 can run with Claude completely disabled.

---

## 3. Module dependency workflow

```mermaid
flowchart LR
    M1["M1: Student Profile and Assessment"] -->|"ProfileSnapshot"| M2["M2: Recommendation and Planning"]
    M3["M3: Grounded Knowledge Platform"] -->|"Verified catalog records"| M2

    M1 -->|"Profile and results"| M4["M4: AI Counselor and Experience"]
    M2 -->|"Ranked recommendations and rings"| M4
    M3 -->|"Career, college, aid and pathway tools"| M4

    M1 -->|"Events"| M5["M5: Safety, Evaluation and Operations"]
    M2 -->|"Versions and hashes"| M5
    M3 -->|"Sources and freshness"| M5
    M4 -->|"Turns, tool calls and flags"| M5

    M5 -->|"Safety interrupt and handoff status"| M4
```

This is not a single pipeline of `assessment → recommendation → RAG → AI → evaluation`.

- Module 2 needs both Module 1 and Module 3.
- Module 4 can call Modules 1–3 depending on student intent.
- Module 5 evaluates and monitors every module.
- Evaluation is cross-cutting, not the final student-facing step.

---

## 4. Complete student journey

```mermaid
flowchart TD
    Start["Open YuvaNext"] --> Details["Name, age, city, state and India"]
    Details --> AgeCheck{"Age below 12?"}
    AgeCheck -->|"Yes"| Underage["Friendly stop; do not save personal data"]
    AgeCheck -->|"No"| OTP["Student phone OTP"]

    OTP --> Verified{"OTP verified?"}
    Verified -->|"No"| OTPState["Retry, resend or lock state"]
    OTPState --> OTP
    Verified -->|"Yes"| Route["Determine Explorer, Pathfinder or Launcher"]

    Route --> Minor{"Student below 18?"}
    Minor -->|"Yes"| Consent["Request guardian OTP consent"]
    Minor -->|"No"| Intake["Segment-specific intake"]

    Consent --> ConsentState{"Consent state"}
    ConsentState -->|"Granted"| Intake
    ConsentState -->|"Pending"| Ephemeral["Assessment answers remain local and ephemeral"]
    Ephemeral --> Intake
    ConsentState -->|"Declined or expired"| Purge["Purge ephemeral data and stop"]

    Intake --> Instrument["Select required or optional instrument"]
    Instrument --> Assessment["Fixed item batches and progress"]
    Assessment --> Persist{"Network available?"}
    Persist -->|"Yes"| Save["Idempotently save answer"]
    Persist -->|"No"| Offline["IndexedDB retry queue"]
    Offline --> Assessment
    Save --> Assessment

    Assessment --> Complete{"Instrument complete?"}
    Complete -->|"No"| Assessment
    Complete -->|"Yes"| Score["Deterministic scoring service"]
    Score --> QC["QC confidence and deterministic tie-break"]
    QC --> Snapshot["Create versioned ProfileSnapshot"]

    Snapshot --> Recommend["Deterministic recommendation engine"]
    Recommend --> Reveal["Profile reveal and maps"]
    Reveal --> Explore["Guided cards or open-ended AI conversation"]
    Explore --> Report["Stored-data report and private PDF"]
    Report --> Share["Privacy-safe share card"]
    Share --> Return["Resume, missions or 90-day retake"]
```

### Journey ownership

- Landing through `ProfileSnapshot`: Module 1.
- Recommendation computation: Module 2 using Module 3 data.
- Reveal, exploration, report, and share experience: Module 4.
- Safety, counselor visibility, audit, privacy jobs, and evaluation: Module 5.

---

## 5. Deterministic path versus AI path

```mermaid
flowchart TD
    Event["Student action or message"] --> FixedIntent{"Fixed journey action?"}

    FixedIntent -->|"Yes"| StateMachine["Deterministic journey state machine"]
    StateMachine --> Rules["Validation and business rules"]
    Rules --> Database["Persist or retrieve typed data"]
    Database --> Widget["Render typed widget"]

    FixedIntent -->|"No; open-ended question"| SafetyCheck["Safety pre-check"]
    SafetyCheck -->|"Triggered"| SafetyFlow["Approved safety response and handoff"]
    SafetyCheck -->|"Clear"| AI["Bounded AI counselor"]
    AI --> Tool["Request approved application tool"]
    Tool --> Rules
    Database --> ToolResult["Typed tool result"]
    ToolResult --> AI
    AI --> Lint["Entity, number and URL grounding linter"]
    Lint -->|"Pass"| Answer["Short explanation plus widget"]
    Lint -->|"Fail once"| Retry["Regenerate with violations"]
    Retry --> Lint
    Lint -->|"Fail twice"| Fallback["Deterministic safe fallback"]
```

### Always deterministic

- OTP and account merging.
- Consent status and persistence permission.
- Segment routing.
- Intake question sequence.
- Assessment item selection and order.
- Response persistence and resume position.
- RIASEC/WIP/Big Five/photo/aptitude scoring.
- QC, confidence, and tie-breaking.
- Career, college, and scholarship ranking.
- Ring partitioning.
- Retake cooldown.
- Safety tier and approved safety copy.
- Data deletion and retention jobs.

### AI-assisted

- Interpreting free-text intent.
- Explaining a stored result in accessible language.
- Comparing retrieved options.
- Explaining direct and resilient routes.
- Answering “what if?” questions after a deterministic recalculation.
- Personalizing wording with approved intake facts.
- Optional wording polish for a deterministic summary.

---

## 6. AI counselor tool-use sequence

```mermaid
sequenceDiagram
    participant U as Student
    participant W as React Web App
    participant E as Express Chat API
    participant S as Safety Check
    participant C as Claude Counselor
    participant T as Typed Tool Executor
    participant D as Deterministic Services
    participant L as Grounding Linter

    U->>W: Ask an open-ended career question
    W->>E: POST /api/v1/chat
    E->>S: Check input before general model
    S-->>E: Clear
    E->>C: Prompt, bounded profile, tools and recent context
    C-->>E: tool_use request
    E->>T: Validate tool name and input schema
    T->>D: Execute approved query or calculation
    D-->>T: Typed result with IDs and versions
    T-->>E: tool_result plus result hash
    E->>C: Continue with tool result
    C-->>E: Grounded answer and widget directive
    E->>L: Validate entities, numbers and URLs
    L-->>E: Pass
    E-->>W: SSE text and widget events
    W-->>U: Render answer and grounded widget
```

### Approved tool set

1. `get_profile`
2. `match_careers`
3. `get_career`
4. `get_streams`
5. `get_colleges`
6. `get_aid_schemes`
7. `request_handoff`

The POC should use a custom Express orchestration loop. A separate agent framework is unnecessary for seven stable tools and a bounded conversation.

---

## 7. Safety interrupt workflow

```mermaid
sequenceDiagram
    participant U as Student
    participant W as Current UI Widget
    participant S as Safety Service
    participant Q as Handoff Queue
    participant A as Alert Adapter
    participant C as Counselor Dashboard

    U->>S: Message or event
    S->>S: Apply approved rule and classifier policy
    alt No trigger
        S-->>W: Continue normal journey
    else Tier 2 or Tier 3
        S->>W: Pause current state and show approved response
        S->>Q: Create handoff event
        Q-->>C: Queue by tier and time
    else Tier 1
        S->>W: Freeze normal flow and focus support
        S->>Q: Create highest-priority event
        S->>A: Send immediate counselor alert
        A-->>C: Alert status
    end
    C->>Q: Mark actioned
    Q->>Q: Write immutable action audit
```

Claude does not write, rewrite, translate, or choose the approved safety response.

---

## 8. Recommendation workflow

```mermaid
flowchart LR
    Profile["Versioned ProfileSnapshot"] --> Normalize["Normalize student RIASEC and values"]
    Catalog["Versioned career catalog"] --> Compare["Compare against career vectors"]
    Normalize --> Compare
    Config["Versioned weights and feasibility table"] --> Score["Calculate fit score"]
    Compare --> Score
    Score --> Sort["Stable descending sort; title tie-break"]
    Sort --> Rings["Deterministic inner, middle and outer rings"]
    Rings --> Explain["fitExplanationData and ring reasons"]
    Explain --> Save["Immutable recommendation snapshot and hashes"]
    Save --> UI["Cards, maps, report and AI tools"]
```

The LLM receives the saved recommendation output. It does not receive raw data and then invent a ranking.

---

## 9. Knowledge retrieval workflow

```mermaid
flowchart TD
    Query["Tool request"] --> QueryType{"Structured or narrative?"}
    QueryType -->|"Structured"| SQL["PostgreSQL filters and verified records"]
    QueryType -->|"Approved narrative"| Hybrid["Metadata-filtered full-text or hybrid retrieval"]
    SQL --> Result["Typed result with source, version and caveat"]
    Hybrid --> ReviewGate{"Chunk approved and current?"}
    ReviewGate -->|"Yes"| Result
    ReviewGate -->|"No"| Exclude["Exclude from student response"]
    Result --> ToolExecutor["Return bounded tool result"]
```

### RAG decision

- Do not use RAG for scores, vectors, salaries, fees, application links, eligibility fields, or entity identity.
- Start the POC with PostgreSQL structured queries and full-text search.
- Add vector retrieval only for approved narrative descriptions/FAQs if evaluation shows a real need.
- Structured data wins if narrative text conflicts with a structured field.

---

## 10. Failure and degradation workflow

```mermaid
flowchart TD
    Request["Student request"] --> ClaudeUp{"Claude available?"}
    ClaudeUp -->|"Yes"| Normal["Tool-grounded conversational response"]
    ClaudeUp -->|"No"| Core["Continue deterministic core journey"]
    Core --> Static["Show stored reveal, maps and static top-five guidance"]
    Static --> Retry["Display friendly chat-unavailable message"]

    Normal --> Valid{"Grounding validation passes?"}
    Valid -->|"Yes"| Deliver["Deliver response"]
    Valid -->|"No; first failure"| Regenerate["Regenerate once"]
    Regenerate --> Valid
    Valid -->|"No; second failure"| SafeFallback["Template fallback from tool data"]
```

The following remain available without Claude:

- Authentication and consent.
- Intake and assessment.
- Scoring and result reveal.
- Career/college/aid matching.
- Ring maps and accessible lists.
- Stored report generation.
- Safety interrupts and counselor handoff.

---

## 11. Evaluation workflow

```mermaid
flowchart LR
    Cases["Versioned evaluation cases"] --> Runner["Evaluation runner"]
    Runner --> E1["Assessment correctness"]
    Runner --> E2["Recommendation determinism"]
    Runner --> E3["Knowledge source and freshness"]
    Runner --> E4["AI tool choice and grounding"]
    Runner --> E5["Safety red-team"]
    Runner --> E6["Accessibility, latency and load"]

    E1 --> Gate{"Release gate"}
    E2 --> Gate
    E3 --> Gate
    E4 --> Gate
    E5 --> Gate
    E6 --> Gate

    Gate -->|"All blocking checks pass"| Promote["Promote build"]
    Gate -->|"Any blocking check fails"| Block["Block release and assign owner"]
```

Evaluation is not another AI agent. It is a controlled set of fixtures, assertions, metrics, and reports. Model grading may support tone evaluation but cannot be the only judge for safety or deterministic correctness.

---

## 12. Why no multi-agent workflow in Phase 1

| Question                                      | YuvaNext answer                                             |
| --------------------------------------------- | ----------------------------------------------------------- |
| Are there several independent goals?          | No; one student journey with bounded exploration.           |
| Must different agents negotiate or debate?    | No. Deterministic services own facts.                       |
| Is long-running autonomous planning required? | No. Most responses should finish in one or two tool rounds. |
| Would specialized agents improve safety?      | Not by default; they add more model failure points.         |
| Is tool selection complex?                    | No; seven stable tools are manageable in one registry.      |
| Must actions be auditable?                    | Yes; a single orchestrator is easier to reconstruct.        |
| Must the app degrade without AI?              | Yes; multi-agent dependence would make this harder.         |

### Reconsider a workflow graph later only if

- A request reliably needs many dependent tool steps.
- Sessions require resumable long-running AI tasks.
- Tool count grows enough that selection quality drops.
- Counselors approve separate specialized prompt policies.
- Evaluation demonstrates measurable improvement over the simple tool loop.

Even then, introduce a state graph before introducing multiple autonomous personas.

---

## 13. Express request lifecycle

```mermaid
flowchart LR
    HTTP["HTTP or SSE request"] --> RequestID["Correlation ID and structured logging"]
    RequestID --> Security["Helmet, CORS and rate limits"]
    Security --> Auth["Student or staff authentication"]
    Auth --> Validate["Zod request validation"]
    Validate --> Route["Express route"]
    Route --> Service["Domain service"]
    Service --> Rules["Pure business rules"]
    Service --> Repo["Repository transaction"]
    Repo --> DB[("PostgreSQL")]
    Service --> Event["Audit/analytics event"]
    Service --> Response["Zod response validation"]
    Response --> Client["JSON or SSE"]
```

Express is the transport and middleware layer. It must not become a folder of route handlers containing scoring, SQL, and Claude calls together.

---

## 14. FigJam/Figma drawing specification

The primary FigJam board should have six left-to-right frames:

1. **Actors and Channels** — Student, Guardian, Counselor, React Web App.
2. **Deterministic Core** — Identity/Consent, Assessment/Scoring, Recommendation.
3. **Grounded Knowledge** — Catalog, retrieval tools, sources, freshness.
4. **Bounded AI Counselor** — Safety pre-check, Claude, tool executor, grounding linter.
5. **Outputs** — Chat, maps, report, share card, counselor queue.
6. **Cross-cutting Controls** — Safety, audit, privacy, evaluation, monitoring.

Suggested visual language:

- Blue: frontend and student journey.
- Green: deterministic business services.
- Purple: AI-only components.
- Amber: verified knowledge/data.
- Red: safety and restricted operations.
- Gray dashed arrows: evaluation/observability.

Every arrow should be labeled with a contract, such as `ProfileSnapshot`, `RecommendationSet`, `ToolResult`, `SafetyEvent`, or `WidgetDirective`.

Do not draw the system as five boxes in one straight line. The diagram must show:

- Module 3 feeding Modules 2 and 4.
- Module 1 feeding Modules 2 and 4.
- Module 5 surrounding/intercepting the runtime.
- Claude calling tools through Express rather than accessing the database.
- A no-Claude fallback path.

---

## 15. Final implementation rule

Use this rule during code review:

> If an operation must always produce the same answer from the same stored inputs, implement it as a deterministic TypeScript rule or database query. Use AI only when language understanding, explanation, or open-ended exploration adds value.

This boundary is the foundation of YuvaNext's reliability, safety, and auditability.
