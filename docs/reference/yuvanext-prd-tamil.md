# YuvaNext தொழில் வழிகாட்டல் Chatbot — PRD தமிழாக்கம் மற்றும் தொகுதி பிரிப்பு

> மூல ஆவணம்: `prd-phase1.md.docx`  
> PRD பதிப்பு: Phase 1 MVP v0.1 draft + Phase 2 Addendum v0.2, July 2026  
> இந்த ஆவணத்தின் நோக்கம்: PRD-ஐ எளிய தமிழில் விளக்குவது, ஐந்து பெரிய development modules ஆகப் பிரிப்பது, ஒவ்வொரு module-க்கும் தனித்த POC உருவாக்க ஒரே folder structure மற்றும் integration contract வழங்குவது.

## முக்கியக் குறிப்பு

இது மூல PRD-இன் விளக்கத் தமிழாக்கம். `US-xx`, `CV-xx`, `S-xx`, `W-xx`, API பெயர்கள், data-field பெயர்கள் போன்றவை development மற்றும் testing traceability-க்காக ஆங்கிலத்திலேயே வைக்கப்பட்டுள்ளன. ஏதேனும் முரண்பாடு இருந்தால் மூல PRD, `DECISIONS.md`, `SAFETY.md`, Blueprint மற்றும் asset files தான் authoritative source.

மேலும், **Phase 1 product ஆங்கிலத்தில் மட்டும் வெளியிடப்படுகிறது**. இந்த PRD தமிழாக்கம் project team புரிந்துகொள்ள உருவாக்கப்பட்டது; இதனால் Phase 1 scope-இல் Tamil UI சேர்க்கப்படாது. Tamil UI என்பது Phase 2 (`US-24`, `US-25`).

---

## 1. திட்டத்தின் சுருக்கம்

YuvaNext என்பது `yuvabeeducation.com`-ன் subdomain-இல் இயங்கும் web-based career-counselling chatbot. இது மூன்று மாணவர் குழுக்களுக்கு சேவை செய்கிறது:

- **Explorer (12–16):** ஆர்வங்களை அறிந்து, subject/stream மற்றும் ஆரம்ப career ideas பெறுதல்.
- **Pathfinder (17–18):** interest code, values, 3–5 pathways, degrees, entrance exams, colleges மற்றும் backup routes பெறுதல்.
- **Launcher (graduates / பொதுவாக 19+):** முழுமையான profile, ranked careers மற்றும் 90-day action plan பெறுதல்.
- **Counselor:** sessions, assessment confidence, handoff மற்றும் safety queue-ஐ read-only dashboard-ல் பார்வையிடுதல்.

Phase 1-ல் அடங்குபவை:

- Phone OTP account மற்றும் minor-களுக்கான guardian OTP consent.
- IP-60, Mini-IP-30, WIP, Mini-IPIP assessments.
- Explorer/Pathfinder-க்கு optional Photo Career Quiz மற்றும் 12-question aptitude sample.
- ஒரே input-க்கு எப்போதும் ஒரே output தரும் deterministic scoring.
- Curated 335 careers மீது matching; browser search-ல் மொத்தம் 1,016 career titles.
- ஐந்து தென்னிந்திய மாநிலங்களுக்கான 183 seed colleges.
- 56 education-aid / scholarship schemes.
- Claude மூலம் database-grounded guidance chat.
- Career/college/scholarship ring maps, report card, PDF மற்றும் privacy-safe share card.
- Read-only counselor dashboard, handoff மற்றும் `SAFETY.md` protocol.

Phase 1-ல் இல்லாதவை:

- Tamil UI, WhatsApp chatbot channel, full locally normed aptitude battery.
- Native mobile apps, payments, parent portal, school-code login, email channel.
- Counselor dashboard-ல் queue action தவிர மற்ற write/edit வசதிகள்.
- NCO-2015 merge மற்றும் recommendation-weight editing UI.

---

## 2. பயனர் பயணம்

### 2.1 பொதுவான journey

1. Landing page-ல் இருந்து chat தொடங்கும்.
2. OTPக்கு முன் first name, age, city, state மற்றும் fixed country `India` கேட்கப்படும்.
3. Age மற்றும் self-described education stage மூலம் Explorer / Pathfinder / Launcher route தேர்வு செய்யப்படும்.
4. Phone OTP வெற்றி பெற்றதும் anonymous session account-க்கு merge செய்யப்படும்.
5. 18 வயதுக்குக் குறைவானவர்களுக்கு assessment item 1க்கு முன் guardian consent தொடங்கும்.
6. Segment-க்கு ஏற்ற intake questions கேட்கப்படும்.
7. Assessment, scoring மற்றும் profile reveal நடைபெறும்.
8. Career/stream/pathway/college/scholarship guidance மற்றும் free exploration வழங்கப்படும்.
9. இறுதியில் report card, PDF, share card மற்றும் counselor handoff options கிடைக்கும்.

### 2.2 UI அமைப்பு

Product ஒரு **Chat + Canvas** split-screen experience:

- Desktop: இடப்புறம் சுமார் 390px chat; வலப்புறம் பெரிய visual canvas.
- Mobile (`<900px`): chat மேலே, canvas கீழே.
- Questions, chips, Likert answers போன்ற inputs chat-ல் இருக்கும்.
- Profile bars, reveal, career maps, college maps, scholarship maps, report போன்ற outputs canvas-ல் வரும்.
- Chat மட்டுமே journey-ஐ முன்னேற்றும்; canvas தனியாக flow state-ஐ மாற்றாது.
- அனைத்து radial maps-க்கும் accessible list-view மாற்று அவசியம்.

Canvas states:

- `CV-1`: Welcome.
- `CV-2`: “About you” profile facts.
- `CV-3`: Assessment நடக்கும் போது live RIASEC bars.
- `CV-4`: Final interest-code reveal.
- `CV-5`: Stream/pathway/career explore map.
- `CV-6`: தேர்ந்தெடுத்த bubble-ன் focus view.
- `CV-7`: Scholarship three-ring map.
- `CV-8`: Career three-ring map.
- `CV-9`: College three-ring map.
- `CV-10`: Full report card.

Canvas மேல் எப்போதும் journey breadcrumb:

`Your details → Assessment → Your code → Careers & education → Report & card`

