# YuvaNext Data Model and Assessment Decisions v1

## Purpose

This document converts the Phase 1 PRD's data-model and scoring notes into backend design decisions for the Express + Supabase implementation. It also records which decisions are frozen, provisional, deferred, or still blocked.

Authoritative and related sources:

- [Phase 1 PRD](../../prd-phase1.md.docx)
- [Five-module POC plan](../poc/README.md)
- [Collaboration and integration plan](../architecture/yuvanext-collaboration-integration-plan.md)
- [Canonical user flow](../ux/yuvanext-prd-user-flow.md)

The PRD remains the product source of truth. This document may deliberately simplify a backend POC behavior, but every such difference is marked explicitly and must be reconciled before launch.

## 1. What the PRD already defines

Section 6 of the PRD provides a compact PostgreSQL model containing:

```text
users
consents
sessions
assessment_items
responses
results
careers
pathways
streams_map
colleges
aid_schemes
career_profiles
recommendations
conversations
missions
safety_events
config
staff
audit_log
```

This is a product-level model, not a complete physical database design. It uses ellipses, broad JSONB payloads, and an external `asset_pack` schema for assessment items. The physical Supabase model must add versioning, state, constraints, privacy boundaries, immutable snapshots, integration identifiers, indexes, and deletion behavior.

## 2. Three meanings of vector

The word `vector` has three unrelated meanings in this project.

### Test vector

A test vector is a known input with an exact expected output:

```text
Known assessment answers
        ↓
Expected scores, code, confidence, ranking or rings
```

It is an automated-test fixture, not an AI embedding.

### RIASEC vector

A RIASEC vector contains six interest scores:

```json
{ "R": 14, "I": 44, "A": 31, "S": 22, "E": 18, "C": 38 }
```

It is used for interest reporting and deterministic career matching.

### RAG embedding vector

A RAG embedding is a high-dimensional numeric representation of text used for semantic retrieval. If needed later, Supabase can store embeddings using PostgreSQL's `pgvector` extension.

These three types must use different names in code:

```text
AssessmentTestCase
RiasecScores / RiasecProfile
DocumentEmbedding
```

Do not name all three simply `Vector`.

## 3. Assessment instrument glossary

### IP-60

The 60-item O*NET Interest Profiler:

```text
10 Realistic items
10 Investigative items
10 Artistic items
10 Social items
10 Enterprising items
10 Conventional items
```

### Mini-IP-30

The shorter 30-item Interest Profiler:

```text
5 items for each of the six RIASEC scales
```

### WIP

The Work Importance Profiler measures six work values:

```text
Achievement
Independence
Recognition
Relationships
Support
Working Conditions
```

It produces normalized value scores and a top-two values result. It does not produce a Holland code.

### Mini-IPIP

The Mini International Personality Item Pool measures Big Five personality traits. It is separate from the O*NET Interest Profiler and does not produce a Holland code.

The PRD requires reverse-keyed scoring using `6 - response`, four items per trait, and these result bands:

```text
low: 9 or below
mid: 10 to 15
high: 16 or above
```

### Photo Career Quiz

A 16-pair visual interest instrument. Selecting a work-scene image adds two points to the mapped RIASEC scale.

### Aptitude sample

An optional 12-item sample:

```text
4 numerical
2 abstract/letter
3 verbal
3 matrix
```

It may show subtype bands only when approved norming exists. It must not produce an IQ-like number or block a career.

## 4. PRD test vectors

The PRD's test vectors become Vitest fixtures even though the PRD calls them `pytest answer keys`.

