# M1 -> M2 -> M3 UI/MVP Concept

Status: Ideate mode only. This document explains how the UI should be created later. No UI code is implemented here.

Brand placeholder: `{BRAND_NAME}`  
When the final brand name is provided, replace `{BRAND_NAME}` in the app header, welcome copy, report title, and share/download labels.

Design reference: `docs/reference/YuvaNext_Prototype.html`

## 1. What The UI Should Feel Like

Use the existing prototype as the main design reference:

- Left side: chat-style guided flow.
- Right side: live canvas/map/result panel.
- Top progress: journey steps such as Profile, Consent, Intake, Assessment, Results, Recommendations.
- Visual language: calm green education theme, soft cards, chips/buttons, progress bar, maps/bubbles/rings.
- MVP should feel like a working student app, not a marketing landing page.

The UI should keep the prototype idea, but connect it to the real backend modules:

- Module 1: onboarding, profile, consent, intake, assessment, profile snapshot.
- Module 2: deterministic recommendations from profile snapshot.
- Module 3: catalog/knowledge data for careers, streams, colleges, and aid schemes.

## 2. Actual Backend Modules In This Branch

Branch inspected: `poc/m1-m2-profile&recommendation`

Main app wiring:

- `apps/api/src/app/create-app.ts`
- `apps/api/src/app/modules.ts`

Registered backend modules:

- `@yuvanext/assessment` = Module 1
- `@yuvanext/recommendations` = Module 2
- `@yuvanext/knowledge` = Module 3

Module 1 important folders:

- `packages/assessment/src/http`
- `packages/assessment/src/application`
- `packages/assessment/src/infrastructure`
- `packages/assessment/src/domain`

Module 2 important folders:

- `packages/recommendations/src/http`
- `packages/recommendations/src/application`
- `packages/recommendations/src/domain`

Module 3 important folders:

- `packages/knowledge/src/http`
- `packages/knowledge/src/application`
- `packages/knowledge/src/infrastructure`
- `packages/knowledge/src/domain`

## 3. MVP User Flow

### Simple Flow

```text
Start
  -> Create Journey Session
  -> Create User Profile
  -> Guardian Consent if needed
  -> Intake Questions
  -> Intake Answers
  -> Start Assessment Run
  -> Get Next Assessment Items
  -> Save Assessment Responses
  -> Score Assessment
  -> Create Profile Snapshot
  -> Generate Recommendations
  -> Explore Careers / Streams / Pathways / Colleges / Aid
  -> Generate Plan
```

### Screen Flow

```text
Welcome Screen
  -> Profile Screen
  -> Guardian Consent Screen
  -> Intake Chat Screen
  -> Assessment Screen
  -> Results Reveal Screen
  -> Explore Map Screen
  -> Recommendation Tabs
  -> Detail Drawer
  -> 90-Day Plan Screen
  -> Final Report Screen
```

## 4. UI Screens

### 4.1 Welcome / Start Screen

Purpose:

Start a student journey and create the backend session.

UI:

- Header with `{BRAND_NAME}`.
- Friendly chat greeting.
- Start button: `Start my journey`.
- Optional anonymous session handling in future.

Backend call:

`POST /api/v1/journey-sessions`

Stores data in:

- `assessment.journey_sessions`

UI state saved:

- `sessionId`
- `userId` from auth/header

Why needed:

Everything in Module 1 needs a journey session id. It is the parent record for the flow.

### 4.2 Profile Screen

Purpose:

Collect basic student profile details.

UI:

- Chat asks name, date of birth/age, city, state, country, education stage, aid interest.
- Use chips/selects for `selfStage`.
- Show small profile card on canvas.

Backend calls:

`PUT /api/v1/journey-sessions/{sessionId}/user-profile`

Optional read:

`GET /api/v1/journey-sessions/{sessionId}/user-profile`

Stores data in:

- `assessment.user_profiles`

Important backend logic:

