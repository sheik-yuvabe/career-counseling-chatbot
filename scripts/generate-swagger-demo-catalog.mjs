import fs from "node:fs";

const endpoints = [
  {
    n: 1, method: "GET", path: "/api/v1/catalog/datasets",
    purpose: "List published dataset versions and their traceable sources.",
    params: [["None", "—", "Click Try it out, then Execute"]],
    examples: [
      ["Swagger test", "GET /api/v1/catalog/datasets", "HTTP 200 with versions, checksums, counts and source metadata."],
      ["Browser or curl", "curl http://localhost:3000/api/v1/catalog/datasets", "The endpoint works without a user payload."],
    ],
    tables: "knowledge.dataset_versions, knowledge.knowledge_sources",
  },
  {
    n: 2, method: "GET", path: "/api/v1/catalog/careers/search",
    purpose: "Search published careers by text or domain.",
    params: [["q", "Optional", "Text typed in the career-search box"], ["domain", "Optional", "Selected career-domain filter"], ["cursor", "Optional", "Next-page value from the previous response"], ["limit", "Optional", "Maximum results, 1–50; default 20"]],
    examples: [
      ["Text search", "q = engineer\ndomain = empty\ncursor = empty\nlimit = 20\n\nGET /api/v1/catalog/careers/search?q=engineer&limit=20", "Returns published careers matching engineer."],
      ["Domain filter", "q = empty\ndomain = engineering\ncursor = empty\nlimit = 10\n\nGET /api/v1/catalog/careers/search?domain=engineering&limit=10", "Returns up to ten engineering-domain careers."],
    ],
    tables: "knowledge.careers, knowledge.dataset_versions",
  },
  {
    n: 3, method: "GET", path: "/api/v1/catalog/careers/{slug}",
    purpose: "Return complete reviewed information for one selected career.",
    params: [["slug", "Required", "Lowercase hyphenated identifier copied from search results"]],
    examples: [
      ["Mechanical Engineers", "slug = mechanical-engineers\n\nGET /api/v1/catalog/careers/mechanical-engineers", "Returns identity, codes, RIASEC, skills and review information."],
      ["Civil Engineers", "slug = civil-engineers\n\nGET /api/v1/catalog/careers/civil-engineers", "Use an exact slug returned by career search."],
    ],
    tables: "knowledge.careers, career_interest_profiles, career_profiles, dataset_versions",
  },
  {
    n: 4, method: "GET", path: "/api/v1/catalog/streams",
    purpose: "Return reviewed stream choices for top-two RIASEC letters and journey segment.",
    params: [["topTwo", "Required", "Two distinct letters from R, I, A, S, E, C"], ["segment", "Required", "explorer, pathfinder or launcher"]],
    examples: [
      ["RI explorer", "topTwo = RI\nsegment = explorer\n\nGET /api/v1/catalog/streams?topTwo=RI&segment=explorer", "Returns the stored RI explorer mapping."],
      ["SE pathfinder", "topTwo = SE\nsegment = pathfinder\n\nGET /api/v1/catalog/streams?topTwo=SE&segment=pathfinder", "An empty list means the mapping is not published."],
    ],
    tables: "knowledge.stream_maps, stream_map_items, stream_options, dataset_versions",
  },
  {
    n: 5, method: "GET", path: "/api/v1/catalog/colleges",
    purpose: "List verified colleges in a state, optionally narrowed by pathway or discipline.",
    params: [["state", "Required", "Full state name"], ["pathwayId", "Optional", "UUID from knowledge.pathways.id"], ["discipline", "Optional", "Academic discipline name"], ["limit", "Optional", "Maximum results, 1–50"]],
    examples: [
      ["Tamil Nadu colleges", "state = Tamil Nadu\npathwayId = empty\ndiscipline = empty\nlimit = 20\n\nGET /api/v1/catalog/colleges?state=Tamil%20Nadu&limit=20", "Returns verified Tamil Nadu colleges."],
      ["Physics", "state = Tamil Nadu\npathwayId = empty\ndiscipline = Physics\nlimit = 20\n\nGET /api/v1/catalog/colleges?state=Tamil%20Nadu&discipline=Physics&limit=20", "Returns the verified college with a mapped Physics programme."],
    ],
    tables: "knowledge.colleges, college_programs, disciplines, pathway_disciplines, pathways, dataset_versions",
  },
  {
    n: 6, method: "GET", path: "/api/v1/catalog/aid-schemes",
    purpose: "Return possible verified aid schemes without guaranteeing final eligibility.",
    params: [["state", "Optional", "Student state"], ["level", "Optional", "Stored education level, such as ug or phd"], ["annualIncome", "Optional", "Volunteered non-negative annual family income"], ["category", "Optional", "general, obc, sc, st, ews, minority or other"], ["limit", "Optional", "Maximum results, 1–50"]],
    examples: [
      ["Tamil Nadu schemes", "state = Tamil Nadu\nlevel = empty\nannualIncome = empty\ncategory = empty\nlimit = 20\n\nGET /api/v1/catalog/aid-schemes?state=Tamil%20Nadu&limit=20", "Returns verified candidate schemes for Tamil Nadu."],
      ["Ph.D. schemes", "state = Tamil Nadu\nlevel = phd\nannualIncome = empty\ncategory = empty\nlimit = 20\n\nGET /api/v1/catalog/aid-schemes?state=Tamil%20Nadu&level=phd&limit=20", "Should include Chief Minister Research Fellowship when published."],
    ],
    tables: "knowledge.aid_schemes, aid_criteria, dataset_versions",
  },
  {
    n: 7, method: "POST", path: "/api/v1/internal/catalog/imports",
    purpose: "Validate and transactionally publish an allowlisted reviewed local dataset.",
    params: [["Authorization", "Required", "Bearer <INTERNAL_API_KEY> through Swagger Authorize"], ["idempotency-key", "Required", "New UUID; prevents duplicate processing and identifies report"], ["datasetKey", "Required body field", "Selects an allowlisted local dataset"]],
    examples: [
      ["Aid schemes", "Authorization: Bearer <INTERNAL_API_KEY>\nidempotency-key: b6065da3-43d7-414f-a976-e2a81574adaa\n\n{\n  \"datasetKey\": \"aid-schemes-poc\"\n}", "Returns published or already_published. Copy importId."],
      ["Colleges", "Authorization: Bearer <INTERNAL_API_KEY>\nidempotency-key: 6e8fbda8-26a1-42ca-9879-0ebfc98f3906\n\n{\n  \"datasetKey\": \"colleges-poc\"\n}", "Use a different UUID for a different request body."],
    ],
    tables: "knowledge_sources, dataset_versions, dataset-specific tables, operations.audit_events",
  },
  {
    n: 8, method: "GET", path: "/api/v1/internal/catalog/imports/{id}/report",
    purpose: "Retrieve the stored audit result of a previous internal import.",
    params: [["Authorization", "Required", "Same internal Bearer key"], ["id", "Required", "Actual importId returned by POST"]],
    examples: [
      ["Aid report", "Authorization: Bearer <INTERNAL_API_KEY>\nid = b6065da3-43d7-414f-a976-e2a81574adaa\n\nGET /api/v1/internal/catalog/imports/b6065da3-43d7-414f-a976-e2a81574adaa/report", "Works only after the matching POST request."],
      ["College report", "Authorization: Bearer <INTERNAL_API_KEY>\nid = 6e8fbda8-26a1-42ca-9879-0ebfc98f3906\n\nGET /api/v1/internal/catalog/imports/6e8fbda8-26a1-42ca-9879-0ebfc98f3906/report", "A valid random UUID with no audit record returns 404."],
    ],
    tables: "operations.audit_events",
  },
];

