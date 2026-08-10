# Module 2 Career Calculation Guide

## 1. Purpose

Module 2 converts a student's assessment profile and the published career catalogue into deterministic, ranked career recommendations.

The main flow is:

```text
Student profile from Module 1
          +
Published career data from Module 3
          ↓
Calculate a score for every career
          ↓
Sort careers by final fit score
          ↓
Use the top 18 candidates to build three rings
```

No LLM calculates the score, rank, or ring.

## 2. Input data

### Student data

Module 1 provides a profile snapshot like:

```ts
const studentProfile = {
  segment: "pathfinder",
  marksBand: "high",
  state: "Tamil Nadu",
  riasec: { R: 9, I: 10, A: 8, S: 4, E: 3, C: 2 },
  workValues: { R: 8, I: 9, A: 7, S: 5, E: 4, C: 3 },
};
```

The student's three-letter Holland code is `IRA`, but the engine uses all six numeric RIASEC values.

### Career data

Module 3 stores published careers in `knowledge.careers` and their RIASEC profiles in `knowledge.career_interest_profiles`.

```ts
const career = {
  careerId: "software-developer-id",
  title: "Software Developer",
  riasec: { R: 7, I: 10, A: 7, S: 3, E: 4, C: 6 },
  workValues: { R: 7, I: 9, A: 6, S: 4, E: 5, C: 4 },
  routeIds: ["bsc-computer-science-route-id"],
  verified: true,
};
```

The database adapter fetches every published career that has a career-interest profile. It does not pre-filter by the student's highest Holland-code letter.

## 3. RIASEC normalization

The engine normalizes the student and career vectors separately:

```text
normalized value = (value - minimum value) / (maximum value - minimum value)
```

For the student vector `[9, 10, 8, 4, 3, 2]`:

```text
minimum = 2
maximum = 10
range   = 8
```

The normalized values are:

| Letter | Original |    Calculation | Normalized |
| ------ | -------: | -------------: | ---------: |
| R      |        9 |  `(9 - 2) / 8` |    `0.875` |
| I      |       10 | `(10 - 2) / 8` |    `1.000` |
| A      |        8 |  `(8 - 2) / 8` |    `0.750` |
| S      |        4 |  `(4 - 2) / 8` |    `0.250` |
| E      |        3 |  `(3 - 2) / 8` |    `0.125` |
| C      |        2 |  `(2 - 2) / 8` |    `0.000` |

If all six original values are equal, the implementation returns six zeros.

## 4. Pearson correlation

Pearson correlation checks whether the student and career profiles follow a similar pattern.

```text
r = Σ((x - meanX)(y - meanY))
    ---------------------------------------------
    √Σ((x - meanX)²) × √Σ((y - meanY)²)
```

Its output range is:

```text
 1 = same pattern
 0 = no clear relationship
-1 = opposite pattern
```

### Worked example

Use these unnormalized arrays for a readable calculation. Positive min-max normalization does not change their Pearson correlation.

```text
Student = [9, 10, 8, 4, 3, 2]
Career  = [7, 10, 7, 3, 4, 6]
```

Their averages are:

```text
studentMean = (9 + 10 + 8 + 4 + 3 + 2) / 6 = 6
careerMean  = (7 + 10 + 7 + 3 + 4 + 6) / 6 = 6.166667
```

| Letter  | Student difference | Career difference | Multiplied differences | Student difference² | Career difference² |
| ------- | -----------------: | ----------------: | ---------------------: | ------------------: | -----------------: |
| R       |                `3` |        `0.833333` |             `2.500000` |                 `9` |         `0.694444` |
| I       |                `4` |        `3.833333` |            `15.333333` |                `16` |        `14.694444` |
| A       |                `2` |        `0.833333` |             `1.666667` |                 `4` |         `0.694444` |
| S       |               `-2` |       `-3.166667` |             `6.333333` |                 `4` |        `10.027778` |
| E       |               `-3` |       `-2.166667` |             `6.500000` |                 `9` |         `4.694444` |
| C       |               `-4` |       `-0.166667` |             `0.666667` |                `16` |         `0.027778` |
| **Sum** |                    |                   |               **`33`** |            **`58`** |    **`30.833333`** |

Therefore:

```text
r = 33 / (√58 × √30.833333)
  ≈ 33 / 42.298
  ≈ 0.7802
```

Calculations should use the original numeric precision and round only according to the configured rounding scale.

## 5. Interest fit

Pearson correlation ranges from `-1` to `1`. The engine converts it to a `0` to `1` score:

```text
interestFit = (r + 1) / 2
```

Using `r ≈ 0.7802`:

```text
interestFit = (0.7802 + 1) / 2
            ≈ 0.8901
```

All six RIASEC values affect this calculation. The engine does not use only the student's highest letter.

## 6. Values fit

Values fit compares the student's work-value vector with the career's work-value vector.

The current implementation uses the same steps as interest fit:

```text
1. Normalize both work-value vectors.
2. Calculate Pearson correlation.
3. Convert correlation from -1..1 to 0..1.

valuesFit = (workValueCorrelation + 1) / 2
```