| ID   | Purpose                 | Expected behavior                                                             |
| ---- | ----------------------- | ----------------------------------------------------------------------------- |
| TV-1 | Dominant IP-60 result   | `I=50`, other scales `=10`; deterministic fallback produces `IRA`             |
| TV-2 | Realistic mixed result  | `{R:14,I:44,A:31,S:22,E:18,C:38}` produces `ICA`                              |
| TV-3 | Quality-control failure | Scores/code remain TV-2; confidence becomes `soft`                            |
| TV-4 | Explorer Mini-IP        | Strong A and next S result starts with `AS`                                   |
| TV-5 | WIP forced-choice bound | Forced choice cannot reorder values separated by `>=0.05` normalized gap      |
| TV-6 | Career matching         | Known student and career RIASEC profiles produce an exact ranking/explanation |
| TV-7 | Career rings            | Known 18-career fixture produces identical inner/middle/outer partitions      |

Recommended locations:

```text
tests/test-vectors/assessment/tv-1.json
tests/test-vectors/assessment/tv-2.json
tests/test-vectors/assessment/tv-3.json
tests/test-vectors/assessment/tv-4.json
tests/test-vectors/assessment/tv-5.json
tests/test-vectors/recommendations/tv-6.json
tests/test-vectors/recommendations/tv-7.json
```

## 5. Frozen response scale: store 1-5

### Decision

Store the student's raw selection as an integer from `1` to `5`:

```text
1 = Strongly dislike
2 = Dislike
3 = Unsure
4 = Like
5 = Strongly like
```

Do not use `1-4`. The official scoring alternative discussed in the O*NET manual is `0-4`, not `1-4`.

### Why 1-5 is selected

- It matches the PRD and its TV-1/TV-2 expected scores.
- It matches the five UI choices returned by the O*NET question service.
- It avoids subtracting one during raw score reporting.
- It keeps the backend and frontend response contract easy to validate.
- It does not affect letter ordering when all six scales have equal item counts.

### Raw scale sums

```text
IP-60:     10 to 50 per scale
Mini-IP:    5 to 25 per scale
```

### Normalize only for matching

Convert a scale sum to `0-1` before comparing it with a career vector:

```ts
normalized = (rawScore - minimumScore) / (maximumScore - minimumScore);
```

Therefore:

```ts
ip60Normalized = (rawScore - 10) / 40;
miniIpNormalized = (rawScore - 5) / 20;
```

This produces the same normalized position as first converting every answer from `1-5` to `0-4`, while preserving the PRD's raw score ranges.

### Database constraint

```sql
check (response_value between 1 and 5)
```

Photo-pair and MCQ responses should use typed response columns/payloads rather than pretending every item is Likert `1-5`.

**Freeze status:** Frozen for Phase A and Phase 1 unless the assessment owner explicitly changes the PRD and test vectors.

## 6. RIASEC calculation

### Standard path

1. Load the completed assessment run and its instrument version.
2. Exclude quality-control items from scale totals.
3. Group scored items by `R`, `I`, `A`, `S`, `E`, or `C`.
4. Sum raw `1-5` responses for each scale.
5. Rank scales by score descending.
6. Apply the approved tie behavior.
7. Join the top three letters to form the Holland code.
8. Set `confidence=soft` when a QC rule fails; do not alter the scores/code.

Example:

```text
I=44, C=38, A=31, S=22, E=18, R=14
                    ↓
                   ICA
```

### Deterministic fallback order

If relevant scores remain equal, the PRD's fixed fallback order is:

```text
R > I > A > S > E > C
```

The scorer must be a pure, versioned TypeScript function and must not call an LLM.

Recommended location:

```text
packages/assessment/src/domain/score-riasec.ts
```

## 7. Tie-break mapping decision

### Current problem

The PRD says that four tie-break items must be served when the rank-3/rank-4 gap is `<=2`. The current workspace does not contain an approved tie-break item bank or a mapping showing how those four answers adjust the competing scales.

Inventing psychometric questions or weights in backend code would be incorrect.

### Phase A backend POC behavior

For the backend POC:

```text
rank-3/rank-4 gap <= 2
        ↓
record close_scores=true
        ↓
use fixed R>I>A>S>E>C fallback for an exact tie
```

The data model and scorer should support an optional tie-break run, but Phase A will not fabricate tie-break items.

