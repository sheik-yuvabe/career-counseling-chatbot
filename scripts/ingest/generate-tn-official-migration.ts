import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const collegeCodes = ["1130013", "1180007", "1140011", "1120013", "1120018", "1120015", "1120012", "1130023", "1180016", "2150008"];
const scholarshipNumbers = new Set([2, 3, 4, 5, 7, 9, 10, 13, 14, 15]);
const rawRoot = resolve("data/raw/tamil-nadu/tndce/2026-08-05");
const directoryText = await readFile(resolve(rawRoot, "college-directory.html"), "utf8");
const scholarshipText = await readFile(resolve(rawRoot, "scholarships.html"), "utf8");

const clean = (value: string) => value.replace(/<[^>]+>/g, " ").replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&#039;", "'").replace(/\s+/g, " ").trim();
const rows = (html: string) =>
  [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => match[1] ?? "")
    .map((rowHtml) =>
      [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
        clean(cell[1] ?? ""),
      ),
    )
    .filter((row) => row.length > 0);
const quote = (value: string | null) => value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
const slug = (value: string) => value.toLowerCase().replaceAll("&", " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const uuid = (prefix: string, index: number) => `${prefix}000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

const directoryRows = rows(directoryText);
const colleges = collegeCodes.map((code) => {
  const row = directoryRows.find((candidate) => candidate[1]?.startsWith(`${code} -`));
  if (!row) throw new Error(`Tamil Nadu college code not found: ${code}`);
  return { code, name: row[1]!.replace(/^\d+\s*-\s*/, ""), district: row[2]!, region: row[3]!, type: row[4]! };
});

const programs = [];
for (const [index, college] of colleges.entries()) {
  const html = await readFile(resolve(rawRoot, "courses", `${college.code}.html`), "utf8");
  const course = rows(html).find((row) => row.length >= 5);
  if (!course) throw new Error(`No official programme found for ${college.code}`);
  programs.push({ index: index + 1, college, degree: course[1]!, subject: course[2]!, delivery: course[3]!, intake: course[4]! });
}

const scholarshipRows = rows(scholarshipText)
  .filter((row) => row.length >= 6 && scholarshipNumbers.has(Number(row[0])))
  .map((row) => ({ number: Number(row[0]), name: row[1]!, provider: row[2]!, eligibility: row[3]!, award: row[4]!, apply: row[5]! }));
if (scholarshipRows.length !== 10) throw new Error(`Expected 10 official scholarships; found ${scholarshipRows.length}`);

const collegeValues = programs.map(({ index, college }) => `(${quote(uuid("d1", index))}::uuid, ${quote(college.code)}, ${quote(college.name)}, ${quote(college.district)}, 'Tamil Nadu', ${quote(college.type)}, ${quote(`https://tndce.tn.gov.in/Home/course_details/${college.code}`)})`);
const disciplineValues = programs.map(({ index, subject }) => `(${quote(uuid("d2", index))}::uuid, ${quote(`tn-dce-${slug(subject)}-${index}`)}, ${quote(clean(subject))}, 'arts-science')`);
const programValues = programs.map(({ index, degree, subject, delivery, intake }) => `(${quote(uuid("d3", index))}::uuid, ${quote(uuid("d1", index))}::uuid, ${quote(uuid("d2", index))}::uuid, ${quote(`${degree} - ${subject}`)}, ${quote(`Official listing: ${delivery}; sanctioned intake ${intake}`)})`);
const aidValues = scholarshipRows.map((scheme, index) => `(${quote(uuid("d4", index + 1))}::uuid, ${quote(`TN-DCE-${String(scheme.number).padStart(2, "0")}`)}, ${quote(scheme.name)}, ${quote(scheme.provider)}, ${quote(scheme.eligibility)}, ${quote(scheme.award)}, ${quote(scheme.apply)})`);
const criterionValues = scholarshipRows.map((scheme, index) => `(${quote(uuid("d5", index + 1))}::uuid, ${quote(uuid("d4", index + 1))}::uuid, ${quote(scheme.eligibility)}, ${scheme.number})`);

const checksumColleges = createHash("sha256").update(directoryText).update(await Promise.all(collegeCodes.map((code) => readFile(resolve(rawRoot, "courses", `${code}.html`), "utf8"))).then((parts) => parts.join(""))).digest("hex");
const checksumAid = createHash("sha256").update(scholarshipText).digest("hex");

const sql = `-- Generated from official Tamil Nadu Directorate of Collegiate Education pages captured 2026-08-05.
BEGIN;
INSERT INTO knowledge.knowledge_sources (id, source_key, name, source_type, base_url, publisher, license_ref, trust_level, status, created_at, updated_at) VALUES
('d1000000-0000-4000-8000-999999999991','tn-dce-college-directory','Tamil Nadu Directorate of Collegiate Education - College Directory','official_government_directory','https://tndce.tn.gov.in/','Directorate of Collegiate Education, Government of Tamil Nadu',NULL,'authoritative_external','active','2026-08-05T00:00:00Z','2026-08-05T00:00:00Z'),
('d1000000-0000-4000-8000-999999999992','tn-dce-scholarships','Tamil Nadu Directorate of Collegiate Education - Scholarships','official_government_directory','https://tndce.tn.gov.in/Home/scholarship','Directorate of Collegiate Education, Government of Tamil Nadu',NULL,'authoritative_external','active','2026-08-05T00:00:00Z','2026-08-05T00:00:00Z')
ON CONFLICT (source_key) DO UPDATE SET name=excluded.name, base_url=excluded.base_url, updated_at=excluded.updated_at;
INSERT INTO knowledge.dataset_versions (id, source_id, dataset_key, version, checksum, record_count, import_status, validation_report_json, imported_at, published_at, created_by) VALUES
('d1000000-0000-4000-8000-999999999993','d1000000-0000-4000-8000-999999999991','tn-dce-colleges-programmes','2026-08-05','${checksumColleges}',30,'published','{"status":"validated","colleges":10,"disciplines":10,"programmes":10}'::jsonb,'2026-08-05T00:00:00Z','2026-08-05T00:00:00Z',NULL),
('d1000000-0000-4000-8000-999999999994','d1000000-0000-4000-8000-999999999992','tn-dce-aid-schemes','2026-08-05','${checksumAid}',20,'published','{"status":"validated","schemes":10,"criteria":10,"warning":"Eligibility must be reconfirmed before application"}'::jsonb,'2026-08-05T00:00:00Z','2026-08-05T00:00:00Z',NULL)
ON CONFLICT (dataset_key, version) DO UPDATE SET checksum=excluded.checksum, record_count=excluded.record_count, validation_report_json=excluded.validation_report_json;
WITH data(id,external_code,name,city,state,institution_type,website_url) AS (VALUES ${collegeValues.join(",\n")})
INSERT INTO knowledge.colleges (id,external_code,name,city,state,institution_type,tier,admission_route,fees_band,website_url,verification_status,last_verified_at,dataset_version_id,created_at,updated_at)
SELECT id,external_code,name,city,state,institution_type,NULL,'Refer to the Tamil Nadu Directorate admission process',NULL,website_url,'verified','2026-08-05T00:00:00Z','d1000000-0000-4000-8000-999999999993','2026-08-05T00:00:00Z','2026-08-05T00:00:00Z' FROM data
ON CONFLICT (id) DO UPDATE SET name=excluded.name,city=excluded.city,website_url=excluded.website_url,last_verified_at=excluded.last_verified_at;
WITH data(id,discipline_code,title,domain_code) AS (VALUES ${disciplineValues.join(",\n")})
INSERT INTO knowledge.disciplines (id,discipline_code,title,domain_code,status) SELECT id,discipline_code,title,domain_code,'active' FROM data
ON CONFLICT (discipline_code) DO UPDATE SET title=excluded.title,domain_code=excluded.domain_code,status='active';
WITH data(id,college_id,discipline_id,program_name,source_note) AS (VALUES ${programValues.join(",\n")})
INSERT INTO knowledge.college_programs (id,college_id,discipline_id,program_name,qualification_level,duration_band,admission_route,fees_band,verification_status,last_verified_at,dataset_version_id)
SELECT id,college_id,discipline_id,program_name,'ug','Typically 3 years; confirm with institution',source_note,NULL,'verified','2026-08-05T00:00:00Z','d1000000-0000-4000-8000-999999999993' FROM data
ON CONFLICT (id) DO UPDATE SET program_name=excluded.program_name,admission_route=excluded.admission_route,last_verified_at=excluded.last_verified_at;
WITH data(id,aid_code,name,provider,eligibility,benefit,apply_instruction) AS (VALUES ${aidValues.join(",\n")})
INSERT INTO knowledge.aid_schemes (id,aid_code,name,provider_type,provider,level,states,eligibility_summary,benefit_summary,amount_text,application_url,portal_name,apply_window_start,apply_window_end,verification_status,last_verified_at,dataset_version_id)
SELECT id,aid_code,name,'government',provider,'multiple',ARRAY['Tamil Nadu'],eligibility,benefit,benefit,'https://tndce.tn.gov.in/Home/scholarship',apply_instruction,NULL,NULL,'verified','2026-08-05T00:00:00Z','d1000000-0000-4000-8000-999999999994' FROM data
ON CONFLICT (aid_code) DO UPDATE SET name=excluded.name,provider=excluded.provider,eligibility_summary=excluded.eligibility_summary,benefit_summary=excluded.benefit_summary,last_verified_at=excluded.last_verified_at;
WITH data(id,aid_scheme_id,source_text,source_number) AS (VALUES ${criterionValues.join(",\n")})
INSERT INTO knowledge.aid_criteria (id,aid_scheme_id,criterion_type,operator,value_json,is_required,source_text,criterion_version)
SELECT id,aid_scheme_id,'official_eligibility_text','manual_review',jsonb_build_object('sourceListNumber',source_number),true,source_text,'tn-dce-2026-08-05' FROM data
ON CONFLICT (id) DO UPDATE SET value_json=excluded.value_json,source_text=excluded.source_text,criterion_version=excluded.criterion_version;
COMMIT;
`;

const output = resolve("supabase/migrations/20260805000600_tn_dce_official_colleges_aid.sql");
await writeFile(output, sql, "utf8");
console.log(`Generated ${output}: 10 colleges, 10 programmes, 10 disciplines, 10 schemes, 10 criteria`);
