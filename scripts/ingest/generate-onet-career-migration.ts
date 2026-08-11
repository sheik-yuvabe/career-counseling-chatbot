import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Occupation = { onetsoc_code: string; title: string; description: string };
type Interest = {
  onetsoc_code: string;
  element_name: string;
  scale_id: string;
  data_value: number;
};
type OnetFile<T> = { row: T[] };

const selections: Array<[string, string]> = [
  ["15-2051.00", "technology"], ["15-1252.00", "technology"],
  ["17-2051.00", "engineering"], ["17-2141.00", "engineering"],
  ["29-1123.00", "healthcare"], ["29-2011.00", "healthcare"],
  ["25-2021.00", "education"], ["25-2031.00", "education"],
  ["13-2011.00", "business-finance"], ["13-2051.00", "business-finance"],
  ["17-2021.00", "agriculture-environment"], ["19-2041.00", "agriculture-environment"],
  ["47-2111.00", "skilled-trades"], ["51-4121.00", "skilled-trades"],
  ["27-1024.00", "arts-media-design"], ["27-3043.00", "arts-media-design"],
  ["23-1011.00", "law-public-service"], ["33-2011.00", "law-public-service"],
  ["19-2031.00", "science-research"], ["19-1022.00", "science-research"],
  ["13-1081.00", "logistics-operations"], ["11-3071.00", "logistics-operations"],
  ["35-1011.00", "hospitality-tourism"], ["11-9081.00", "hospitality-tourism"],
  ["21-1021.00", "social-community"], ["21-1012.00", "social-community"],
  ["17-1011.00", "architecture-construction"], ["11-9021.00", "architecture-construction"],
  ["47-2231.00", "renewable-energy"], ["49-9081.00", "renewable-energy"],
  ["49-3023.00", "transport-automotive"], ["53-2011.00", "transport-automotive"],
];

const ncoByOnet = new Map<string, string>([
  ["17-2051.00", "2142.0100"], ["17-2141.00", "2144.0100"],
  ["15-1252.00", "2512.0204"], ["29-1123.00", "2264.0100"],
  ["29-2011.00", "3212.0701"], ["25-2021.00", "2341.0400"],
  ["47-2231.00", "7421.1401"],
]);

const rawDir = resolve("data/raw/onet/30.4");
const occupationText = await readFile(resolve(rawDir, "occupation_data.json"), "utf8");
const interestText = await readFile(resolve(rawDir, "career_interest_types.json"), "utf8");
const occupations = JSON.parse(occupationText) as OnetFile<Occupation>;
const interests = JSON.parse(interestText) as OnetFile<Interest>;
const occupationByCode = new Map(occupations.row.map((row) => [row.onetsoc_code, row]));