### Phase 1 launch requirement

Before claiming complete compliance with PRD US-10, an assessment/content owner must provide:

- four approved item definitions.
- scale mapping for every item/option.
- whether scores add to the base result or only reorder ranks 3 and 4.
- exact handling of partial completion.
- expected test fixtures.

**Freeze status:** Phase A fallback frozen; production tie-break content remains a P0 launch blocker.

## 8. Assessment item data

`YuvaNext_Prototype.html` and its embedded assessment data are demonstration fixtures. They are not the production assessment source of truth.

For Phase A:

- Use clearly labelled synthetic/mock items.
- Store them in versioned seed fixtures.
- Test delivery, persistence, scoring and resume behavior.
- Do not claim psychometric validity from prototype questions.

Before production:

- obtain the approved/licensed instrument item bank.
- document instrument and item versions.
- obtain assessment-owner review.
- add language and review-status metadata.
- add approved QC and tie-break mappings.

Minimum assessment-item properties:

```text
id
instrument_code
instrument_version
item_order
item_type
prompt_key / approved_text
age_band
language
scale_code
reverse_scored
scoring_key
is_qc
qc_rule
is_tie_break
review_status
source
active_from
retired_at
```

**Freeze status:** Mock fixtures approved for Phase A only; production content remains pending.

## 9. Student and guardian phone decisions

### Student phone

Supabase Auth owns the student's login phone. Application tables reference `auth.users.id` and do not duplicate the full student phone.

If a later feature requires phone search or display, add a deliberate protected projection rather than copying it into every profile or session record.

**Freeze status:** Frozen.

### Guardian phone

A guardian phone number is personal data. Avoiding field-level encryption is reasonable only when the application does not need to retain a contactable number.

Recommended simple Phase A design:

1. Receive the normalized guardian phone in Express over HTTPS.
2. Use it to send/verify the guardian OTP.
3. Keep the contactable number only in a short-lived challenge store with a strict TTL.
4. Delete it after grant, decline, expiry, or maximum attempts.
5. Persist only:

```text
guardian_phone_hash
guardian_phone_last4
consent_status
consent_text_version
requested_at
verified_at / declined_at / expired_at
```

This proves that a guardian number was verified without retaining a reusable plaintext contact number.

If future counselor/notification requirements need re-contact, introduce a separately authorized encrypted field such as `guardian_phone_ciphertext`, with key management, access logging, masking, and retention limits. Do not later change a general-purpose plaintext column into a contact directory by accident.

Indian data-protection requirements treat verifiable parental consent and reasonable security safeguards as important obligations. This design is a technical recommendation, not a substitute for legal/privacy review.

**Freeze status:** Provisional Phase A decision. Security/privacy owner must approve before production.

## 10. Pre-consent storage behavior

### Meaning

The prototype/PRD concept allows a minor to continue while guardian consent is pending. `Pre-consent storage` asks where those answers exist before permission is granted.

Possible behaviors:

```text
A. Store answers in Supabase before consent
B. Keep answers only in browser IndexedDB until consent
C. Do not start the assessment until consent is granted
```

Option A is rejected because it durably processes the minor's answers before guardian consent.

Option B is the prototype's ephemeral-mode concept. On grant, the browser uploads queued answers; on decline/expiry/logout, it deletes them. This adds IndexedDB expiry, purge, resume, device-loss, and legal-review complexity.

### Phase A decision

Use Option C:

```text
student OTP verified
        ↓
minor detected
        ↓
guardian consent requested
        ↓
pending screen / non-personal product preview
        ↓
consent granted
        ↓
intake and assessment begin
```

This is the simplest backend and privacy behavior. No assessment answer exists before consent, so no ephemeral synchronization system is required.

This intentionally simplifies the prototype/PRD pending-continuation experience. If product later requires continuing while pending, Option B must be designed and reviewed as a separate feature.

