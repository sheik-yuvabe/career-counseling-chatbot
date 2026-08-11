import fs from "node:fs";

const output = new URL("../docs/yuvanext-project-architecture.pdf", import.meta.url);
const W = 595.28, H = 841.89, M = 46;
const green = "0.03 0.36 0.28", dark = "0.09 0.20 0.17", grey = "0.38 0.46 0.43";
let pages = [], ops = [], y = 0, pageNo = 0;
const esc = s => String(s).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)").replaceAll(/[–—]/g, "-").replaceAll("→", "->");
const drawText = (s,x,yy,size=9.6,font="F1",color=dark) => ops.push(`${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${yy} Tm (${esc(s)}) Tj ET`);
const rect = (x,yy,w,h,c) => ops.push(`${c} rg ${x} ${yy} ${w} ${h} re f`);
function finishPage(){ if(!ops.length)return; drawText(`YuvaNext architecture report  |  Page ${pageNo}`,M,24,8,"F1",grey); pages.push(ops.join("\n")); ops=[]; }
function newPage(){ finishPage(); pageNo++; rect(0,H-72,W,72,green); drawText("YUVANEXT",M,H-34,17,"F2","1 1 1"); drawText("Project architecture and data governance",M,H-53,10,"F1","0.82 1 0.93"); y=H-99; }
function ensure(n=30){ if(y-n<44)newPage(); }
function wrap(s,max=91){ const words=String(s).split(/\s+/); let a=[],l=""; for(const w of words){const n=l?`${l} ${w}`:w;if(n.length>max){if(l)a.push(l);l=w}else l=n}if(l)a.push(l);return a; }
function title(s){ensure(44); drawText(s,M,y,15,"F2",green); y-=23;}
function sub(s){ensure(34); drawText(s,M,y,11.5,"F2",green); y-=18;}
function para(s,{size=9.6,indent=0,font="F1",gap=12,max=91}={}){for(const l of wrap(s,max-indent/2)){ensure(gap+2);drawText(l,M+indent,y,size,font);y-=gap}y-=4;}
function bullet(s){para(`- ${s}`,{indent:9,max:87});}
function code(lines){const arr=Array.isArray(lines)?lines:[lines];ensure(arr.length*13+18);rect(M,y-arr.length*13-8,W-2*M,arr.length*13+14,"0.09 0.20 0.17");for(const l of arr){drawText(l,M+12,y-12,8.6,"F3","0.91 1 0.96");y-=13}y-=14;}
function tableRows(rows){for(const [a,b] of rows){ensure(29);drawText(a,M+5,y,8.8,"F2",green);for(const l of wrap(b,65)){drawText(l,M+155,y,8.7);y-=11}y-=5;ops.push(`0.78 0.86 0.83 RG ${M} ${y+8} m ${W-M} ${y+8} l S`);}}

newPage();
drawText("COMPREHENSIVE TECHNICAL REPORT",M,y,9,"F2",green); y-=31;
drawText("YuvaNext Project Architecture",M,y,25,"F2",dark); y-=30;
para("Knowledge sources, acquisition, verification, validation, database schema, API payloads, and the policy for Indian occupations without reliable RIASEC data.",{size:12,gap:16,max:76});
rect(M,y-73,W-2*M,80,"0.92 0.98 0.96");
drawText("IMPLEMENTED BASELINE",M+16,y-18,10,"F2",green);
drawText("69 project-owned Phase A database tables",M+16,y-39,11,"F2");
drawText("9 currently registered HTTP endpoints: 1 health, 6 public catalog, 2 internal",M+16,y-58,10);
y-=105;
title("1. System purpose and module flow");
para("The backend collects student information, scores assessments, retrieves reviewed career and education knowledge, creates deterministic recommendations, supports the AI counsellor, and records safety and operational events.");
code(["Student profile + assessment", "        -> recommendation engine", "        -> verified knowledge catalog", "        -> AI counsellor explanation", "        -> student career/college/aid journey"]);
para("The AI model is not the authoritative source of career facts. Verified Supabase records are retrieved first and supplied to the model as grounded context.");

title("2. Software architecture");
code(["HTTP route -> application service -> domain repository interface", "           -> PostgreSQL repository -> Supabase PostgreSQL"]);
tableRows([
 ["apps/api","Express application composition, server and health route."],
 ["packages/contracts","Zod request/response schemas and OpenAPI definitions."],
 ["packages/knowledge","Module 3 services, routes, repositories and import logic."],
 ["data/seed/knowledge","Current versioned local POC datasets and manifests."],
 ["scripts/validate","Dataset validation commands."],
 ["scripts/ingest","Transactional dataset import commands."],
 ["supabase/migrations","PostgreSQL schemas, tables, constraints and indexes."]
]);

