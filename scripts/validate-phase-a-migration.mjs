import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260727000100_phase_a_mvp.sql",
);
const sql = await readFile(migrationPath, "utf8");

const tablePrimaryKeyCounts = [
  ...sql.matchAll(/CREATE TABLE\s+"[^"]+"\."[^"]+"\s*\(([\s\S]*?)\);/g),
].map((match) => (match[1].match(/PRIMARY KEY/g) ?? []).length);

const assertions = [
  [
    (sql.match(/^CREATE TABLE/gm) ?? []).length === 69,
    "Migration must create exactly 69 project-owned tables.",
  ],
  [!/^CREATE TABLE "auth"\."users"/m.test(sql), "Migration must not recreate auth.users."],
  [
    !/COMMENT ON (?:TABLE|COLUMN) "auth"\."users"/m.test(sql),
    "Migration must not modify comments on Supabase-managed auth.users.",
  ],
  [sql.includes('REFERENCES "auth"."users"'), "Migration must retain auth.users foreign keys."],
  [!sql.includes("student_profiles"), "Old student_profiles identifier is forbidden."],
  [!sql.includes("student_sessions"), "Old student_sessions identifier is forbidden."],
  [!sql.includes("state_code"), "Old state_code identifier is forbidden."],
  [
    tablePrimaryKeyCounts.every((count) => count <= 1),
    "A table must not contain more than one PRIMARY KEY constraint.",
  ],
];

for (const schema of [
  "assessment",
  "recommendation",
  "knowledge",
  "counselor",
  "safety_private",
  "operations",
]) {
  assertions.push([
    sql.includes(`create schema if not exists ${schema};`),
    `Missing ${schema} schema creation.`,
  ]);
}

const failures = assertions.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  "Phase A migration validation passed: 69 tables and protected Supabase auth.\n",
);