- Calculates age.
- Blocks under-12.
- Derives `ageBand`.
- Derives `segment`.

UI should not ask user to choose `explorer`, `pathfinder`, or `launcher`. Backend decides the segment.

### 4.3 Guardian Consent Screen

Purpose:

If student is a minor, collect guardian consent before saving sensitive flow data.

UI:

- Show guardian consent explanation.
- Ask guardian phone and student phone.
- Show OTP modal.
- Show pending/granted status.

Backend calls:

`GET /api/v1/journey-sessions/{sessionId}/guardian-consents/status`

`POST /api/v1/journey-sessions/{sessionId}/guardian-consents`

`POST /api/v1/journey-sessions/{sessionId}/guardian-consents/verify`

Stores data in:

- `assessment.guardian_consents`

Why needed:

Minor users need guardian permission before continuing with persistence-heavy parts of the flow.

### 4.4 Intake Chat Screen

Purpose:

Ask segment-specific intake questions before assessment.

UI:

- Chat question card.
- Answer chips for single choice.
- Multi-select chips where needed.
- Progress indicator: `2 of 5 intake questions`.

Backend calls:

`GET /api/v1/journey-sessions/{sessionId}/intake/questions?language=en`

`PUT /api/v1/journey-sessions/{sessionId}/intake/answers/{questionId}`

Reads questions from:

- `assessment.intake_question_sets`
- `assessment.intake_questions`

Stores answers in:

- `assessment.intake_answers`

Why needed:

Intake gives context such as education stage, support need, marks band, location, or career situation. Module 2 can later use this context through ProfileSnapshot.

### 4.5 Assessment Screen

Purpose:

Ask interest assessment questions and store answers.

UI:

- Chat left side asks one item or batch.
- Canvas right side shows live RIASEC bar/radar preview.
- Likert controls: 1 to 5.
- Progress: `12 of 60`.

Backend calls:

`POST /api/v1/journey-sessions/{sessionId}/assessment-runs`

`GET /api/v1/assessment-runs/{runId}/next`

`PUT /api/v1/assessment-runs/{runId}/responses`

Important real backend rule:

Frontend should send only:

```json
{
  "language": "en",
  "mode": "text"
}
```

Backend chooses the instrument:

- `explorer` -> `mini_ip_30`
- `pathfinder` -> `ip_60`
- `launcher` -> `ip_60`

Reads questions from:

- `assessment.assessment_definitions`
- `assessment.assessment_versions`
- `assessment.assessment_items`
- `assessment.assessment_item_options`

Stores answers in:

- `assessment.assessment_responses`

Updates progress in:

- `assessment.assessment_runs`

Why needed:

This is the core assessment collection step. `GET next` shows items. `PUT responses` saves answers.

### 4.6 Results Reveal Screen

Purpose:

Show the completed interest result.

UI:

- Result card with RIASEC code.
- Bars for R/I/A/S/E/C.
- Confidence label: normal/soft.
- Explanation text: "Your top areas are Investigative, Artistic, Conventional."
- CTA: `Open my explore map`.

Backend call:

`POST /api/v1/assessment-runs/{runId}/score`

Stores result in:

- `assessment.assessment_results`

Updates:

- `assessment.assessment_runs.status = scored`

Why needed:

This creates deterministic score output. Same answers produce same score.

### 4.7 Profile Snapshot Step

Purpose:

Freeze Module 1 output before Module 2 recommendations.

UI:

This can be invisible to the user. Show a small loading message:

`Preparing your recommendation profile...`

Backend call:

`POST /api/v1/journey-sessions/{sessionId}/assessment-runs/{runId}/profile-snapshot`

Stores data in:

- `assessment.profile_snapshots`
- `assessment.profile_snapshot_results`

UI state saved:

- `profileSnapshotId`

Why needed:

Module 2 recommendations should use stable snapshot data, not changing live answers.

## 5. Module 2 Recommendation Screens