newPage(); title("3. Data sources: current implementation versus production intent");
sub("Current POC source");
para("Today, Module 3 imports reviewed local JSON fixtures. It does not automatically download production records from O*NET, NCO, AISHE, or scholarship portals.");
code(["data/seed/knowledge/careers/2026-07-30", "data/seed/knowledge/streams/2026-07-31", "data/seed/knowledge/colleges/2026-07-31", "data/seed/knowledge/aid-schemes/2026-08-02"]);
sub("O*NET - US occupational information");
para("Intended fields include O*NET-SOC identifiers, occupation titles, interests/RIASEC, skills, tasks, work activities, work styles and preparation information. O*NET offers versioned downloads and authenticated REST web services. Production imports should pin a release, retain attribution, preserve the raw download, transform required fields, and review them for Indian applicability.");
sub("NCO - Indian National Classification of Occupations");
para("The term is NCO, not NCA. The Directorate General of Employment publishes NCO codes, Indian occupation titles, divisions, groups and families. NCO-to-O*NET mappings must be reviewed; the two code systems must never be treated as automatically equivalent.");
sub("AISHE - Indian higher-education institutions");
para("AISHE can support college identity, institution type, state, location and programme information. An institution must be normalized, deduplicated and checked against the official directory before verified=true is published.");
sub("Official scholarship sources");
para("Financial-aid records should come from the National Scholarship Portal, ministries, departments, state portals and official scheme notifications. Keep eligibility rules, application URL, applicable state, opening/closing dates and last verification date.");

title("4. Recommended acquisition mechanism");
code(["Official API / export / publication", " -> immutable raw file and source metadata", " -> transformation into YuvaNext JSON", " -> automatic validation and duplicate checks", " -> human/domain review", " -> checksumSha256 + manifest.json", " -> transactional Supabase import", " -> audit report and published catalog"]);
para("External sources should be collected offline. Student-facing API requests should query Supabase rather than depend on external sites in real time.");

newPage(); title("5. Validation, verification and publication controls");
sub("Technical validation");
bullet("Zod checks required fields, UUIDs, enums, numbers, dates and HTTPS URLs.");
bullet("Manifest checks datasetKey, version, expected record count and checksumSha256.");
bullet("Duplicate checks detect repeated IDs, codes and programme identities.");
bullet("Referential checks reject missing careers, pathways, disciplines and colleges.");
bullet("Database foreign keys and check constraints provide a second protection layer.");
sub("Factual verification");
bullet("Use an authoritative source and retain its name, URL, publisher and version/date.");
bullet("Review occupation crosswalks with Indian career or labour-market experts.");
bullet("Verify colleges against AISHE/regulatory information before public exposure.");
bullet("Verify scheme rules and freshness against the official notification or portal.");
bullet("Require review approval before a version can be published.");
sub("Transactional and idempotent publishing");
para("An import validates first, writes all related rows in one transaction, publishes the dataset version, and records an audit event. Failure rolls the transaction back. The dataset key, version and checksum prevent silent replacement of an existing published version.");
sub("Student-facing filtering");
bullet("The colleges endpoint returns verified colleges only.");
bullet("Career narrative content should be exposed only when reviewed.");
bullet("Financial-aid matching returns possibilities, not a guarantee of eligibility.");

title("6. Database totals");
tableRows([
 ["assessment","15 tables"], ["knowledge","18 tables"], ["recommendation","10 tables"],
 ["counselor","10 tables"], ["safety_private","7 tables"], ["operations","9 tables"],
 ["TOTAL","69 project-owned tables. Supabase auth tables are excluded."]
]);
para("The extended target model describes 74 tables; five were deferred from the Phase A baseline.");

newPage(); title("7. Complete database schema - Assessment and Knowledge");
sub("assessment schema - 15 tables");
tableRows([
 ["user_profiles","Student identity and profile details."], ["journey_sessions","Counselling journey sessions."],
 ["guardian_consents","Parent/guardian consent."], ["intake_question_sets","Versioned intake questionnaires."],
 ["intake_questions","Individual intake questions."], ["intake_answers","Student intake answers."],
 ["assessment_definitions","Assessment types."], ["assessment_versions","Versioned assessment configuration."],
 ["assessment_items","Assessment questions/items."], ["assessment_item_options","Available answer options."],
 ["assessment_runs","One student assessment attempt."], ["assessment_responses","Responses in an attempt."],
 ["assessment_results","Calculated results including RIASEC."], ["profile_snapshots","Immutable student snapshot."],
 ["profile_snapshot_results","Results linked to a snapshot."]
]);
sub("knowledge schema - 18 tables");
tableRows([
 ["knowledge_sources","External/curated source metadata."], ["dataset_versions","Versions, checksums and publication status."],
 ["education_routes","Degree, diploma and training routes."], ["careers","Core career identity and codes."],
 ["career_interest_profiles","Six-dimensional RIASEC vectors."], ["career_value_profiles","Work-value dimensions."],
 ["career_profiles","Reviewed narrative career details."], ["pathways","Education and career pathways."],
 ["career_pathways","Career-to-pathway relationships."], ["stream_options","School stream definitions."],
 ["stream_maps","RIASEC/segment stream mapping rules."], ["stream_map_items","Ranked streams within a mapping."],
 ["colleges","College identity and verification status."], ["disciplines","Academic disciplines."],
 ["college_programs","Programmes offered by colleges."], ["pathway_disciplines","Pathway-to-discipline relationships."],
 ["aid_schemes","Scholarship/financial-aid schemes."], ["aid_criteria","Structured eligibility criteria."]
]);