Resume செய்தாலும் இந்த state சரியாகத் தொடர வேண்டும். முடிந்த step-ஐ tap செய்தால் recap-க்கு scroll செய்யலாம்; வரவிருக்கும் step-க்கு நேரடியாக செல்ல முடியாது.

---

## 3. User stories — தமிழில் விளக்கம்

### 3.1 Onboarding, account மற்றும் consent

#### US-01 — தடையில்லாமல் தொடங்குதல்

- OTP wall வருவதற்கு முன் name, age, city, state, country கேட்க வேண்டும்.
- OTPக்கு முன் anonymous session row தவிர வேறு personal data server-ல் persist ஆகக்கூடாது.
- 12 வயதிற்குக் குறைந்தவர்களுக்கு parent/teacher உடன் பின்னர் வரச் சொல்லி எந்த data-வும் சேமிக்கக் கூடாது.
- Tamil Nadu, Kerala, Karnataka, Telangana, Andhra Pradesh primary chips; மற்ற இந்திய மாநிலங்களுக்கு expander.
- Country Phase 1-ல் `India` என fixed; state college மற்றும் scholarship default filter-ஐ நிர்ணயிக்கும்.

#### US-02 — Phone OTP account

- 10-digit Indian mobile validation.
- OTP 5 நிமிடங்களில் expire; 3 தவறான முயற்சிக்குப் பிறகு 30 நிமிட lock.
- 30 விநாடிக்கு பின் resend; அதிகபட்சம் 3 resend.
- Verify ஆனதும் anonymous progress account-க்கு merge ஆக வேண்டும்.

#### US-03 — Minor-களுக்கான guardian consent

- Segment route முடிந்த பின், முதல் assessment answerக்கு முன் consent தொடங்க வேண்டும்.
- Guardian phone மற்றும் student phone ஒன்றாக இருக்கக் கூடாது.
- Guardian-க்கு OTP மற்றும் குறுகிய விளக்க SMS செல்ல வேண்டும்.
- Consent pending என்றால் assessment தொடரலாம்; responses local/ephemeral-ஆக மட்டுமே இருக்கும்.
- Approval வந்ததும் ephemeral responses server-க்கு sync ஆகும்.
- Decline அல்லது 7 நாள் timeout ஏற்பட்டால் ephemeral data purge ஆக வேண்டும்.
- Guardian phone hashed வடிவில் consent text version மற்றும் timestamp உடன் பதிவு செய்ய வேண்டும்.

#### US-04 — Segment routing

- பொதுவாக `≤16 = Explorer`, `17–18 = Pathfinder`, `≥19 = Launcher`.
- ஆனால் self-described education stage age-ஐ override செய்யலாம்.
- உதாரணம்: 17 வயதில் college முடித்த/செல்லும் student Launcher; 19 வயதில் Class 12 student Pathfinder.
- Age மற்றும் stage இரண்டும் audit-க்காக store செய்யப்பட வேண்டும்.

### 3.2 Intake

#### US-05 — Segment-க்கு ஏற்ற context questions

- Explorer: 5, Pathfinder: 7, Launcher: 9 questions.
- Enumerable answers free text ஆக இல்லாமல் chips ஆக இருக்க வேண்டும்.
- Family expectation, budget போன்ற sensitive questions-க்கு “Prefer not to say”.
- Exact marks கேட்காமல் marks band மட்டும் கேட்க வேண்டும்.
- Launcher Q9 aid interest; `Yes` என்றால் `wants_aid=true`.
- Aid schemes assessment முடிந்த பிறகே காட்டப்பட வேண்டும்.
- Pathfinder college state selector user state-ஐ default ஆகக் கொள்ள வேண்டும்.

### 3.3 Assessment engine

#### US-06 — Item delivery

- Items `assessment_items.csv`/DB-இல் இருந்து instrument மற்றும் age-band மூலம் filter செய்யப்பட வேண்டும்.
- DB text மாற்றமின்றி verbatim render ஆக வேண்டும்.
- Fixed order; Explorer batch size 5, மற்றவர்களுக்கு 10.
- 60-item run-ல் QC positions 3 மற்றும் 42; 30-item run-ல் position 3 மட்டும்.

#### US-07 — பதில்களை இழக்காத capture

- ஒவ்வொரு tap-க்கும் user, item, 1–5 response, latency, session, timestamp பதிவு.
- Next item காட்டுவதற்கு முன் persistence request தொடங்க வேண்டும்.
- Network failure-ல் optimistic UI, local retry queue மற்றும் non-blocking toast.
- Reconnect ஆனதும் queue flush ஆக வேண்டும்.
- Double tap idempotent ஆக கையாளப்பட வேண்டும்.

#### US-08 — Resume

- 14 நாட்களுக்குள் திரும்பினால் exact next unanswered item-ல் தொடர வேண்டும்.
- 14 நாட்களுக்கு மேல் continue-or-restart choice.
- Account இருப்பதால் cross-device resume ஆதரிக்க வேண்டும்.

#### US-09 — Pacing மற்றும் response quality

- Batch median latency 800ms-க்கு கீழ் என்றால் ஒருமுறை மட்டும் gentle nudge.
- QC fail ஆனாலும் result reject செய்யக்கூடாது; `confidence=soft` flag மட்டும்.

#### US-10 — Tie-break

- RIASEC rank 3 மற்றும் 4 இடையிலான gap `≤2` என்றால் 4 tie-breaker items.
- அனைத்திற்குப் பிறகும் tie இருந்தால் fixed order `R > I > A > S > E > C`.
- ஒரே answers எப்போதும் ஒரே code தர வேண்டும்.

#### US-11 — Instrument sequence

- Explorer: Mini-IP word quiz அல்லது 16-item Photo Career Quiz.
- Pathfinder: IP-60 அல்லது Photo Quiz; பிறகு optional WIP; பிறகு optional aptitude sample.
- Launcher: IP-60 → WIP → Mini-IPIP, இடையில் reveals.
- Optional instrument decline செய்தாலும் மற்ற flow பாதிக்கக்கூடாது.
- Photo quiz-ல் இரண்டு work-scene images; தேர்ந்த scale-க்கு `+2`.
- Aptitude sample: 12 MCQs; numerical 4, abstract/letter 2, verbal 3, matrix 3.
- Aptitude output தனி IQ number ஆகவோ career gate ஆகவோ இருக்கக்கூடாது; subtype bands மட்டுமே.

