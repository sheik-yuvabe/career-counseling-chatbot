import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = path.resolve(import.meta.dirname, "../../..");
const sourcePath = path.join(root, "docs/mentor/module-4-end-to-end-endpoints.md");
const outputPath = path.join(root, "docs/mentor/module-4-end-to-end-endpoints.pdf");
const source = fs.readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

const pdf = await PDFDocument.create();
pdf.setTitle("YuvaNext Module 4 End-to-End Endpoint and Workflow Guide");
pdf.setAuthor("YuvaNext Backend Team");
pdf.setSubject("Phase A Module 4 mentor handoff");
pdf.setKeywords(["YuvaNext", "Module 4", "API", "Swagger", "Supabase", "Counselor"]);

const regular = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const mono = await pdf.embedFont(StandardFonts.Courier);
const monoBold = await pdf.embedFont(StandardFonts.CourierBold);

const pageSize = [595.28, 841.89];
const margin = 48;
const contentWidth = pageSize[0] - margin * 2;
const navy = rgb(0.06, 0.16, 0.25);
const teal = rgb(0.02, 0.46, 0.43);
const pale = rgb(0.93, 0.97, 0.97);
const ink = rgb(0.08, 0.11, 0.14);
const muted = rgb(0.34, 0.39, 0.43);
const white = rgb(1, 1, 1);

let page;
let y;
let pageNumber = 0;

const addPage = () => {
  page = pdf.addPage(pageSize);
  pageNumber += 1;
  page.drawRectangle({ x: 0, y: pageSize[1] - 26, width: pageSize[0], height: 26, color: navy });
  page.drawText("YUVANEXT  |  MODULE 4 MENTOR HANDOFF", {
    x: margin,
    y: pageSize[1] - 18,
    size: 8,
    font: bold,
    color: white,
  });
  page.drawText(String(pageNumber), {
    x: pageSize[0] - margin - 12,
    y: 22,
    size: 8,
    font: regular,
    color: muted,
  });
  y = pageSize[1] - 52;
};

const wrap = (text, font, size, width) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
};

const ensure = (height) => {
  if (!page || y - height < 46) addPage();
};

const drawLines = (lines, options = {}) => {
  const font = options.font ?? regular;
  const size = options.size ?? 9.5;
  const color = options.color ?? ink;
  const lineHeight = options.lineHeight ?? size * 1.4;
  const indent = options.indent ?? 0;
  ensure(lines.length * lineHeight + (options.after ?? 0));
  for (const line of lines) {
    page.drawText(line, { x: margin + indent, y, size, font, color });
    y -= lineHeight;
  }
  y -= options.after ?? 0;
};

const blocks = [];
let code = false;
let codeLines = [];
for (const raw of source.split("\n")) {
  if (raw.startsWith("```")) {
    if (code) {
      blocks.push({ type: "code", lines: codeLines });
      codeLines = [];
    }
    code = !code;
    continue;
  }
  if (code) {
    codeLines.push(raw);
    continue;
  }
  if (raw.startsWith("# ")) blocks.push({ type: "title", text: raw.slice(2) });
  else if (raw.startsWith("## ")) blocks.push({ type: "h2", text: raw.slice(3) });
  else if (raw.startsWith("### ")) blocks.push({ type: "h3", text: raw.slice(4) });
  else if (/^- /.test(raw)) blocks.push({ type: "bullet", text: raw.slice(2) });
  else if (/^\d+\. /.test(raw)) blocks.push({ type: "number", text: raw });
  else if (raw.trim()) blocks.push({ type: "p", text: raw.trim() });
  else blocks.push({ type: "space" });
}

for (const block of blocks) {
  if (block.type === "title") {
    addPage();
    page.drawRectangle({ x: 0, y: pageSize[1] - 250, width: pageSize[0], height: 224, color: navy });
    page.drawRectangle({ x: margin, y: pageSize[1] - 112, width: 58, height: 5, color: teal });
    const lines = wrap(block.text, bold, 25, contentWidth);
    let titleY = pageSize[1] - 142;
    for (const line of lines) {
      page.drawText(line, { x: margin, y: titleY, size: 25, font: bold, color: white });
      titleY -= 34;
    }
    y = pageSize[1] - 285;
    continue;
  }
  if (block.type === "h2") {
    ensure(38);
    y -= 8;
    page.drawText(block.text, { x: margin, y, size: 15, font: bold, color: navy });
    y -= 7;
    page.drawRectangle({ x: margin, y, width: 42, height: 2.5, color: teal });
    y -= 18;
    continue;
  }
  if (block.type === "h3") {
    ensure(28);
    y -= 4;
    drawLines(wrap(block.text, bold, 11.5, contentWidth), {
      font: bold,
      size: 11.5,
      color: teal,
      lineHeight: 15,
      after: 3,
    });
    continue;
  }
  if (block.type === "code") {
    const size = 7.5;
    const lineHeight = 10.5;
    const wrapped = block.lines.flatMap((line) =>
      line ? wrap(line, mono, size, contentWidth - 22) : [""],
    );
    const height = wrapped.length * lineHeight + 18;
    ensure(height + 8);
    page.drawRectangle({ x: margin, y: y - height + 7, width: contentWidth, height, color: pale });
    let codeY = y - 7;
    for (const line of wrapped) {
      page.drawText(line, { x: margin + 11, y: codeY, size, font: mono, color: navy });
      codeY -= lineHeight;
    }
    y -= height + 8;
    continue;
  }
  if (block.type === "bullet" || block.type === "number") {
    const prefix = block.type === "bullet" ? "-" : block.text.match(/^\d+\./)?.[0] ?? "";
    const text = block.type === "bullet" ? block.text : block.text.replace(/^\d+\.\s*/, "");
    const prefixWidth = 18;
    const lines = wrap(text, regular, 9.3, contentWidth - prefixWidth);
    ensure(lines.length * 13 + 2);
    page.drawText(prefix, { x: margin + 2, y, size: 9.3, font: monoBold, color: teal });
    for (let index = 0; index < lines.length; index += 1) {
      page.drawText(lines[index], {
        x: margin + prefixWidth,
        y,
        size: 9.3,
        font: regular,
        color: ink,
      });
      y -= 13;
    }
    y -= 1;
    continue;
  }
  if (block.type === "p") {
    drawLines(wrap(block.text, regular, 9.5, contentWidth), { after: 4 });
    continue;
  }
  y -= 5;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, await pdf.save());
console.log(`${outputPath}\nPAGES=${pdf.getPageCount()}`);