Module 2 starts after `profileSnapshotId` exists.

### 5.1 Explore Map Screen

Purpose:

Show a visual recommendation map similar to the prototype bubbles/rings.

UI:

- Canvas map with bubbles.
- Tabs or segmented control:
  - Careers
  - Streams
  - Pathways
  - Colleges
  - Aid
  - Plan
- Inner/middle/outer ring display when response includes `rings`.

Backend calls:

`POST /api/v1/recommendations/careers`

`POST /api/v1/recommendations/streams`

`POST /api/v1/recommendations/pathways`

`POST /api/v1/recommendations/colleges`

`POST /api/v1/recommendations/aid`

`POST /api/v1/recommendations/plans`

Common request:

```json
{
  "profileSnapshotId": "...",
  "limit": 18
}
```

Stores data in:

- `recommendation.recommendation_runs`
- `recommendation.recommendation_items`
- `recommendation.recommendation_rings`
- `recommendation.generated_plans`
- `recommendation.generated_plan_steps`

Why needed:

This turns Module 1 profile data into ranked, explainable recommendations.

### 5.2 Career Recommendations

UI:

- 3-ring career map.
- Career cards:
  - title
  - rank
  - fit score
  - explanation
  - dataset version
- Detail drawer on click.

Backend:

`POST /api/v1/recommendations/careers`

Data source loads:

- profile from `assessment.profile_snapshots`
- careers from `knowledge.careers`
- interest profiles from `knowledge.career_interest_profiles`
- value profiles from `knowledge.career_value_profiles`
- configurations from `recommendation.matching_configurations`

### 5.3 Stream Recommendations

UI:

- Stream option bubbles for school students.
- Show matched RIASEC letters and reason.

Backend:

`POST /api/v1/recommendations/streams`

Data source loads:

- stream maps from `knowledge.stream_maps`
- stream map items from `knowledge.stream_map_items`
- stream options from `knowledge.stream_options`

Useful especially for:

- Explorer
- Pathfinder

### 5.4 Pathway Recommendations

UI:

- Pathway cards:
  - title
  - reachability
  - backup route
  - linked careers/streams

Backend:

`POST /api/v1/recommendations/pathways`

Data source loads:

- `knowledge.pathways`
- `knowledge.education_routes`
- `knowledge.career_pathways`

### 5.5 College Recommendations

UI:

- State filter.
- College cards:
  - college name
  - state
  - tier
  - college type
  - fit explanation

Backend:

`POST /api/v1/recommendations/colleges`

Data source loads:

- `knowledge.colleges`
- `knowledge.college_programs`
- `knowledge.pathway_disciplines`

### 5.6 Aid Recommendations

UI:

- Aid/scholarship cards:
  - scheme name
  - likelihood label
  - known matched facts
  - unknown facts
  - source URL

Backend:

`POST /api/v1/recommendations/aid`

Data source loads:

- `knowledge.aid_schemes`
- `knowledge.aid_criteria`

### 5.7 Plan Screen

UI:

- 90-day plan card.
- Steps grouped by time window.
- Optional steps marked clearly.
- Target entity shown if plan is for a career/pathway/stream.

Backend:

`POST /api/v1/recommendations/plans`

Stores generated plan in:

- `recommendation.generated_plans`
- `recommendation.generated_plan_steps`

## 6. Module 3 Catalog Screens

Module 3 can support public browsing/search screens and recommendation details.

### 6.1 Career Search

Backend:

`GET /api/v1/catalog/careers/search?q=software&limit=20`

UI:

- Search box.
- Career list.
- Click opens career details.

### 6.2 Career Detail

Backend:

`GET /api/v1/catalog/careers/{slug}`

UI:

- Career title.
- Short description.
- Skills/salary/progression if available.
- Dataset/caveat note.

### 6.3 Streams

Backend:

`GET /api/v1/catalog/streams?topTwo=IA&segment=explorer`

UI:

- Stream list for top-two RIASEC code.

### 6.4 Colleges

Backend:

`GET /api/v1/catalog/colleges?state=TN&limit=20`

UI:

- College cards.
- State filter.
- Pathway/discipline filter later.

### 6.5 Aid Schemes

Backend:

`GET /api/v1/catalog/aid-schemes?state=TN&limit=20`

UI:

- Scholarship/aid list.
- Filter by income/category later.

### 6.6 Dataset Provenance

Backend:

`GET /api/v1/catalog/datasets`

UI:

- Small "data version" drawer or footer.
- Shows source/provenance for transparency.

## 7. Recommended MVP Screen Order

Build UI in this order:

1. App shell: left chat pane, right canvas pane, top stepper.
2. Session + profile flow.
3. Guardian consent flow.
4. Intake question/answer flow.
5. Assessment run/next/response/score flow.
6. Profile snapshot creation.
7. Career recommendation map.
8. Stream/pathway recommendation tabs.
9. College and aid tabs.
10. Plan screen.
11. Final report screen.

## 8. Frontend State Needed

Minimum UI state:

```ts
type MvpState = {
  userId: string;
  sessionId?: string;
  profile?: unknown;
  segment?: "explorer" | "pathfinder" | "launcher";
  consentStatus?: unknown;
  intakeQuestions?: unknown[];
  assessmentRunId?: string;
  assessmentProgress?: {
    answered: number;
    total: number;
    nextPosition: number;
    isComplete: boolean;
  };
  assessmentResult?: unknown;
  profileSnapshotId?: string;
  recommendationIds?: {
    careers?: string;
    streams?: string;
    pathways?: string;
    colleges?: string;
    aid?: string;
    plan?: string;
  };
};
```

## 9. API Flow Summary

### Module 1

```text
POST journey-sessions
  -> returns session.id

PUT user-profile
  -> stores user profile and derives segment

GET guardian-consents/status
  -> decides consent UI

POST guardian-consents
POST guardian-consents/verify
  -> needed for minors

GET intake/questions
PUT intake/answers/{questionId}
  -> saves intake context

POST assessment-runs
GET assessment-runs/{runId}/next
PUT assessment-runs/{runId}/responses
POST assessment-runs/{runId}/score
  -> creates assessment result

POST profile-snapshot
  -> creates profileSnapshotId for Module 2
```

### Module 2

```text
POST recommendations/careers
POST recommendations/streams
POST recommendations/pathways
POST recommendations/colleges
POST recommendations/aid
POST recommendations/plans

GET recommendations/{id}
POST recommendations/{id}/replay
```

### Module 3

```text
GET catalog/datasets
GET catalog/careers/search
GET catalog/careers/{slug}
GET catalog/streams
GET catalog/colleges
GET catalog/aid-schemes
```

## 10. How I Would Create The UI Later

When we move from Ideate mode to Build mode:

1. Create a real frontend app shell based on the prototype layout.
2. Keep the prototype's chat + canvas idea, but remove hardcoded demo scoring.
3. Create API client functions for Module 1, Module 2, and Module 3.
4. Store IDs returned by backend in UI state.
5. Render each screen from real API responses.
6. Use optimistic UI only for visual progress, not for saved backend state.
7. Add loading/error states for every API call.
8. Add resume support using `GET journey-sessions/{sessionId}` and `POST resume`.
9. Use recommendation `rings` response to render the map.
10. Use catalog APIs for detail drawers and source/caveat notes.

## 11. Review Explanation

You can explain this to your mentor like this:

"The UI will follow the existing prototype's chat plus canvas design. But instead of demo data, it will connect to our real backend flow. Module 1 creates the profile snapshot. Module 2 uses that snapshot to generate deterministic recommendations. Module 3 provides the verified catalog data behind those recommendations. The UI stores important IDs like sessionId, runId, profileSnapshotId, and recommendationId, then moves the student step by step through the journey."

