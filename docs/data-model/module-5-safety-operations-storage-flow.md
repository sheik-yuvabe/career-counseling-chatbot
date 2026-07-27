# Module 5 Safety and Operations Storage Flow

## Purpose

This is the Phase A implementation walkthrough. For every field and constraint, use [Module 5 data model](module-5-safety-operations-data-model.md) and [Module 5 MVP DBML](module-5-safety-operations-mvp.dbml).

Module 5 owns restricted safety decisions and handoffs plus staff authorization, audit, privacy jobs, analytics and evaluation. General counselor AI does not author safety copy or severity decisions.

## Safety pre-check

```text
Module 4 receives a user message
  -> call Module 5 with source_event_id and bounded context
  -> load approved policy, rules and exact message copy
  -> evaluate deterministic/approved classifier rules
  -> return SafetyDecision
  -> persist only what policy requires
```

### Normal message

```text
triggered       false
pauseJourney    false
createHandoff   false
```

The raw message is not copied into a permanent `not_triggered` safety row. A privacy-safe aggregate may be emitted without text.

### Triggered synthetic example

```text
source_event_id       source-msg-001
trigger text          [synthetic fixture omitted]
decision              triggered
tier                  approved test-policy value
approved_message_id   exact reviewed response
pause_journey         policy decision
create_handoff        policy decision
```

`safety_private.safety_events` stores the decision, rule version, hashes and bounded references. A trigger excerpt is encrypted and stored only when signed policy requires it.

## Handoff and alert

```text
triggered decision or explicit request
  -> create safety_private.handoffs
  -> attach minimal profile/recommendation/conversation references
  -> create alert_deliveries attempt
  -> counselor queue reads redacted packet
  -> append handoff_actions for staff actions
  -> update handoff status
```

`packet_snapshot_json` contains only the approved minimum. It excludes credentials, OTPs and unrestricted conversation history.

`alert_deliveries` records status and hashed provider/destination references. `handoff_actions` is append-only; corrections create another row.

## Staff authorization and audit

```text
Supabase auth.users
  -> operations.staff_profiles
  -> operations.staff_role_assignments
  -> authorized restricted action
  -> operations.audit_events
```

Every restricted packet view and queue action creates an audit event with safe metadata, actor, target and correlation ID. Passwords and MFA secrets remain with the identity provider.

## Privacy requests

```text
verified export/delete request
  -> create operations.privacy_jobs
  -> create one privacy_job_steps row per module
  -> idempotent workers process Modules 1-5
  -> record step completion or safe error
  -> finalize job
```

Exports point to a private expiring asset. Deletion step metadata never retains deleted content.

## Analytics

```text
approved application event
  -> validate event name and property allowlist
  -> reject PII and free text
  -> insert operations.analytics_events
```

Assessment-started, assessment-completed and report-generated counts are suitable. Names, phones, answers, messages, recommendation titles and safety excerpts are prohibited. If approved, `state` contains the full state/UT value, not a code.

## Evaluation

```text
CI/release starts evaluation
  -> read active evaluation_cases
  -> create evaluation_runs
  -> execute synthetic fixtures against Modules 1-5
  -> create one evaluation_results row per case
  -> aggregate blocking/warning summary
  -> pass or fail release
```

`evaluation_cases` stores synthetic inputs, expected outputs and assertions. Production personal data is forbidden. Deterministic scoring, authorization and safety failures cannot be overridden solely by an LLM judge score.

## Ownership boundaries

- Module 4 sends the pre-check request and obeys `SafetyDecision`.
- Module 5 does not rewrite conversation, assessment or recommendation truth.
- Ordinary application roles cannot query `safety_private` directly.
- Staff access is role-scoped and audited.
- Privacy workers coordinate modules without taking ownership of their tables.
- Exact safety tiers, copy and retention remain blocked until signed policy is approved.
