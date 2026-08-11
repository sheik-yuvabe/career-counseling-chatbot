import fs from "node:fs";

const sourcePath = process.argv[2];
const outputPath = process.argv[3] ?? "docs/module-3-complete-api-flow.html";
if (!sourcePath) throw new Error("Pass the source text path");

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

let text = fs.readFileSync(sourcePath, "utf8")
  .replaceAll("â†“", "↓")
  .replaceAll("â€œ", "“")
  .replaceAll("â€", "”")
  .replaceAll("â€™", "’")
  .replaceAll("â€“", "–")
  .replaceAll("â€”", "—");

const lines = text.split(/\r?\n/);
let body = "";
let index = 0;
let inCode = false;
const closeCode = () => {
  if (inCode) { body += "</code></pre>"; inCode = false; }
};
const isNumberedHeading = (line) => /^\d+\.\s/.test(line);
const sectionLabels = new Set([
  "Purpose", "Parameters", "Parameter", "Tables used", "Tables touched",
  "Swagger test", "Basic Swagger test", "Filtered test", "Expected result",
  "Expected information", "Important response fields", "Important behaviour",
  "Flow", "Flow behind the endpoint", "Pathway-filter flow", "Authorization",
  "Required header", "Request body", "Allowed dataset keys:", "Import flow",
  "Expected response", "Idempotency-key versus import ID", "Possible errors:",
  "Recommended live presentation order", "Final explanation to your mentor",
  "Getting a real pathway ID", "What to tell your mentor", "Why salary is null",
]);

while (index < lines.length) {
  const line = lines[index].trimEnd();
  const trimmed = line.trim();
  if (!trimmed) { closeCode(); index++; continue; }

  if (trimmed === "Overall API flow") {
    closeCode(); body += `<section class="cover"><div class="eyebrow">YUVANEXT · KNOWLEDGE MODULE 3</div><h1>Complete API Flow</h1><p>Endpoints, parameters, validation, Supabase tables and mentor-ready Swagger testing</p></section>`;
    index++; continue;
  }
  if (isNumberedHeading(trimmed)) {
    closeCode(); body += `<h2>${escapeHtml(trimmed)}</h2>`; index++; continue;
  }
  if (sectionLabels.has(trimmed)) {
    closeCode(); body += `<h3>${escapeHtml(trimmed)}</h3>`; index++; continue;
  }
  if (/^(GET|POST) \/api\//.test(trimmed)) {
    closeCode(); body += `<div class="endpoint"><span>${trimmed.startsWith("GET") ? "GET" : "POST"}</span><code>${escapeHtml(trimmed.replace(/^(GET|POST)\s+/, ""))}</code></div>`;
    index++; continue;
  }
  if (trimmed.includes("\t")) {
    closeCode(); const rows = [];
    while (index < lines.length && lines[index].trim().includes("\t")) {
      rows.push(lines[index].trim().split("\t")); index++;
    }
    const [header, ...rest] = rows;
    body += `<table><thead><tr>${header.map((v) => `<th>${escapeHtml(v)}</th>`).join("")}</tr></thead><tbody>${rest.map((row) => `<tr>${row.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    continue;
  }
  if (trimmed === "↓" || /^[A-Za-z_]+\s*\+\s*[A-Za-z_]+$/.test(trimmed) || /^\s{2,}↓/.test(line)) {
    if (!inCode) { body += "<pre><code>"; inCode = true; }
    body += `${escapeHtml(line)}\n`; index++; continue;
  }
  if (/^[{[]/.test(trimmed) || inCode) {
    if (!inCode) { body += "<pre><code>"; inCode = true; }
    body += `${escapeHtml(line)}\n`;
    if (trimmed === "}" || trimmed === "]") closeCode();
    index++; continue;
  }
  if (/^(knowledge\.|operations\.|[a-z-]+-poc$|explorer$|pathfinder$|launcher$|general$|obc$|sc$|st$|ews$|minority$|other$|RI$|IS$|AE$|EC$|RR$|XY$|R$)/.test(trimmed)) {
    closeCode(); body += `<div class="item"><code>${escapeHtml(trimmed)}</code></div>`; index++; continue;
  }
  if (/^\d+\. (GET|POST)/.test(trimmed)) {
    closeCode(); body += `<div class="step">${escapeHtml(trimmed)}</div>`; index++; continue;
  }
  if (trimmed.startsWith("“") || trimmed.startsWith("This endpoint") || trimmed.startsWith("The Knowledge Module")) {
    closeCode(); body += `<div class="callout">${escapeHtml(trimmed)}</div>`; index++; continue;
  }
  closeCode(); body += `<p>${escapeHtml(trimmed)}</p>`; index++;
}
closeCode();

const html = `<!doctype html><html><head><meta charset="utf-8"><title>YuvaNext Module 3 Complete API Flow</title><style>
@page{size:A4;margin:17mm 15mm 18mm}@page{@bottom-right{content:"Page " counter(page);font:9px Arial;color:#60736d}}
*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17332b;font-size:10.4pt;line-height:1.45;margin:0} .cover{height:255mm;background:linear-gradient(145deg,#073c30,#15926f);color:white;margin:-17mm -15mm 12mm;padding:55mm 20mm;display:flex;flex-direction:column;justify-content:center;page-break-after:always}.eyebrow{letter-spacing:2px;font-weight:700;color:#a9f1da}.cover h1{font-size:34pt;margin:10px 0 16px}.cover p{font-size:16pt;max-width:145mm;color:#dcfff4}h2{color:#086248;font-size:20pt;border-bottom:3px solid #37b98f;padding-bottom:7px;margin:18px 0 12px;break-before:page}h3{color:#087056;font-size:12.5pt;margin:16px 0 6px}p{margin:5px 0 8px}.endpoint{display:flex;align-items:center;gap:10px;background:#e9f8f2;border-left:5px solid #15926f;padding:10px 12px;margin:7px 0 12px;break-inside:avoid}.endpoint span{font-weight:700;background:#15926f;color:white;border-radius:4px;padding:4px 9px}.endpoint code{font-size:11pt;font-weight:700}code{font-family:Consolas,monospace}pre{background:#102e27;color:#e9fff8;padding:11px 13px;border-radius:5px;white-space:pre-wrap;break-inside:avoid;font-size:9pt}table{width:100%;border-collapse:collapse;margin:8px 0 13px;break-inside:avoid}th{background:#0b6e54;color:white;text-align:left;padding:7px}td{border:1px solid #c9ddd6;padding:7px;vertical-align:top}tr:nth-child(even){background:#f1faf7}.item{display:inline-block;background:#eef7f4;border:1px solid #c7ddd5;border-radius:4px;padding:4px 8px;margin:2px 3px 2px 0}.callout{background:#effaf6;border-left:5px solid #efad2f;padding:11px 13px;margin:10px 0;font-weight:600;break-inside:avoid}.step{padding:7px 10px;margin:4px 0;background:#f1f7f5;border-radius:4px;font-weight:600}h2,h3,.endpoint,table,pre,.callout{break-after:avoid}footer{position:fixed;bottom:0}
</style></head><body>${body}</body></html>`;
fs.writeFileSync(outputPath, html);
console.log(outputPath);
