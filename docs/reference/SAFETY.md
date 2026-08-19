
# YuvaNext SAFETY.md

Status: MOCK SAMPLE ONLY - NOT SIGNED FOR PRODUCTION LAUNCH

Version: mock-safety-md-v1

Owner: Module 5 Safety/Evaluation

This file is a temporary implementation fixture for local integration testing. It demonstrates the structure expected from the signed safety policy, but it is not counselor-approved, legally reviewed, or launch-ready.

## Decision Model

Module 5 must run the safety pre-check before Module 4 sends a user message to the general counselor model.

The general counselor model must not author safety severity, approved copy, helpline references, or handoff policy. Safety decisions come only from this approved policy and its versioned rule set.

## Mock Tiers

### Tier 1

Use when the message suggests immediate or active risk.

Mock keywords:

- immediate danger
- right now danger
- emergency
- urgent help
- help me now
- not safe right now
- someone is attacking me
- someone is following me
- someone is trying to hurt me
- i might die
- about to hurt myself
- kill myself now
- suicide now
- hurt myself now
- end my life now
- i have a weapon
- took pills
- overdose

Decision:

- `pauseJourney: true`
- `createHandoff: true`
- immediate staff alert required

Approved message key:

- `mock_safety.tier_1`

### Tier 2

Use when the message suggests serious safety concern that requires staff review.

Mock keywords:

- self harm
- self-harm
- cut myself
- want to disappear
- end my life
- no reason to live
- planning suicide
- suicide
- hurt myself
- harm myself
- harm me
- being abused
- abuse at home
- forced to do something
- touched me
- molested
- blackmailing me
- threatened
- threatening me
- beat me
- hit me
- violence at home
- domestic violence
- sexual abuse
- assaulted

Decision:

- `pauseJourney: true`
- `createHandoff: true`

Approved message key:

- `mock_safety.tier_2`

### Tier 3

Use when the message suggests distress or support need, but not automatic pause/handoff in this mock policy.

Mock keywords:

- panic
- panic attack
- anxious
- anxiety
- overwhelmed
- hopeless
- worthless
- crying
- depressed
- lonely
- bullying
- bullied
- harassed
- unsafe
- very scared
- scared to go home
- cannot cope
- can't cope
- too much pressure
- everyone hates me

Mock non-safety moderation note:

- Profanity, insults, rude language, or angry language alone do not create a safety tier in this mock policy.
- If profane or abusive language appears together with self-harm, abuse, threat, violence, or serious distress indicators, classify by the safety-risk keyword.
- General tone handling stays with Module 4 unless the signed policy later defines a safety or staff-review requirement.

Decision:

- `pauseJourney: false`
- `createHandoff: false`

Approved message key:

- `mock_safety.tier_3`

## Approved Copy

The current approved copy is placeholder text stored in code and seeded into:

- `safety_private.safety_policy_versions`
- `safety_private.safety_rule_sets`
- `safety_private.approved_safety_messages`

Before launch, replace this mock document and code fixtures with the signed policy, exact approved user-facing copy, approved helpline references, retention rules, alert channels, and red-team suite.

## Launch Blocker

This mock document must not be used to claim production safety readiness.