const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const endpointHtml = endpoints.map((e) => `
<h2>${e.n}. ${esc(e.purpose)}</h2>
<div class="endpoint"><b class="${e.method === "POST" ? "post" : ""}">${e.method}</b><code>${esc(e.path)}</code></div>
<table><thead><tr><th>Parameter / payload</th><th>Required?</th><th>Use</th></tr></thead><tbody>${e.params.map((p) => `<tr><td><code>${esc(p[0])}</code></td><td>${esc(p[1])}</td><td>${esc(p[2])}</td></tr>`).join("")}</tbody></table>
${e.examples.map((x, i) => `<div class="example"><h3>Example ${i + 1} — ${esc(x[0])}</h3><pre>${esc(x[1])}</pre><p><b>Expected:</b> ${esc(x[2])}</p></div>`).join("")}
<p><b>Tables read/modified:</b> <code>${esc(e.tables)}</code></p>`).join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Module 3 Swagger Demonstration Catalog</title><style>
@page{size:A4;margin:16mm 14mm 18mm}@page{@bottom-right{content:"Page " counter(page);font:9px Arial;color:#60736d}}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17332b;font-size:10pt;line-height:1.43;margin:0}.cover{height:262mm;background:linear-gradient(145deg,#073c30,#15926f);color:white;margin:-16mm -14mm 0;padding:48mm 19mm;display:flex;flex-direction:column;justify-content:center;page-break-after:always}.eyebrow{letter-spacing:2px;font-weight:bold;color:#a9f1da}.cover h1{font-size:31pt;margin:11px 0 15px}.cover p{font-size:15pt;color:#dcfff4;max-width:155mm}.badge{background:#efad2f;color:#17332b;font-weight:bold;border-radius:20px;padding:6px 12px;margin-top:15px;width:max-content}h2{font-size:18pt;color:#086248;border-bottom:3px solid #37b98f;padding-bottom:6px;margin:18px 0 11px;break-before:page}h3{font-size:12pt;color:#087056;margin:8px 0 5px}p{margin:5px 0 8px}code{font-family:Consolas,monospace;font-size:9pt}.endpoint{display:flex;align-items:center;gap:9px;background:#e9f8f2;border-left:5px solid #15926f;padding:10px 12px;margin:8px 0 12px}.endpoint b{background:#15926f;color:white;border-radius:4px;padding:4px 9px}.endpoint b.post{background:#1676b8}.endpoint code{font-size:11pt;font-weight:bold}pre{background:#102e27;color:#eafff8;padding:11px 13px;border-radius:5px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:8.8pt}table{width:100%;border-collapse:collapse;margin:7px 0 12px}th{background:#0b6e54;color:white;text-align:left;padding:7px}td{border:1px solid #c9ddd6;padding:7px;vertical-align:top}tr:nth-child(even){background:#f1faf7}.example{border:1px solid #bcdacf;border-radius:6px;padding:9px 11px;margin:9px 0;break-inside:avoid}.callout{background:#effaf6;border-left:5px solid #efad2f;padding:11px 13px;margin:10px 0}.flow{font-family:Consolas,monospace;text-align:center;background:#f0faf6;padding:12px;border-radius:6px;white-space:pre-wrap}li{margin:5px 0}h2,h3,.endpoint,table,pre,.example,.callout{break-after:avoid}
</style></head><body><section class="cover"><div class="eyebrow">YUVANEXT · KNOWLEDGE MODULE 3</div><h1>Swagger Demonstration Catalog</h1><p>Correct endpoint flow, parameters, payloads, two test examples per endpoint, and expected results</p><div class="badge">8 ENDPOINTS · 16 EXAMPLES</div></section>
<h2>Before starting</h2><pre>cd D:\\career-counseling-chatbot\\career-counseling-chatbot\npnpm.cmd dev\n\nSwagger: http://localhost:3000/docs</pre><div class="callout"><b>GET requests have no JSON body.</b> Enter their values under Parameters. Only the internal POST sends a JSON request body.</div><h3>Correct demonstration flow</h3><div class="flow">Published datasets\n↓\nCareer search → Career detail\n↓\nStream recommendations\n↓\nVerified colleges → Verified aid schemes\n↓\nInternal import → Import report</div>${endpointHtml}
<h2>Live presentation checklist</h2><ol><li>Run datasets to prove source traceability.</li><li>Search engineer, then copy an exact slug into career detail.</li><li>Run streams with RI and explorer.</li><li>Run colleges for Tamil Nadu, then add a discipline.</li><li>Run aid schemes for Tamil Nadu, then filter level=phd.</li><li>Use Swagger Authorize privately; never expose INTERNAL_API_KEY.</li><li>POST aid-schemes-poc with a newly generated UUID.</li><li>Copy importId into the report endpoint.</li></ol><div class="callout"><b>Mentor explanation:</b> Public endpoints retrieve only published reviewed knowledge. Internal endpoints control how allowlisted local datasets enter Supabase. Every import is validated, checksum-protected, versioned and auditable.</div>
<h2>Common Swagger results</h2><table><thead><tr><th>Result</th><th>Meaning and correction</th></tr></thead><tbody><tr><td>400</td><td>Invalid or missing parameter. Check UUID, slug, RIASEC letters, segment and limit.</td></tr><tr><td>401</td><td>Missing or incorrect internal Bearer token. Use Swagger Authorize.</td></tr><tr><td>404 report</td><td>The UUID has no stored audit report. Use the actual importId returned by POST.</td></tr><tr><td>Empty data</td><td>No published rows match. Remove optional filters and retry.</td></tr><tr><td>already_published</td><td>Successful idempotent result: the same version and checksum already exist.</td></tr></tbody></table></body></html>`;
fs.writeFileSync("docs/module-3-swagger-demo-catalog.html", html);
console.log("docs/module-3-swagger-demo-catalog.html");
