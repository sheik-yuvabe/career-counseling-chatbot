import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type SkillRow = {
  onetsoc_code: string;
  element_name: string;
  scale_id: string;
  data_value: number;
  recommend_suppress: string | null;
  not_relevant: string | null;
  date_updated: string;
};

const careerCodes = [
  "15-2051.00", "15-1252.00", "17-2051.00", "17-2141.00",
  "29-1123.00", "29-2011.00", "25-2021.00", "25-2031.00",
  "13-2011.00", "13-2051.00", "17-2021.00", "19-2041.00",
  "47-2111.00", "51-4121.00", "27-1024.00", "27-3043.00",
  "23-1011.00", "33-2011.00", "19-2031.00", "19-1022.00",
  "13-1081.00", "11-3071.00", "35-1011.00", "11-9081.00",
  "21-1021.00", "21-1012.00", "17-1011.00", "11-9021.00",
  "47-2231.00", "49-9081.00", "49-3023.00", "53-2011.00",
] as const;

const rawPath = resolve("data/raw/onet/30.3/essential_skills.json");
const raw = JSON.parse(await readFile(rawPath, "utf8")) as { row: SkillRow[] };

const profiles = careerCodes.flatMap((onetCode) => {
  const rows = raw.row
    .filter((row) =>
      row.onetsoc_code === onetCode &&
      row.scale_id === "IM" &&
      row.recommend_suppress !== "Y" &&
      row.not_relevant !== "Y"
    )
    .sort((left, right) =>
      right.data_value - left.data_value ||
      left.element_name.localeCompare(right.element_name)
    );

  const skills = [...new Set(rows.map((row) => row.element_name))].slice(0, 5);
  if (skills.length === 0) {
    console.warn(`Skipping ${onetCode}: O*NET 30.3 has no exact Essential Skills rows`);
    return [];
  }
  if (skills.length !== 5) {
    throw new Error(`Expected five unsuppressed skills for ${onetCode}; found ${skills.length}`);
  }

  return [{
    onetCode,
    skills,
    sourceUpdatedAt: rows[0]?.date_updated ?? null,
  }];
});

if (profiles.length !== 30) {
  throw new Error(`Expected 30 exact-code profiles; found ${profiles.length}`);
}

const artifact = `${JSON.stringify({
  datasetKey: "onet-career-profiles-skills",
  version: "30.3-reviewed-2026-08-06",
  selectionRule: "Top five unsuppressed O*NET Essential Skills Importance ratings",
  profiles,
}, null, 2)}\n`;
const seedDirectory = resolve("data/seed/knowledge/career-profiles/2026-08-06");
await mkdir(seedDirectory, { recursive: true });
await writeFile(resolve(seedDirectory, "profiles.json"), artifact, "utf8");
const checksum = createHash("sha256").update(artifact).digest("hex");

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const values = profiles.map((profile) =>
  `(${quote(profile.onetCode)}, ARRAY[${profile.skills.map(quote).join(", ")}]::text[])`
);

const sql = `-- Generated from official O*NET 30.3 Essential Skills JSON.
-- Salary, image and progression fields remain NULL because this source does not support them.
BEGIN;

INSERT INTO knowledge.knowledge_sources (
  id, source_key, name, source_type, base_url, publisher, license_ref,
  trust_level, status, created_at, updated_at
) VALUES (
  'e6000000-0000-4000-8000-999999999991',
  'onet-30-3-essential-skills',
  'O*NET 30.3 Essential Skills',
  'official_download',
  'https://www.onetcenter.org/database.html',
  'U.S. Department of Labor, Employment and Training Administration',
  'CC BY 4.0; attribution required',
  'authoritative_external',
  'active',
  '2026-08-06T00:00:00Z',
  '2026-08-06T00:00:00Z'
)
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  license_ref = EXCLUDED.license_ref,
  updated_at = EXCLUDED.updated_at;

INSERT INTO knowledge.dataset_versions (
  id, source_id, dataset_key, version, checksum, record_count, import_status,
  validation_report_json, imported_at, published_at, created_by
) VALUES (
  'e6000000-0000-4000-8000-999999999992',
  'e6000000-0000-4000-8000-999999999991',
  'onet-career-profiles-skills',
  '30.3-reviewed-2026-08-06',
  '${checksum}',
  30,
  'published',
  '{"status":"approved","profiles":30,"skillsPerProfile":5,"selection":"top unsuppressed importance ratings","unavailableExactCodes":["15-2051.00","13-2051.00"],"unsupportedFields":"salary,image,progression remain null"}'::jsonb,
  '2026-08-06T00:00:00Z',
  '2026-08-06T00:00:00Z',
  NULL
)
ON CONFLICT (dataset_key, version) DO UPDATE SET
  checksum = EXCLUDED.checksum,
  record_count = EXCLUDED.record_count,
  validation_report_json = EXCLUDED.validation_report_json;

WITH profile_data(onet_code, skills) AS (VALUES
  ${values.join(",\n  ")}
)
INSERT INTO knowledge.career_profiles (
  career_id, image_ref, salary_entry_band, salary_note, skills,
  next_role_3yr, progression_note, review_status, last_reviewed_at, reviewed_by
)
SELECT career.id, NULL, NULL, NULL, profile_data.skills,
       NULL, NULL, 'reviewed', '2026-08-06T00:00:00Z', NULL
FROM profile_data
JOIN knowledge.careers career ON career.onet_code = profile_data.onet_code
ON CONFLICT (career_id) DO UPDATE SET
  image_ref = EXCLUDED.image_ref,
  salary_entry_band = EXCLUDED.salary_entry_band,
  salary_note = EXCLUDED.salary_note,
  skills = EXCLUDED.skills,
  next_role_3yr = EXCLUDED.next_role_3yr,
  progression_note = EXCLUDED.progression_note,
  review_status = EXCLUDED.review_status,
  last_reviewed_at = EXCLUDED.last_reviewed_at,
  reviewed_by = EXCLUDED.reviewed_by;

COMMIT;
`;

const migrationPath = resolve(
  "supabase/migrations/20260806000200_onet_30_3_career_profiles.sql",
);
await writeFile(migrationPath, sql, "utf8");
console.log(`Generated 30 exact-code career profiles with checksum ${checksum}`);