**Freeze status:** Frozen for Phase A; product/privacy review required before carrying the change into final Phase 1 acceptance.

## 11. RAG decision

RAG is not required for Phase A or the core Phase 1 journey.

Required retrieval uses structured, verified PostgreSQL records:

```text
get_profile
match_careers
get_career
get_streams
get_colleges
get_aid_schemes
```

Structured records remain authoritative for:

- careers and pathways.
- scores and fit explanations.
- college records.
- scholarship facts and URLs.
- salary fields.
- recommendation ranks and rings.

Optional RAG may be introduced later for approved narrative content, long guidance documents, FAQs, and multilingual knowledge. Supabase `pgvector` is a compatible future extension, but no embedding table or vector index is required now.

**Freeze status:** RAG deferred; preserve an extension point only.

## 12. Logical Supabase model by module

### Supabase-managed identity

```text
auth.users
```

### Module 1: assessment schema

```text
user_profiles
anonymous_sessions
journey_sessions
guardian_consents
intake_question_sets
intake_questions
intake_answers
assessment_definitions
assessment_versions
assessment_items
assessment_runs
assessment_responses
assessment_results
profile_snapshots
profile_snapshot_results
retake_authorizations
```

### Module 2: recommendation schema

```text
matching_configurations
feasibility_rules
recommendation_runs
recommendation_items
recommendation_rings
plan_templates
generated_plans
missions
```

### Module 3: knowledge schema

```text
knowledge_sources
dataset_versions
careers
career_riasec_vectors
career_value_vectors
career_profiles
career_pathways
education_routes
streams_map
degrees
examinations
colleges
college_programs
aid_schemes
aid_conditions
narrative_documents
```

No embedding column is required during Phase A.

### Module 4: counselor schema

```text
conversations
conversation_messages
conversation_summaries
tool_calls
journey_states
exploration_events
report_snapshots
generated_assets
```

### Module 5: restricted safety and operations schemas

```text
safety_private.safety_events
safety_private.handoffs
safety_private.handoff_actions
safety_private.approved_safety_messages
operations.staff_profiles
operations.staff_role_assignments
operations.audit_events
operations.privacy_jobs
operations.analytics_events
operations.evaluation_cases
operations.evaluation_runs
operations.evaluation_results
operations.system_config
```

## 13. Required improvements over the PRD's short model

| PRD shortcut                                   | Physical-model improvement                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `responses(user_id,item_id,...)`               | Add `assessment_run_id`, version, unique run/item constraint and idempotency                                     |
| `results(...scores jsonb...)`                  | Add run ID, instrument/algorithm versions, normalized scores and immutable result version                        |
| `recommendations(...payload jsonb...)`         | Separate immutable run/items, hashes, configuration and dataset versions                                         |
| `profile_snapshot jsonb` inside recommendation | Create an immutable `profile_snapshots` record and reference its ID; optionally retain a hashed payload snapshot |
| one `conversations` table per turn             | Split conversation, message, summary and tool-call records                                                       |
| `safety_events` only                           | Add handoff/action state and restricted access/audit                                                             |
| `staff.totp_secret`                            | Use protected authentication/MFA instead of a generally readable secret column                                   |
| `config(key,value)`                            | Validate, version and restrict configuration by owning domain                                                    |
| `ephemeral` server responses                   | Do not collect assessment responses until consent in Phase A                                                     |
| soft-delete sentence only                      | Add privacy jobs, deletion deadlines and retention exceptions                                                    |

## 14. Freeze register

