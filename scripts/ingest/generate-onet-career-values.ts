import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type WorkValue = {
  onetsocCode: string;
  elementName: string;
  scaleId: string;
  dataValue: number;
};

const rawFile = resolve("data/raw/onet/30.0/work-values.txt");
const rawText = await readFile(rawFile, "utf8");
const [, ...dataLines] = rawText.replace(/^\uFEFF/, "").split(/\r?\n/);
const workValues: WorkValue[] = dataLines.filter(Boolean).map((line) => {
  const [onetsocCode, , elementName, scaleId, dataValue] = line.split("\t");
  if (!onetsocCode || !elementName || !scaleId || !dataValue) {
    throw new Error("Invalid O*NET Work Values row");
  }
  return { onetsocCode, elementName, scaleId, dataValue: Number(dataValue) };
});
const names = [
  "Achievement",
  "Independence",
  "Recognition",
  "Relationships",
  "Support",
  "Working Conditions",
] as const;

const careerCodes = [
  "15-2051.00", "15-1252.00", "17-2051.00", "17-2141.00",
  "29-1123.00", "29-2011.00", "25-2021.00", "25-2031.00",
  "13-2011.00", "13-2051.00", "17-2021.00", "19-2041.00",
  "47-2111.00", "51-4121.00", "27-1024.00", "27-3043.00",
  "23-1011.00", "33-2011.00", "19-2031.00", "19-1022.00",
  "13-1081.00", "11-3071.00", "35-1011.00", "11-9081.00",
  "21-1021.00", "21-1012.00", "17-1011.00", "11-9021.00",
  "47-2231.00", "49-9081.00", "49-3023.00", "53-2011.00",
];

const rows: string[] = [];
const reviewed: Array<{ onetCode: string; values: Record<string, number> }> = [];
for (const onetCode of careerCodes) {
  const occupationRows = workValues.filter(
    (row) => row.onetsocCode === onetCode && row.scaleId === "EX",
  );
  const values = names.map((name) =>
    occupationRows.find((row) => row.elementName === name)?.dataValue,
  );
  if (values.some((value) => value === undefined)) {
    console.warn(`Skipping ${onetCode}: incomplete official Work Values profile`);
    continue;
  }
  const normalized = values.map((value) => Number((Number(value) / 7).toFixed(5)));
  reviewed.push({
    onetCode,
    values: Object.fromEntries(names.map((name, index) => [name, normalized[index]!])),
  });
  rows.push(`('${onetCode}', ${normalized.map((value) => value.toFixed(5)).join(", ")})`);
}

if (rows.length === 0) throw new Error("No complete O*NET Work Values profiles found");
const checksum = createHash("sha256").update(rawText).digest("hex");
const sql = `-- Generated from the official O*NET 30.0 Work Values JSON file.
-- O*NET EX values use a 1-7 scale and are normalized to this schema's 0-1 range by dividing by 7.
BEGIN;
WITH value_data(onet_code, achievement, independence, recognition, relationships, support, working_conditions) AS (VALUES
  ${rows.join(",\n  ")}
)
INSERT INTO knowledge.career_value_profiles (
  career_id, achievement, independence, recognition, relationships,
  support, working_conditions, profile_version, dataset_version_id
)
SELECT career.id, values.achievement, values.independence, values.recognition,
  values.relationships, values.support, values.working_conditions,
  'onet-30.0-EX-normalized', career.dataset_version_id
FROM value_data values
JOIN knowledge.careers career ON career.onet_code = values.onet_code
WHERE career.publication_status = 'published'
ON CONFLICT (career_id) DO UPDATE SET
  achievement = EXCLUDED.achievement,
  independence = EXCLUDED.independence,
  recognition = EXCLUDED.recognition,
  relationships = EXCLUDED.relationships,
  support = EXCLUDED.support,
  working_conditions = EXCLUDED.working_conditions,
  profile_version = EXCLUDED.profile_version,
  dataset_version_id = EXCLUDED.dataset_version_id;
COMMIT;
`;

await mkdir(resolve("data/seed/knowledge/career-values/2026-08-07"), { recursive: true });
await writeFile(
  resolve("data/seed/knowledge/career-values/2026-08-07/profiles.json"),
  `${JSON.stringify({ source: "O*NET 30.0 Work Values", checksumSha256: checksum, profiles: reviewed }, null, 2)}\n`,
);
await writeFile(
  resolve("supabase/migrations/20260807000200_onet_30_0_career_value_profiles.sql"),
  sql,
);
console.log(`Generated ${rows.length} career value profiles; source checksum ${checksum}`);
