import { createRequire } from "node:module";

const require = createRequire(new URL("../packages/database/package.json", import.meta.url));
const pg = require("pg");

const schemas = [
  "assessment",
  "knowledge",
  "recommendation",
  "counselor",
  "safety_private",
  "operations",
];

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

try {
  await client.connect();
  const result = await client.query(
    `select table_schema, table_name
       from information_schema.tables
      where table_type = 'BASE TABLE'
        and table_schema = any($1)
      order by table_schema, table_name`,
    [schemas],
  );

  console.log(`tables_found=${result.rows.length}`);
  for (const { table_schema: schema, table_name: table } of result.rows) {
    const identifier = `"${schema}"."${table}"`;
    const count = await client.query(`select count(*)::int as count from ${identifier}`);
    console.log(`${schema}.${table}=${count.rows[0].count}`);
  }
} finally {
  await client.end();
}