### 3.4 Results, reports மற்றும் sharing

#### US-12 — Profile reveal

Reveal ஆறு தனி chat messages ஆக வர வேண்டும்:

1. Code headline.
2. ஒவ்வொரு letter-ன் விளக்கம்; student intake answers-ஐ echo செய்தல்.
3. மூன்று வேறு education routes-இல் career vignettes.
4. Top-two score gap `≤3` என்றால் nuance note.
5. Share offer.
6. Next-step choice.

#### US-13 — Report card மற்றும் share card

Report card order:

1. Profile: first name, age band, city/state, segment, key intake facts.
2. Assessment: instruments, language/variant, RIASEC bars, code, confidence, values/aptitude.
3. Selections: explored stream/pathways/colleges/scholarships/careers/90-day plan.
4. Deterministic 2–3 sentence summary; LLM factual inputs-ஐ மாற்றாமல் wording மட்டும் polish செய்யலாம்.
5. PDF download, share card, counselor send, continue exploration actions.

Report render நேரத்தில் புதிய recommendation கணக்கிடக் கூடாது; stored snapshot மட்டுமே பயன்படுத்த வேண்டும்.

Share card social-safe ஆக first name, code, code name, YuvaNext branding மட்டும் கொண்டிருக்க வேண்டும். Age, phone, school, raw scores, selected colleges/careers இருக்கக்கூடாது. Server-side generation 2 விநாடிக்குள் முடிக்க வேண்டும்.

#### US-14 — Retake cooldown

- ஒரே instrument-ஐ 90 நாட்களுக்குள் மீண்டும் எடுக்க முயன்றால் growth-framed cooldown message.
- Counselor override இருந்தால் retake அனுமதிக்கலாம்.

### 3.5 Guidance, maps மற்றும் grounded chat

#### US-15 — Segment-specific recommendations

- Explorer: streams + 3 missions.
- Pathfinder: 3–5 clusters, degrees, exams, state-filtered colleges, backup routes.
- Launcher: ranked careers, 90-day plan; `wants_aid=true` என்றால் aid section.
- Chat-ல் சொல்லப்படும் career, college, exam அனைத்தும் DB/tool result-ல் இருக்க வேண்டும்.
- “Why this fits” என்பது `fit_explanation_data`-இல் உள்ள facts மூலம் மட்டும் உருவாக வேண்டும்.

#### US-16 — Free exploration

- Compare, what-if, more options, parent-summary போன்ற follow-up questions ஆதரிக்க வேண்டும்.
- ஒரு response career/college போன்ற entity-ஐ பெயரிட்டால் அதே turn-ல் அதற்கு முன் tool call இருக்க வேண்டும்.
- Tool result இல்லையெனில் model entity உருவாக்காமல் அதைப் பகிரங்கமாகச் சொல்ல வேண்டும்.

#### US-32 — Career rings

- ஒரே `match_careers(max_results=18)` output-ஐ code deterministic-ஆக partition செய்ய வேண்டும்; LLM partition செய்யக்கூடாது.
- Inner 3–4: top letter-க்கு strongest matches.
- Middle 5–6: same domain அல்லது RIASEC hexagon adjacent letters.
- Outer 5–6: second/third letters, cross-domain discovery; குறைந்தது ஒரு vocational/diploma route மற்றும் ஒரு unexpected pairing.
- Explorer-க்கு fit percentage காட்ட வேண்டாம்; Pathfinder/Launcher-க்கு காட்டலாம்.
- “See all matches” list view எதையும் மறைக்காமல் இருக்க வேண்டும்.

#### US-33 — Journey breadcrumb

- ஐந்து நிலைகளின் state server/account resume-இலும் தொடர வேண்டும்.
- Intake, first assessment item, reveal, first guidance render, final report interaction ஆகிய events state-ஐ மாற்றும்.

#### US-34 — Career profile card

- Illustrative/CC0 image, entry salary band, 3–5 skills, சுமார் 3 ஆண்டுகளுக்குப் பிந்தைய next role, plan button.
- 335 curated careers அனைத்திற்கும் counselor-reviewed profile coverage வேண்டும்.
- Salary ஒரு indicative band; city/company/year அடிப்படையில் மாறும் caveat மற்றும் last-reviewed date அவசியம்.
- Salary matching score-ல் பயன்படுத்தப்படக்கூடாது; model salary number உருவாக்கக்கூடாது.

#### US-35 — College rings

- Rank order: discipline match → tier → state proximity.
- Inner: home/selected state best 3–4.
- Middle: next 5–6 in-state/nearby-state options.
- Outer: மற்ற southern states + குறைந்தது ஒரு vocational/polytechnic/ITI route + open university.
- Detail panel-ல் city, type, disciplines, admission route, fees band, verification caveat.

#### US-36 — Scholarship rings

- Stored facts மட்டுமே பயன்படுத்தி deterministic “likely / check conditions / explore” rings.
- அறியாத eligibility fact scheme-ஐ inner-க்கு கொண்டு வரக்கூடாது; வெளியே தள்ள வேண்டும்.
- “Guaranteed” என்ற சொல் பயன்படுத்தக் கூடாது.
- Detail card: provider, amount, window, official `application_url`, minimum eligibility, last verified, yearly-change caveat.
- LLM URL உருவாக்கக்கூடாது.

#### US-17 — Claude இல்லாவிட்டாலும் core app இயங்குதல்

Claude API down ஆனாலும் assessment, scoring, reveal மற்றும் static top-5 recommendation இயங்க வேண்டும். Free chat மட்டும் friendly unavailable message காட்ட வேண்டும்.

#### US-18 — Safety interrupt

- Tier 1/2/3 trigger எந்த screen-லிருந்தும் current flow-ஐ freeze/pause செய்ய வேண்டும்.
- `SAFETY.md`-ல் human-approved copy மற்றும் helplines மட்டும் பயன்படுத்த வேண்டும்; LLM safety text உருவாக்கக்கூடாது.
- Protocol-க்கு ஏற்ற alert/handoff queue event உருவாக்க வேண்டும்.
- Launchக்கு முன் குறைந்தது 50-message red-team suite 100% pass ஆக வேண்டும்.