const quote = (value: string | null) => value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
const slug = (title: string) => title.toLowerCase().replaceAll("&", " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const uuidFor = (index: number) => `e4000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const interestNames = ["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional"];
const highPointLetter = ["", "R", "I", "A", "S", "E", "C"];

const careerRows: string[] = [];
const profileRows: string[] = [];
for (const [index, [code, domain]] of selections.entries()) {
  const occupation = occupationByCode.get(code);
  if (!occupation) throw new Error(`O*NET occupation not found: ${code}`);
  const rows = interests.row.filter((row) => row.onetsoc_code === code);
  const values = interestNames.map((name) => rows.find((row) => row.scale_id === "OI" && row.element_name === name)?.data_value);
  if (values.some((value) => value === undefined)) throw new Error(`Incomplete RIASEC profile: ${code}`);
  const highPoint = rows.find((row) => row.scale_id === "IH" && row.element_name === "First Interest High-Point")?.data_value;
  if (highPoint === undefined) throw new Error(`Missing high-point code: ${code}`);
  careerRows.push(`(${quote(uuidFor(index + 1))}::uuid, ${quote(code)}, ${quote(ncoByOnet.get(code) ?? null)}, ${quote(slug(occupation.title))}, ${quote(occupation.title)}, ${quote(occupation.description)}, ${quote(domain)})`);
  profileRows.push(`(${quote(code)}, ${values.map((value) => (Number(value) / 7).toFixed(5)).join(", ")}, ${quote(highPointLetter[Number(highPoint)] ?? null)})`);
}

const checksum = createHash("sha256").update(occupationText).update(interestText).digest("hex");
const sql = `-- Generated only from official O*NET 30.4 occupation and Career Interest Type files.
-- RIASEC OI values are normalized from O*NET's 1-7 scale to this schema's 0-1 scale.
BEGIN;
INSERT INTO knowledge.knowledge_sources (id, source_key, name, source_type, base_url, publisher, license_ref, trust_level, status, created_at, updated_at)
VALUES ('e4000000-0000-4000-8000-999999999991', 'onet-30-4', 'O*NET 30.4 Database', 'official_download', 'https://www.onetcenter.org/database.html', 'U.S. Department of Labor, Employment and Training Administration', 'CC BY 4.0; attribution required', 'authoritative_external', 'active', '2026-08-05T00:00:00Z', '2026-08-05T00:00:00Z')
ON CONFLICT (source_key) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at;
INSERT INTO knowledge.dataset_versions (id, source_id, dataset_key, version, checksum, record_count, import_status, validation_report_json, imported_at, published_at, created_by)
VALUES ('e4000000-0000-4000-8000-999999999992', 'e4000000-0000-4000-8000-999999999991', 'onet-careers', '30.4', '${checksum}', ${selections.length * 2}, 'published', '{"status":"validated","normalization":"OI divided by 7","ncoMappings":"reviewed exact-title subset only"}'::jsonb, '2026-08-05T00:00:00Z', '2026-08-05T00:00:00Z', NULL)
ON CONFLICT (dataset_key, version) DO UPDATE SET checksum=excluded.checksum, record_count=excluded.record_count, validation_report_json=excluded.validation_report_json;
WITH source_data(id, onet_code, nco_code, slug, title, description, domain_code) AS (VALUES
  ${careerRows.join(",\n  ")}
)
INSERT INTO knowledge.careers (id, onet_code, nco_code, slug, title, short_description, domain_code, primary_education_route_id, is_curated, publication_status, dataset_version_id, published_at, retired_at, created_at, updated_at)
SELECT id, onet_code, nco_code, slug, title, description, domain_code, NULL, false, 'published', 'e4000000-0000-4000-8000-999999999992', '2026-08-05T00:00:00Z', NULL, '2026-08-05T00:00:00Z', '2026-08-05T00:00:00Z' FROM source_data
ON CONFLICT (onet_code) DO UPDATE SET nco_code=excluded.nco_code, title=excluded.title, short_description=excluded.short_description, domain_code=excluded.domain_code, dataset_version_id=excluded.dataset_version_id, publication_status='published', updated_at=excluded.updated_at;
WITH profile_data(onet_code, realistic, investigative, artistic, social, enterprising, conventional, high_point_code) AS (VALUES
  ${profileRows.join(",\n  ")}
)
INSERT INTO knowledge.career_interest_profiles (career_id, realistic, investigative, artistic, social, enterprising, conventional, high_point_code, profile_version, dataset_version_id)
SELECT c.id, p.realistic, p.investigative, p.artistic, p.social, p.enterprising, p.conventional, p.high_point_code, 'onet-30.4-OI-normalized', 'e4000000-0000-4000-8000-999999999992'
FROM profile_data p JOIN knowledge.careers c ON c.onet_code=p.onet_code
ON CONFLICT (career_id) DO UPDATE SET realistic=excluded.realistic, investigative=excluded.investigative, artistic=excluded.artistic, social=excluded.social, enterprising=excluded.enterprising, conventional=excluded.conventional, high_point_code=excluded.high_point_code, profile_version=excluded.profile_version, dataset_version_id=excluded.dataset_version_id;
COMMIT;
`;

const output = resolve("supabase/migrations/20260805000400_onet_30_4_career_domains.sql");
await writeFile(output, sql, "utf8");
console.log(`Generated ${output}: ${selections.length} occupations across ${new Set(selections.map(([, domain]) => domain)).size} domains`);