newPage(); title("8. Complete database schema - remaining modules");
sub("recommendation schema - 10 tables");
tableRows([
 ["matching_configurations","Scoring configuration."], ["feasibility_rules","Location, study and affordability rules."],
 ["recommendation_runs","One recommendation calculation."], ["recommendation_rings","Best-fit, related and discover rings."],
 ["recommendation_items","Ranked careers."], ["plan_templates","Reusable plan definitions."],
 ["plan_template_steps","Steps in plan templates."], ["generated_plans","Student-specific plans."],
 ["generated_plan_steps","Student plan steps."], ["missions","Exploration activities."]
]);
sub("counselor schema - 10 tables");
tableRows([
 ["conversations","Conversation container."], ["conversation_messages","Individual messages."],
 ["conversation_summaries","Condensed history."], ["tool_calls","AI counsellor tool activity."],
 ["message_grounding","Sources supporting messages."], ["journey_states","Current journey stage."],
 ["journey_events","Journey transitions."], ["exploration_events","Career/stream exploration."],
 ["report_snapshots","Generated report snapshot."], ["generated_assets","Report/card assets."]
]);
sub("safety_private schema - 7 tables");
tableRows([
 ["safety_policy_versions","Versioned policies."], ["approved_safety_messages","Approved responses."],
 ["safety_rule_sets","Detection rules."], ["safety_events","Detected risk events."],
 ["handoffs","Human escalation."], ["alert_deliveries","Alert delivery state."],
 ["handoff_actions","Actions during escalation."]
]);
sub("operations schema - 9 tables");
tableRows([
 ["staff_profiles","Staff information."], ["staff_role_assignments","Staff authorization."],
 ["audit_events","Security/import audit trail."], ["privacy_jobs","Privacy/export/deletion jobs."],
 ["privacy_job_steps","Privacy job progress."], ["analytics_events","Product analytics."],
 ["evaluation_cases","Evaluation test cases."], ["evaluation_runs","Evaluation executions."],
 ["evaluation_results","Evaluation outcomes."]
]);

newPage(); title("9. API inventory - public endpoints");
para("The running application currently registers 9 HTTP endpoints: 1 health, 6 public knowledge endpoints, and 2 protected internal endpoints.");
sub("1. GET /api/v1/health");
para("Purpose: API liveness. Input: none. Output: status, service, version and modules. Tables: none.");
sub("2. GET /api/v1/catalog/careers/search");
para("Purpose: search published careers. Query: q?, domain?, cursor?, limit?. Output: data[], nextCursor?, sourceDataVersions, retrievedAt, caveats. Tables: careers, dataset_versions.");
sub("3. GET /api/v1/catalog/careers/{slug}");
para("Purpose: retrieve one career by a readable slug such as mechanical-engineer. Output: career identity, codes, interest profile, reviewed profile, source versions and caveats. Tables: careers, career_interest_profiles, career_profiles, dataset_versions.");
sub("4. GET /api/v1/catalog/streams");
para("Query: topTwo=RI and segment=explorer|pathfinder|launcher. Output items contain streamCode, title, description, rank and reasonKey. Tables: stream_maps, stream_map_items, stream_options, dataset_versions.");
sub("5. GET /api/v1/catalog/colleges");
para("Query: state is required; pathwayId?, discipline?, limit 1-50?. Returns verified colleges only. Tables: colleges, college_programs, disciplines, pathway_disciplines, dataset_versions.");
sub("6. GET /api/v1/catalog/aid-schemes");
para("Query: state?, level?, annualIncome?, category?, limit?. Categories include general, obc, sc, st, ews, minority and other. Returns potential schemes with a verification caveat. Tables: aid_schemes, aid_criteria, dataset_versions.");
sub("7. GET /api/v1/catalog/datasets");
para("Purpose: list published dataset versions and sources. Input: none. Output: datasetKey, version, checksumSha256, recordCount, publishedAt and source metadata. Tables: dataset_versions, knowledge_sources.");