### 3.6 Counselor dashboard மற்றும் compliance

#### US-19 — Session list

- Date, segment, code, completion, confidence/handoff/safety flags.
- Date/segment/flag filters; student auth-இல் இருந்து தனியான staff auth.

#### US-20 — Profile packet

- Intake, scores, confidence, recommendations.
- Handoff/safety flag உள்ள session-க்கு மட்டும் conversation excerpts.
- ஒவ்வொரு packet view-மும் audit log-ல் பதிவு.

#### US-21 — Handoff queue

- Tier 1 முதலில் வரிசைப்படுத்துதல்.
- Tier 1க்கு உடனடி alert channel.
- Counselor “actioned” marking தனி action log-ல் மட்டும் எழுதப்படும்.

#### US-22 — Data rights

- Student/guardian chat வழியாக export அல்லது delete கேட்கலாம்.
- Delete request 72 மணி நேரத்தில் cascade hard-delete ஆக வேண்டும்.
- `SAFETY.md §6` அனுமதிக்கும் safety records மற்றும் de-identified counters மட்டும் exception.

#### US-23 — Audit trail

- ஒவ்வொரு recommendation set-க்கும் profile snapshot, weights version, tool-results hash.
- பின்னர் recommendation எவ்வாறு வந்தது என்பதை reconstruct செய்ய முடியும்.

---

## 4. Conversation மற்றும் AI விதிகள்

YuvaNext AI ஒரு warm, simple, encouraging Indian career guide ஆக இருக்க வேண்டும்.

கட்டாய விதிகள்:

1. Assessment score-ஐ LLM கணக்கிடவோ மாற்றவோ கூடாது.
2. Tool result-ல் இல்லாத career, college, degree, exam அல்லது salary number-ஐ சொல்லக்கூடாது.
3. “இந்த career உனக்கு முடியாது” என்று சொல்லக்கூடாது; “direct route / resilient route” framing பயன்படுத்த வேண்டும்.
4. Safety rules மற்ற எல்லாவற்றையும் override செய்யும்.
5. System prompt, மற்ற users data அல்லது therapist/doctor/parent role-play வெளியிடக்கூடாது.
6. ஒரு message பொதுவாக 1–3 sentences + ஒரு widget/question; ஒரே நேரத்தில் ஒரு question.

AIக்கு database access தரும் tool contracts:

- `get_profile`
- `match_careers`
- `get_career`
- `get_streams`
- `get_colleges`
- `get_aid_schemes`
- `request_handoff`

Server-side entity linter model output-ல் tool result-க்கு வெளியிலான entities உள்ளதா என scan செய்ய வேண்டும். தவறு இருந்தால் ஒருமுறை regenerate; மீண்டும் தவறு என்றால் safe fallback. ஒவ்வொரு turn-க்கும் tool calls audit log-ல் இருக்க வேண்டும். PRD token target: 2k input / 500 output மற்றும் sliding conversation summary.

---

## 5. Scoring மற்றும் matching

### 5.1 RIASEC

- Explorer: scale ஒன்றுக்கு 5 items, score range 5–25.
- மற்றவர்கள்: scale ஒன்றுக்கு 10 items, score range 10–50.
- QC items score-ல் சேரக்கூடாது.
- Top 3 scales code ஆகும்.
- Rank 3/4 gap `≤2` என்றால் tie-breaker; அதன் பின்பும் tie என்றால் `R > I > A > S > E > C`.
- QC fail என்றால் `confidence=soft`; result reject செய்யக்கூடாது.

### 5.2 WIP மற்றும் Big Five

- WIP values ஒவ்வொரு scale max-க்கு 0–1 normalize செய்யப்படும்; top two values தேர்வு.
- Forced choice normalized gap `<0.05` உள்ள values-ஐ மட்டும் reorder செய்யலாம்.
- Big Five reverse item: `6-response`; trait score 4–20.
- Bands: low `≤9`, mid `10–15`, high `≥16`.

### 5.3 Career match score

Factors:

- `interest_fit`: O\*NET vector Pearson correlation-ஐ `(r+1)/2` மூலம் 0–1க்கு மாற்றுதல்.
- `values_fit`: WIP இருந்தால்; இல்லையெனில் அதன் weight interest-க்கு redistribute.
- `feasibility`: segment + marks band + education route அடிப்படையில் `0.3 / 0.65 / 1.0`.
- `context_boost`: curated status மற்றும் counselor priority.

Version 1 weights: `0.50 / 0.20 / 0.15 / 0.15`. Score descending; tie என்றால் title ascending. இந்த algorithm LLM-க்கு வெளியே pure deterministic service ஆக இருக்க வேண்டும்.

### 5.4 கட்டாய test vectors

`TV-1` முதல் `TV-7` வரை source PRD answer keys அப்படியே automated tests-ல் இருக்க வேண்டும்: dominant/tie fallback, realistic mix, QC-soft, Explorer scale, WIP bounds, career ranking, three-ring partition.

---

## 6. Data, privacy மற்றும் non-functional தேவைகள்

### 6.1 முக்கிய PostgreSQL entities

`users`, `consents`, `sessions`, `assessment_items`, `responses`, `results`, `careers`, `pathways`, `streams_map`, `colleges`, `aid_schemes`, `career_profiles`, `recommendations`, `conversations`, `missions`, `safety_events`, `config`, `staff`, `audit_log`.

### 6.2 Privacy

- Phone numbers plain text ஆக அல்ல; hash/encrypted lookup strategy பயன்படுத்த வேண்டும்.
- School name, exact marks, full address collect செய்யக்கூடாது.
- Consent text versioned ஆக இருக்க வேண்டும்.
- India-region hosting மற்றும் processor list அவசியம்.
- Analytics events-ல் PII இருக்கக்கூடாது.
- Safety schema-க்கு மிகக் குறைந்த privileged access.

### 6.3 Performance targets

- 3G-ல் assessment batch render `<1s`.
- Tap முதல் next item perceived latency `<150ms`.
- Scoring `<500ms`.
- Share card `<2s`.
- Chat first token `<3s p90`.
- 200 concurrent students load test.

### 6.4 Reliability மற்றும் accessibility

- LLM outage-ல் core journey இயங்க வேண்டும்.
- OTP provider fallback adapter/documentation.
- WCAG AA contrast, keyboard-operable chips, font scaling, no timed interaction.
- Chrome/Safari/Firefox last two versions, Android WebView, 360px width support.