| ID   | Decision                                                                        | Status         | Revisit trigger                                         |
| ---- | ------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------- |
| F-01 | Store raw Likert responses as `1-5`                                             | Frozen         | Assessment owner changes PRD/test vectors               |
| F-02 | Normalize RIASEC to `0-1` only for matching                                     | Frozen         | Matching-method review                                  |
| F-03 | RIASEC scoring is local deterministic TypeScript                                | Frozen         | None expected                                           |
| F-04 | No third-party npm scorer required                                              | Frozen         | Approved scorer demonstrates exact PRD compatibility    |
| F-05 | Mock assessment items are Phase A fixtures only                                 | Frozen         | Approved production item bank arrives                   |
| F-06 | Fixed fallback when tie-break content is unavailable                            | Phase A only   | Approved tie-break mapping arrives                      |
| F-07 | Missing production tie-break mapping blocks US-10 compliance                    | Open P0        | Assessment owner supplies content/rules                 |
| F-08 | User login phone remains in Supabase Auth                                       | Frozen         | New verified product requirement                        |
| F-09 | No duplicate user-phone field                                                   | Frozen         | Search/contact use case approved                        |
| F-10 | Guardian contactable number is transient; DB stores hash/last4                  | Provisional    | Re-contact requirement or privacy review                |
| F-11 | Do not start minor assessment before guardian consent                           | Phase A frozen | Product/privacy approve IndexedDB pending mode          |
| F-12 | RAG/pgvector excluded from Phase A                                              | Frozen         | Approved narrative retrieval use case                   |
| F-13 | One Supabase project, module-owned PostgreSQL schemas                           | Frozen         | Deployment architecture changes                         |
| F-14 | Store the full state/UT text; do not convert onboarding input into a state code | Frozen         | Approved nationwide geography-normalization requirement |
| F-15 | Use `user_profiles` and `journey_sessions` for all participant types            | Frozen         | Platform identity model changes                         |

## 15. Remaining decisions before physical migrations

The following must be completed before declaring Data Model v1 implementation-ready:

1. Obtain or define the full `assessment_items` schema and production source.
2. Define item/license/review ownership for IP-60, Mini-IP, WIP and Mini-IPIP.
3. Obtain approved tie-break items and mappings, or formally amend PRD US-10.
4. Confirm guardian OTP provider and challenge TTL/attempt policy.
5. Confirm whether a guardian must ever be contacted after consent.
6. Define exact age representation and age-at-assessment snapshot behavior.
7. Approve retention periods for conversations, reports, guardian records and safety events.
8. Approve schema access roles and RLS/Data API exposure.
9. Define every table's columns, constraints, indexes and deletion rules.
10. Review the complete ERD across all five modules.

## 16. Next deliverables

Build the database design in this order:

```text
Decision foundation (this document)
        ↓
Global context model
        ↓
Module 1 detailed table dictionary and ERD
        ↓
Module 3 detailed table dictionary and ERD
        ↓
Module 2 detailed table dictionary and ERD
        ↓
Module 4 detailed table dictionary and ERD
        ↓
Module 5 detailed table dictionary and ERD
        ↓
Cross-module global ERD
        ↓
Supabase SQL migrations and seed fixtures
```

The design is on the correct track, but the current state is a reviewed decision foundation rather than a frozen physical database schema.

## 17. External references

- [O*NET Mini-IP questions and five response choices](https://services.onetcenter.org/reference/mnm/ip/ip_questions_30)
- [O*NET Interest Profiler manual](https://www.onetcenter.org/dl_files/IP_Manual.pdf)
- [Supabase vector columns and pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [DPDP Act Section 8: security safeguards and erasure](https://www.indiacode.nic.in/show-data?abv=CEN&actid=AC_CEN_45_0_00003_2023-22_1763464807080&orderno=8&orgactid=AC_CEN_45_0_00003_2023-22_1763464807080&sectionId=101275&sectionno=8&statehandle=123456789%2F1362)
- [DPDP Act Section 9: verifiable parental consent](https://www.indiacode.nic.in/show-data?abv=CEN&actid=AC_CEN_45_0_00003_2023-22_1763464807080&orderno=9&orgactid=AC_CEN_45_0_00003_2023-22_1763464807080&sectionId=101275&sectionno=9&statehandle=123456789%2F1362)
- [MeitY Digital Personal Data Protection Rules 2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa)