newPage(); title("10. API inventory - protected import endpoints");
sub("8. POST /api/v1/internal/catalog/imports");
para("Purpose: import one allowlisted local reviewed dataset. It does not accept an arbitrary path or upload.");
code(["Authorization: Bearer <INTERNAL_API_KEY>", "idempotency-key: <new UUID>", "Content-Type: application/json", "", '{ "datasetKey": "colleges-poc" }']);
para("Allowed keys currently include careers-poc, streams-poc, colleges-poc and aid-schemes-poc. The response contains importId, datasetKey, status, datasetVersionId, version, recordCount, checksumSha256 and issues[]. It writes dataset-specific knowledge tables, knowledge_sources, dataset_versions and operations.audit_events.");
sub("9. GET /api/v1/internal/catalog/imports/{id}/report");
para("Purpose: retrieve an earlier import result. The path ID is the importId returned by POST /imports; it is not the idempotency key. Authorization uses the same INTERNAL_API_KEY. The current report is read from safe metadata in operations.audit_events.");
code(["Authorization: Bearer <INTERNAL_API_KEY>", "GET /api/v1/internal/catalog/imports/<importId>/report"]);
sub("Example import response");
code(['{', '  "importId": "8cfd05c0-c02a-4d55-a8d0-3d760493096d",', '  "datasetKey": "colleges-poc",', '  "status": "published",', '  "datasetVersionId": "<uuid>",', '  "version": "2026-07-31",', '  "recordCount": 8,', '  "checksumSha256": "a7515180...",', '  "issues": []', '}']);

title("11. Important implementation gaps");
bullet("External O*NET/NCO/AISHE acquisition is not automated yet.");
bullet("career_value_profiles exists but is not fully populated/exposed by the current career flow.");
bullet("The career dataset is still a small POC, not a production Indian catalogue.");
bullet("Entity-level source provenance and narrative/RAG documents were deferred.");

newPage(); title("12. Indian occupations and missing RIASEC data");
para("RIASEC means Realistic, Investigative, Artistic, Social, Enterprising and Conventional. O*NET RIASEC information reflects a US occupational taxonomy and must not be copied blindly to Indian occupations.");
sub("Indian occupation with no O*NET match");
bullet("Create a stable YuvaNext UUID and slug.");
bullet("Store the verified Indian NCO code when one exists.");
bullet("Set onetCode to null; never invent an O*NET code.");
bullet("Store Indian pathways, education and locally sourced context.");
bullet("Keep the RIASEC profile unavailable until it is reviewed.");
sub("O*NET occupation that is not locally applicable");
bullet("Do not automatically recommend it to Indian students.");
bullet("Keep it draft/not_applicable, or show it only for discovery with a clear caveat.");
bullet("Do not claim Indian routes, salaries or colleges without verified local evidence.");
sub("When an O*NET-to-NCO equivalence is plausible");
para("Create an explicit crosswalk and require domain review. Record mapping source, reviewer, review date, method and confidence. A shared title alone is not enough evidence.");
sub("Recommended production fields");
code(['{', '  "onetCode": null,', '  "ncoCode": "<verified NCO code or null>",', '  "riasecStatus": "unavailable | provisional | reviewed",', '  "riasecSource": null,', '  "riasecConfidence": null,', '  "localApplicability": "india_verified | uncertain | not_applicable",', '  "reviewedBy": null,', '  "reviewedAt": null', '}']);
sub("Safe recommendation policy");
para("A career without a trustworthy RIASEC vector may appear in general search with a caveat, but it must be excluded from deterministic RIASEC matching until an India-specific expert-reviewed profile is available. This prevents fabricated precision and misleading recommendations.");

title("13. Final architectural conclusion");
para("The project has a sound versioned-catalog foundation: contracts, validation, transactional imports, Supabase persistence, public retrieval APIs and audit reports. The next production milestone is authoritative acquisition plus entity-level provenance and Indian domain review. The database, not the language model, must remain the source of verified career, college and financial-aid facts.");

finishPage();
const objects=[]; const add=s=>(objects.push(s),objects.length);
const f1=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const f2=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const f3=add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
const streams=pages.map(p=>add(`<< /Length ${Buffer.byteLength(p)} >>\nstream\n${p}\nendstream`));
const pageIds=[], pagesId=objects.length+pages.length+1;
for(let i=0;i<pages.length;i++)pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${streams[i]} 0 R >>`));
add(`<< /Type /Pages /Kids [${pageIds.map(i=>`${i} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
const catalog=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
let pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", offsets=[0];
objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf,"binary"));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});
const xref=Buffer.byteLength(pdf,"binary"); pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
for(let i=1;i<offsets.length;i++)pdf+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;
pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
fs.writeFileSync(output,Buffer.from(pdf,"binary"));
console.log(`Created ${output.pathname} (${pages.length} pages)`);