### 6.5 Cost controls

- LLM monthly spend ₹15,000 அடைந்தால் alert.
- User-level daily token ceiling config மூலம் கட்டுப்படுத்துதல்.

---

## 7. Phase 2 Addendum — தமிழில் சுருக்கம்

### US-24 — Tamil toggle

- Header/onboarding-ல் English ↔ தமிழ் மாற்றலாம்; நடுவில் assessment language மாற்றினாலும் `item_id` தொடர்ச்சி மாறக்கூடாது.
- `review_status=approved` உள்ள Tamil item/copy மட்டுமே காட்ட வேண்டும்; இல்லையெனில் English fallback மற்றும் analytics flag.
- Safety Tamil copy மனிதர் எழுதி approve செய்தது மட்டுமே; machine translation fallback இல்லை.

### US-25 — Bilingual comprehension

- English மற்றும் Tamil item text ஒன்றாகக் காட்டும் assessment-header toggle.
- பயன்படுத்தியதை pilot comprehension signal ஆக log செய்ய வேண்டும்.

### US-26 — Indian occupation codes

- `get_career` மூலம் ISCO-08, NCO-2015 மற்றும் crosswalk confidence.
- Curated careers-க்கு குறைந்தது minor-group ISCO 100%; unit-group target ≥95%.
- Confidence counselor-க்கு மட்டும்; student-க்கு இல்லை.

### US-27 — முழு ஐந்து-state college coverage

- AISHE + 5 state portals ingest pipeline.
- மாநிலம் ஒன்றுக்கு AISHE-listed degree colleges ≥95% coverage.
- District filter; release நேரத்தில் unresolved fuzzy duplicates பூஜ்யம்.

### US-28 — Aid freshness

- ஒவ்வொரு May மாதமும் owner-assigned refresh job/worksheet.
- Last verified badge; expired window schemes collapsed; deactivated scheme render ஆகக்கூடாது.

### US-29 — 24-item aptitude battery

- Numerical 8, abstract/letter 4, verbal 6, matrix 6.
- Local norm sample `n≥300` கிடைக்கும் வரை building/steady/strong bands காட்டக்கூடாது.
- Verbal results language வாரியாக தனியே analyse செய்ய வேண்டும்.
- ஒவ்வொரு 200 test-takers-க்கும் item analysis.

### US-30 — Retest growth view

- 90 நாட்களுக்குப் பின் versioned retake.
- “Then vs now” codes மற்றும் counselor trajectory.
- Photo/word quiz மாறுபட்டால் most recent result, விளக்கத்துடன்.

### US-31 — Pilot mode

- Signup link மூலம் `pilot=true` cohort.
- Pathfinder word-vs-photo A/B assignment.
- Pseudonymized response export; staff-only, audit-logged.
- 12 மாத retention; பின்னர் de-identification.

Phase 2 done ஆக Tamil items ≥90% native-approved, 10-student read-aloud test, NCO unit coverage ≥95%, state-wise AISHE parity report, aptitude norming gate test மற்றும் pilot decisions log தேவை.

---

# 8. ஐந்து பெரிய development modules

இந்த பிரிப்பு **domain ownership + merge safety** அடிப்படையில் செய்யப்பட்டுள்ளது. ஒவ்வொரு colleague-மும் முழு repo structure-ஐ வைத்திருக்க வேண்டும்; தமக்கு ஒதுக்கப்பட்ட folders-ல் மட்டும் implementation செய்ய வேண்டும். Shared contract மாற்றங்கள் review இல்லாமல் merge செய்யக்கூடாது.

## Module 1 — Platform Foundation, Identity, Onboarding & Consent

### Scope

- Repo scaffold, environments, configuration, database connection, migrations.
- `US-01` முதல் `US-05`, OTP, anonymous-session merge, routing, intake.
- Guardian consent, ephemeral pending mode contract, consent status.
- JWT/session auth, staff/student auth boundary foundation.
- User profile/privacy export/delete job skeleton.

### Owns

- Backend: `identity`, `onboarding`, `intake`, `privacy` domains.
- Frontend: landing, OTP modal, guardian modal, intake chips, profile/privacy overlay.
- Tables: `users`, `consents`, `sessions` மற்றும் intake-answer table/migration.
- API: `/auth/*`, `/consents/*`, `/intake/*`, `/privacy/*`.

### POC

**Happy path:** Landing → details → OTP mock verify → route → minor guardian mock approval → intake complete.

**Required edge demos:** under-12 no-save, OTP expiry/lock, guardian/student same number, pending ephemeral banner, approval flush, decline purge, 17/19 stage overrides.

### Done for POC

- Real DB migrations and fake SMS provider adapter.
- Contract tests for APIs.
- Playwright Explorer-minor and Launcher-adult paths.
- No raw phone in logs/database fixtures.

## Module 2 — Assessment Delivery, Offline Resume & Deterministic Scoring

### Scope

- `US-06` முதல் `US-14`, `US-29`, `US-30`-க்கு தேவையான extensible base.
- Item ingestion, filtering, batching, QC insertion, response capture.
- Offline retry queue, resume, pacing nudge, tie-breakers.
- RIASEC, WIP, Big Five, photo quiz மற்றும் aptitude sample scoring.
- Result versioning, confidence flags, retake cooldown.

### Owns

- Backend: `assessments`, `scoring` domains.
- Frontend: Likert/photo/MCQ widgets, progress header, pause/resume, result bars.
- Tables: `assessment_items`, `responses`, `results`, future norms table.
- API: `/assessment/next`, `/assessment/respond`, `/assessment/score`, `/results`.

### POC

**Happy path:** Seed CSV → Mini-IP assessment → simulated offline answers → reconnect sync → QC/tie-break → deterministic code reveal payload → resume from another browser session.

### Done for POC

- Pure scoring functions with no LLM/network dependency.
- `TV-1`–`TV-5` exact answer-key tests; `TV-7` belongs to Module 3.
- Same fixture run 100 times gives byte-equivalent scoring output.
- Idempotency, retry queue and 14-day resume tests.

## Module 3 — Career/College/Aid Data, Matching & Recommendation Engine

### Scope

