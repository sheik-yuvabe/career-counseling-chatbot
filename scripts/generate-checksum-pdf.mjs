import fs from "node:fs";

const out = new URL("../docs/checksum-sha256-explainer.pdf", import.meta.url);
const W = 595.28, H = 841.89, margin = 52;
const green = "0.03 0.36 0.28", mint = "0.92 0.98 0.96", dark = "0.09 0.20 0.17";
const pages = [];
let ops = [], y = 0;

const esc = (s) => s.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
function text(line, x, yy, size = 11, font = "F1", color = dark) {
  ops.push(`${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${yy} Tm (${esc(line)}) Tj ET`);
}
function rect(x, yy, w, h, color) { ops.push(`${color} rg ${x} ${yy} ${w} ${h} re f`); }
function wrap(value, max = 82) {
  const words = value.split(/\s+/); const lines = []; let line = "";
  for (const word of words) { const next = line ? `${line} ${word}` : word; if (next.length > max) { lines.push(line); line = word; } else line = next; }
  if (line) lines.push(line); return lines;
}
function para(value, size = 10.5, gap = 14, indent = 0, font = "F1") {
  for (const line of wrap(value, indent ? 76 : 84)) { text(line, margin + indent, y, size, font); y -= gap; }
  y -= 5;
}
function heading(value) { y -= 8; text(value, margin, y, 15, "F2", green); y -= 23; }
function bullet(value) { para(`-  ${value}`, 10.5, 14, 10); }
function newPage(title) {
  if (ops.length) pages.push(ops.join("\n")); ops = [];
  rect(0, H - 122, W, 122, green);
  text("YUVANEXT KNOWLEDGE MODULE 3", margin, H - 42, 9, "F2", "0.72 0.96 0.87");
  text(title, margin, H - 76, 24, "F2", "1 1 1");
  text("Dataset integrity and version-control clarification", margin, H - 99, 11, "F1", "0.90 1 0.96");
  y = H - 158;
}

newPage("Understanding checksumSha256");
rect(margin, y - 59, W - margin * 2, 66, mint);
text("SIMPLE DEFINITION", margin + 15, y - 15, 9, "F2", green);
text("checksumSha256 is a 64-character digital fingerprint", margin + 15, y - 34, 12, "F2");
text("calculated from the exact content of a dataset using SHA-256.", margin + 15, y - 51, 11);
y -= 87;

heading("Why the project uses it");
bullet("Detects whether an approved dataset was changed or corrupted.");
bullet("Confirms that validation and import use exactly the same content.");
bullet("Prevents one version label from representing two different datasets.");
bullet("Supports repeatable imports, troubleshooting, and audit history.");

heading("How it works");
para("1. Prepare the reviewed JSON records.  2. Calculate their SHA-256 fingerprint.  3. Compare it with the checksum stored in manifest.json.  4. Import when they match; reject when they differ.");

heading("Example manifest value");
rect(margin, y - 73, W - margin * 2, 80, dark);
text('{', margin + 14, y - 16, 9.5, "F3", "0.90 1 0.96");
text('  "datasetKey": "colleges-poc",', margin + 14, y - 31, 9.5, "F3", "0.90 1 0.96");
text('  "version": "2026-07-31",', margin + 14, y - 46, 9.5, "F3", "0.90 1 0.96");
text('  "checksumSha256": "a7515180...41da497"', margin + 14, y - 61, 9.5, "F3", "0.90 1 0.96");
text('}', margin + 14, y - 76, 9.5, "F3", "0.90 1 0.96");
y -= 104;
para("Changing even one character in the dataset produces a different checksum. If version 2026-07-31 already exists with another checksum, the importer rejects it with: Dataset version already exists with a different checksum.");
para("The correct response is normally to review the change and publish a new version. An already-published version should remain immutable.");

newPage("Integrity, accuracy, and the right explanation");
heading("Integrity is not the same as accuracy");
rect(margin, y - 91, 235, 98, mint);
text("CHECKSUM CONFIRMS INTEGRITY", margin + 13, y - 17, 10, "F2", green);
text("It proves the imported file has the", margin + 13, y - 39, 10);
text("expected content and has not changed", margin + 13, y - 54, 10);
text("since its fingerprint was calculated.", margin + 13, y - 69, 10);
rect(margin + 250, y - 91, 241, 98, "0.99 0.96 0.88");
text("REVIEW CONFIRMS ACCURACY", margin + 263, y - 17, 10, "F2", "0.70 0.42 0.05");
text("It does not prove that career, college,", margin + 263, y - 39, 10);
text("O*NET, NCO, or scholarship facts are", margin + 263, y - 54, 10);
text("correct. Source checks and review do.", margin + 263, y - 69, 10);
y -= 126;

heading("Professional explanation for a meeting or review");
rect(margin, y - 153, W - margin * 2, 162, green);
let quoteY = y - 24;
for (const line of wrap("We use checksumSha256 to protect dataset integrity. Every approved dataset version has a unique fingerprint. During import, the system recalculates and compares that fingerprint, which detects modifications and prevents a published version from silently changing. Source verification and human review are separate controls used to establish factual accuracy.", 69)) {
  text(line, margin + 18, quoteY, 11, "F1", "1 1 1"); quoteY -= 18;
}
y -= 187;

heading("Practical decision rule");
bullet("Same version and same checksum: the import can safely return already_published.");
bullet("Same version and different checksum: reject the import and investigate the change.");
bullet("Approved changed content: create a new dataset version and a new checksum.");
bullet("Correct checksum but unverified facts: do not publish until source and human review pass.");

text("YuvaNext Career Counselling Chatbot  |  Knowledge Module 3", margin, 34, 8.5, "F1", "0.40 0.48 0.45");
pages.push(ops.join("\n"));

const objects = [];
const add = (s) => { objects.push(s); return objects.length; };
const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const f3 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
const pageIds = [], contentIds = [];
for (const content of pages) contentIds.push(add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`));
const pagesId = objects.length + pages.length + 1;
for (let i = 0; i < pages.length; i++) pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`));
add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", offsets = [0];
objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf, "binary")); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
const xref = Buffer.byteLength(pdf, "binary");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
fs.writeFileSync(out, Buffer.from(pdf, "binary"));
console.log(out.pathname);