Example:

```text
workValueCorrelation = 0.6
valuesFit = (0.6 + 1) / 2 = 0.8
```

If either work-value vector is missing, `valuesFit` is `undefined`. The configured values weight is then transferred to interest:

```text
normal weights:  interest 0.50, values 0.20
missing values:  interest 0.70, values 0.00
```

## 7. Feasibility

Feasibility is a rule lookup, not a mathematical similarity calculation.

The engine matches:

```text
student segment + marks band + career education route
```

Rules come from `recommendation.feasibility_rules`.

```ts
const rule = {
  segment: "pathfinder",
  marksBand: "high",
  routeId: "bsc-computer-science-route-id",
  reachability: 0.65,
  priority: 1,
};
```

If all three fields match, the engine uses `reachability`:

```text
feasibility = 0.65
```

Allowed values are:

|  Value | Meaning                                  |
| -----: | ---------------------------------------- |
| `0.30` | Currently difficult route                |
| `0.65` | Possible route that may need preparation |
| `1.00` | Strongly reachable route                 |

When multiple rules match, the lowest priority number wins. When no rule matches, the current fallback is `0.65`.

## 8. Context boost

Context boost is an approved priority lookup, not a student-assessment calculation.

```ts
const counselorPriorities = [
  {
    careerId: "software-developer-id",
    boost: 0.2,
  },
];
```

If the career ID matches, its boost is used. Otherwise, the boost is `0`.

```text
matching priority   → contextBoost = 0.2
no matching priority → contextBoost = 0
```

The implementation clamps the value to the `0..1` range. The current database adapter does not load counselor priorities from Supabase, so the normal database-backed default is `0` unless the caller supplies an approved list.

## 9. Final fit score

The current version-1 weights are:

```text
Interest    = 0.50
Values      = 0.20
Feasibility = 0.15
Context     = 0.15
Total       = 1.00
```

Formula:

```text
fitScore =
  interestFit × interestWeight
  + valuesFit × valuesWeight
  + feasibility × feasibilityWeight
  + contextBoost × contextWeight
```

Example:

```text
interestFit = 0.90
valuesFit   = 0.80
feasibility = 0.65
contextBoost = 0.20
```

```text
Interest contribution    = 0.90 × 0.50 = 0.4500
Values contribution      = 0.80 × 0.20 = 0.1600
Feasibility contribution = 0.65 × 0.15 = 0.0975
Context contribution     = 0.20 × 0.15 = 0.0300
                                             ------
Final fit score                            = 0.7375
```

The weights are versioned configuration, not universal scientific constants. Changes require product approval, a version increment, fairness review, and updated tests.

## 10. Scoring the complete catalogue

The engine performs the calculation once for every verified career loaded from the database:

```ts
const scoredCareers = careers
  .filter((career) => career.verified)
  .map((career) => calculateCareerScore(studentProfile, career));
```

For 1,000 published careers:

```text
1,000 career records loaded
1,000 interest-fit calculations
up to 1,000 values-fit calculations
1,000 feasibility lookups
1,000 context lookups
1,000 final fit scores
```

Each RIASEC comparison uses only six values.

## 11. Stable sorting

Careers are sorted by:

```text
1. Final fit score, descending
2. Normalized title, ascending, for equal scores
3. Career ID, ascending, if score and title are equal
```

This makes the result deterministic.

## 12. Three career rings

The engine takes the first 18 ranked careers as ring candidates:

```ts
const candidates = scoredCareers.slice(0, 18);
```

For a student whose highest letter is `I`:

### Inner ring

- Target count: 4.
- Prefer highly ranked careers whose own highest RIASEC letter includes `I`.
- Fill missing positions with the next unused ranked careers.

### Middle ring

- Target count: 6.
- The code's RIASEC circle is `R-I-A-S-E-C`.
- Letters adjacent to `I` are `R` and `A`.
- Prefer unused careers whose highest letter is `R` or `A`.
- Fill missing positions with the next unused ranked careers.

### Outer ring

- Target count: 6.
- Take the next unused ranked careers.
- If possible, ensure that at least one outer career has a vocational route by swapping with an earlier-ring vocational career.

The current implementation can display up to 16 ring items from the top 18 candidates: 4 inner, 6 middle, and 6 outer.

## 13. Current implementation limitations

- The outer ring does not yet explicitly select an unexpected cross-domain pairing.
- It does not directly use an ordered three-letter Holland code for outer-ring selection.
- Counselor priorities currently have no Supabase loader in the recommendation data source.
- Feasibility fallback `0.65` and all matching weights require owner review before production use.

## 14. Code locations

```text
Career database loading:
packages/recommendations/src/application/recommendation-data-source.ts

Career scoring and Pearson correlation:
packages/recommendations/src/domain/career-matching.ts

Career API route:
packages/recommendations/src/http/recommendation-routes.ts

Contracts and validation:
packages/contracts/src/recommendations.ts

Synthetic demonstration data:
packages/test-fixtures/src/module-2-demo.ts
```