- CSV ingestion and data validation for careers, pathways, colleges, aid, profiles.
- `US-15`, `US-32`, `US-34`, `US-35`, `US-36` deterministic engines.
- Career match formula, fit explanations, three-ring partitions.
- Career search/detail, streams, colleges, aid tool services.
- Verification/caveat rules and recommendation audit snapshot.

### Owns

- Backend: `catalog`, `matching`, `recommendations` domains.
- Frontend: reusable career/pathway/college/scholarship cards only; radial visualization shell stays Module 4.
- Tables: `careers`, `career_profiles`, `pathways`, `streams_map`, `colleges`, `aid_schemes`, `recommendations`.
- API: `/match`, `/careers/search`, `/careers/{code}` and internal tool endpoints.

### POC

**Happy path:** Fixed profile fixture → ranked careers → career rings → pathway colleges for selected state → aid rings → detail payloads, all without LLM.

### Done for POC

- CSV schema validation fails loudly on bad/missing required fields.
- `TV-6` and `TV-7` exact tests.
- Same profile/config/data version gives identical rank and rings.
- Every output carries source/verified/last-reviewed fields where applicable.
- Outer-ring vocational/open-route invariants tested.

## Module 4 — Student Chat, Canvas, Claude Orchestration, Reports & Sharing

### Scope

- Split chat+canvas application and responsive/mobile behavior.
- `US-12`, `US-13`, `US-16`, `US-17`, `US-33` presentation/orchestration.
- Claude tool-use loop, SSE streaming, context summary, entity linter.
- Canvas states `CV-1`–`CV-10`, focus panels, list-view accessibility.
- Deterministic report assembly, server-side PDF/share-card generation.
- Graceful degradation to static top-5 when Claude unavailable.

### Owns

- Backend: `chat`, `reports`, `sharing` domains.
- Frontend: app shell, chat state machine, canvas, radial maps, breadcrumb, reveal, report, share modal.
- Tables: `conversations` and UI exploration/tap log if modeled separately.
- API: `/chat`, `/share-card`, report PDF endpoint.

### POC

**Happy path:** Mock Module 1 profile + Module 2 result + Module 3 tool payloads → streamed chat → career map → focus view → report → PDF/share image.

**Failure path:** Claude timeout → deterministic static recommendation continues; fabricated entity from test model is caught and replaced.

### Done for POC

- No score calculation in chat/UI layer.
- Every named entity is traceable to same-turn tool result.
- Keyboard and list-view alternatives; 360px screenshot tests.
- Report uses stored snapshot only and share image contains no private fields.

## Module 5 — Safety, Counselor Dashboard, Audit & Operations

### Scope

- `US-18`–`US-23`, safety classification/keywords, flow interrupt and handoff.
- Counselor session list, profile packet, tiered queue and action log.
- Staff password + 2FA/RBAC, packet-view audit.
- Privacy analytics, monitoring, budgets, retention/deletion workers.
- Security, accessibility, load, red-team and release gates.

### Owns

- Backend: `safety`, `counselor`, `audit`, `analytics`, `jobs` domains.
- Frontend: safety response widget and `/staff` dashboard.
- Tables: `safety_events`, `staff`, `audit_log`, missions/action log as agreed.
- API: `/staff/*`, internal `request_handoff` handler, alert provider adapter.

### POC

**Happy path:** Synthetic normal/hand-off/tier events → flow freeze → approved copy → priority queue → counselor packet → mark actioned → full audit trace.

### Done for POC

- LLM cannot author or override safety copy.
- Conversation excerpts hidden unless handoff/safety flag exists.
- Tier 1 ordering and immediate alert adapter tested.
- 50-message red-team fixture structure created; POC subset passes 100%.
- Every staff packet view and queue action audit-logged.

---

# 9. அனைவரும் பின்பற்ற வேண்டிய ஒரே folder structure

```text
career-counseling-chatbot/
├─ apps/
│  ├─ web/                         # Next.js student + staff UI
│  │  ├─ src/app/
│  │  │  ├─ (student)/
│  │  │  └─ staff/
│  │  ├─ src/features/
│  │  │  ├─ identity/
│  │  │  ├─ intake/
│  │  │  ├─ assessment/
│  │  │  ├─ guidance/
│  │  │  ├─ chat/
│  │  │  ├─ canvas/
│  │  │  ├─ reports/
│  │  │  ├─ safety/
│  │  │  └─ counselor/
│  │  ├─ src/components/          # domain-neutral UI only
│  │  ├─ src/lib/
│  │  └─ tests/
│  └─ api/                         # FastAPI
│     ├─ app/main.py
│     ├─ app/core/                 # config, auth primitives, DB, logging
│     ├─ app/domains/
│     │  ├─ identity/
│     │  ├─ onboarding/
│     │  ├─ intake/
│     │  ├─ assessments/
│     │  ├─ scoring/
│     │  ├─ catalog/
│     │  ├─ matching/
│     │  ├─ recommendations/
│     │  ├─ chat/
│     │  ├─ reports/
│     │  ├─ sharing/
│     │  ├─ safety/
│     │  ├─ counselor/
│     │  ├─ privacy/
│     │  ├─ audit/
│     │  └─ analytics/
│     ├─ app/integrations/         # Claude, SMS, storage, alert adapters
│     ├─ app/jobs/
│     ├─ migrations/
│     └─ tests/
├─ packages/
│  ├─ contracts/                   # generated OpenAPI TS client + shared schemas
│  ├─ ui/                          # accessible design-system primitives
│  ├─ config/                      # lint/format/test shared config
│  └─ test-fixtures/               # synthetic, no PII
├─ data/
│  ├─ raw/                         # immutable source files
│  ├─ seed/                        # reviewed import-ready files
│  └─ schemas/                     # machine-readable CSV schemas
├─ scripts/
│  ├─ ingest/
│  ├─ validate/
│  └─ operations/
├─ tests/
│  ├─ contract/
│  ├─ e2e/
│  ├─ load/
│  ├─ safety/
│  └─ test_vectors/
├─ docs/
│  ├─ architecture/
│  ├─ adr/
│  ├─ api/
│  ├─ privacy/
│  └─ poc/
│     ├─ module-1-foundation.md
│     ├─ module-2-assessment.md
│     ├─ module-3-recommendations.md
│     ├─ module-4-experience.md
│     └─ module-5-operations.md
├─ infra/
│  ├─ docker/
│  ├─ deploy/
│  └─ monitoring/
├─ .env.example
├─ docker-compose.yml
├─ Makefile
├─ pnpm-workspace.yaml
├─ pyproject.toml
└─ README.md
```

Backend domain ஒன்றின் உள்ளமைப்பு:

```text
app/domains/<domain>/
├─ api.py          # HTTP route only
├─ schemas.py      # request/response models
├─ service.py      # use cases/business orchestration
├─ repository.py   # database access
├─ models.py       # ORM models, if domain-owned
├─ rules.py        # pure deterministic domain rules
└─ tests/
```

Frontend feature ஒன்றின் உள்ளமைப்பு:

```text
src/features/<feature>/
├─ api/
├─ components/
├─ hooks/
├─ state/
├─ types/
├─ utils/
└─ tests/
```

---

# 10. Merge conflict தவிர்க்கும் team rules

1. **ஒரே scaffold முதலில் merge செய்ய வேண்டும்.** அதன்பின் அனைவரும் அந்த commit-இல் இருந்து தனி branch உருவாக்க வேண்டும்.
2. Branch names: `poc/m1-foundation`, `poc/m2-assessment`, `poc/m3-recommendations`, `poc/m4-experience`, `poc/m5-operations`.
3. ஒவ்வொருவரும் தங்கள் domain/feature folders-ஐ மட்டும் own செய்ய வேண்டும்.
4. `packages/contracts`, root config, migrations மற்றும் shared UI மாற்றங்களுக்கு CODEOWNER review தேவை.
5. API முதலில் OpenAPI contract ஆக முடிவு செய்யப்பட வேண்டும்; frontend mock server அதே generated types பயன்படுத்த வேண்டும்.
6. மற்ற module தயாராக இல்லாதபோது `packages/test-fixtures` mock payload பயன்படுத்த வேண்டும்; temporary response shape உருவாக்கக்கூடாது.
7. Database migration filename-க்கு module prefix: `m1_`, `m2_` போன்றவை; ஒரே table-ஐ இரு modules மாற்றக்கூடாது.
8. Scoring/matching/safety pure rules LLM layer-இல் எழுதக்கூடாது.
9. ஒவ்வொரு PR-லும் linked `US-xx`, tests, migration impact, API changes, screenshots/demo மற்றும் rollback note இருக்க வேண்டும்.
10. Source assets overwrite செய்யக்கூடாது; `data/raw` immutable. Cleaned output `data/seed`-க்கு versioned filename ஆக எழுத வேண்டும்.

## Integration contract freeze order

1. Shared enums மற்றும் error shape.
2. Profile snapshot contract — Module 1 → மற்ற modules.
3. Assessment result contract — Module 2 → Modules 3/4/5.
4. Recommendation/tool payload contracts — Module 3 → Module 4.
5. Safety/handoff event contract — எல்லா modules → Module 5.
6. Report snapshot contract — Modules 1/2/3 → Module 4.

## Minimum shared contracts

- IDs: UUID; timestamps: UTC ISO-8601; UI-ல் மட்டும் IST/local conversion.
- State enum: `TN | KL | KA | TG | AP | OTHER`.
- Segment enum: `explorer | pathfinder | launcher`.
- Confidence: `normal | soft`.
- Consent: `pending | granted | declined | expired`.
- API errors: `{ code, message, retry? }`.
- Event envelope: `{ event_id, event_type, occurred_at, user_id?, session_id?, schema_version, payload }`.
- Every algorithm payload: `algorithm_version`/`weights_version` மற்றும் source-data version.
- Logs-ல் phone, guardian phone, raw free-text distress message போன்ற PII default ஆக சேரக்கூடாது.

---

# 11. பரிந்துரைக்கப்படும் tech stack

> **Architecture decision update:** Team-ன் இறுதி தேர்வு React + Vite + TypeScript frontend மற்றும் Express 5 + TypeScript backend. கீழே உள்ள ஆரம்ப Next.js/FastAPI பரிந்துரையை இந்த முடிவு override செய்கிறது. நடைமுறை POC stack மற்றும் contracts: [`docs/poc/README.md`](docs/poc/README.md).

## Frontend

- **Next.js App Router + React + TypeScript**: student app, staff routes, modal/overlay routing மற்றும் responsive split surface. App Router file-based structure, server/client components ஆகியவை இந்த architecture-க்கு பொருந்தும்.
- **Tailwind CSS + Radix UI primitives**: விரைவான design system, keyboard/focus behavior. Radial maps மட்டும் custom SVG/Canvas layer; அதன் கீழ் accessible list DOM கட்டாயம்.
- **TanStack Query**: server state, retry, request de-duplication.
- **Zustand அல்லது reducer-based state machine**: chat/canvas journey UI state. Business truth server-ல்; local store presentation/resume queue-க்கு மட்டும்.
- **IndexedDB (Dexie)**: guardian-pending ephemeral responses மற்றும் offline retry queue. Sensitive local rows approval/decline/timeout-ல் purge ஆக வேண்டும்.

## Backend

- **Python + FastAPI + Pydantic**: PRD ஏற்கனவே FastAPI JSON contract குறிப்பிடுகிறது; async API, OpenAPI types மற்றும் scoring/data tooling-க்கு Python ஏற்றது.
- **SQLAlchemy 2 + Alembic**: repositories மற்றும் versioned migrations.
- **PostgreSQL**: PRD data model, JSONB snapshots, relational audit மற்றும் row-level access policies.
- **Redis**: OTP attempt/resend/lock counters, short-lived idempotency/cache மற்றும் task broker.
- **Celery அல்லது Dramatiq worker**: PDF/share rendering, 72-hour deletion, export, alerts, aid refresh போன்ற durable background jobs. சிறிய non-critical task மட்டும் FastAPI `BackgroundTasks`.

## AI மற்றும் integrations

- **Anthropic Claude Messages API with tool use + SSE streaming**: PRD-ன் grounded tool loop-க்கு நேரடி பொருத்தம். Strict JSON schemas, server-side tool executor, entity linter மற்றும் deterministic fallback அவசியம்.
- **Provider adapters**: `SmsProvider`, `AlertProvider`, `ObjectStorage`, `LLMProvider` interfaces. OTP primary/fallback vendor மாற்றுவதற்கு domain code மாற்றக்கூடாது.
- **S3-compatible India-region object storage**: private report PDF மற்றும் expiring signed URLs; share cards தனி social-safe assets.

## Testing மற்றும் quality

- Backend: `pytest`, `pytest-asyncio`, `Hypothesis` property tests.
- Frontend: `Vitest`, React Testing Library, axe accessibility checks.
- E2E: **Playwright** — Chromium, Firefox, WebKit மற்றும் mobile viewport projects.
- Contract: generated OpenAPI client + schema compatibility check in CI.
- Load: `k6` அல்லது Locust; 200 concurrent student gate.
- Security: dependency scan, secret scan, SAST, migration review, OWASP checks.

## Observability மற்றும் deployment

- Structured JSON logs + OpenTelemetry traces/metrics.
- Sentry-compatible error tracking with PII scrubbing.
- Docker containers; managed PostgreSQL/Redis; India-region deployment.
- CI stages: format → lint/type → unit → contract → integration → e2e → accessibility → security → build.
- Environments: local, test, staging, production; separate secrets and databases.

### ஏன் இந்த stack?

- Next.js App Router current official structure TypeScript/Tailwind defaults மற்றும் server/client component split வழங்குகிறது: [Next.js App Router documentation](https://nextjs.org/docs/app), [installation defaults](https://nextjs.org/docs/app/getting-started/installation).
- FastAPI background-task documentation heavy multi-process jobs-க்கு external queue/worker பயன்படுத்த வேண்டிய trade-off-ஐ தெளிவாகக் குறிப்பிடுகிறது: [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/).
- Claude tool use-ல் model structured tool request மட்டும் உருவாக்கி, application தான் database operation-ஐ execute செய்து result திருப்பும்; இது PRD grounding rule-க்கு சரியான boundary: [Claude tool-use contract](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works), [tool reference](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference).
- PostgreSQL Row-Level Security counselor/student data access-ஐ database policy மட்டத்திலும் கட்டுப்படுத்த உதவும்: [PostgreSQL Row Security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
- Playwright Chromium, Firefox, WebKit மற்றும் mobile/device configurations ஆதரிப்பதால் PRD browser matrix-ஐ ஒரே suite-ல் cover செய்யலாம்: [Playwright browsers](https://playwright.dev/docs/browsers).

---

# 12. POC execution order மற்றும் milestone

## Milestone 0 — Scaffold and contracts

- Canonical folder tree, Docker local services, CI skeleton.
- OpenAPI base, shared enums/error/event contracts.
- Synthetic fixtures; source PRD and decisions linked in docs.

## Milestone 1 — Parallel POCs

- M1 identity/onboarding.
- M2 assessment/scoring using fixture user.
- M3 recommendations using fixture result.
- M4 UI/chat using mock APIs.
- M5 safety/dashboard using synthetic events.

## Milestone 2 — First integration

- M1 profile → M2 assessment.
- M2 result → M3 matching.
- M3 tools → M4 chat/canvas.
- All modules → M5 safety/audit.

## Milestone 3 — End-to-end vertical slices

1. Explorer minor: guardian pending + Mini-IP + stream/missions + report.
2. Pathfinder: IP/photo choice + college rings + scholarship discovery.
3. Launcher: full assessment stack + career rings + 90-day plan + aid.
4. Safety trigger from assessment மற்றும் free chat.
5. Counselor packet, queue மற்றும் delete/export audit.

## Milestone 4 — Phase gate

- அனைத்து acceptance criteria demonstrable.
- `TV-1`–`TV-7` green; lint/type clean.
- 50+ safety red-team messages 100% pass.
- DPDP, consent, scoring மற்றும் safety human review.
- Three persona E2E demos recorded.
- 200 concurrent load test.
- Counselor walkthrough accepted.

---

# 13. PRD-ல் தீர்வு தேவைப்படும் முரண்பாடுகள் / கேள்விகள்

Implementation தொடங்கும் முன் product owner உறுதிப்படுத்த வேண்டியவை:

1. `US-05` Launcher intake **9 questions** என்கிறது; Flow C diagram **5/7/8 Qs** என்கிறது. இந்த ஆவணம் US-05-ஐ authority எனக் கொண்டு 9 என வைத்துள்ளது.
2. Conversation section “all six tools” என்கிறது; ஆனால் ஏழு tool contracts பட்டியலிடப்பட்டுள்ளன. இந்த ஆவணம் ஏழு tools எனக் கொண்டுள்ளது.
3. Phone “hash” மட்டும் வைத்தால் OTP/login lookup மற்றும் delivery workflow எப்படி நடக்கும் என்பதை security design தெளிவுபடுத்த வேண்டும். Plain phone தேவையான அளவு மட்டுமே encrypted/short-lived ஆக வைத்தல் அல்லது vendor reference/token strategy முடிவு செய்ய வேண்டும்.
4. Guardian pending responses `localStorage` என flow குறிப்பிடுகிறது; sensitive ephemeral data-க்கு IndexedDB + encryption/expiry/purge policy பயன்படுத்தலாமா என privacy review தேவை.
5. Source PRD-ல் Phase 1 aptitude sample bands காட்டப்படும் என உள்ளது; `US-13` report `US-29 norming gate`-ஐ மதிக்க வேண்டும் என்கிறது. Sample மற்றும் locally normed full battery output rules தனித் தெளிவாக version செய்யப்பட வேண்டும்.
6. Career profiles 335 curated careers; browser 1,016 titles. Non-curated title tap செய்தால் எந்த minimum detail/tool behavior என்பதற்கு exact contract உறுதி செய்ய வேண்டும்.
7. India-region hosting provider, OTP vendors, immediate Tier-1 alert channel மற்றும் retention durations launchக்கு முன் locked decisions ஆக வேண்டும்.

---

## இறுதி பரிந்துரை

முதலில் ஐந்து POC branches தொடங்க வேண்டாம். **Milestone 0 scaffold + shared contracts-ஐ ஒரு சிறிய PR ஆக merge செய்த பிறகே** module branches உருவாக்க வேண்டும். இதுவே பின்னர் modules-ஐ merge செய்வதில் folder, API shape, enum, migration மற்றும் mock-data conflicts-ஐ மிக அதிகமாகக் குறைக்கும்.
