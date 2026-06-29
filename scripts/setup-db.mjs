import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./_env.mjs";

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✗ DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, "..", "schema.sql"), "utf8");

// Strip comment-only lines, then split into individual statements.
const statements = schema
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const sql = neon(connectionString);

// The Neon HTTP driver only accepts tagged-template calls. Wrap a plain SQL
// string in a minimal TemplateStringsArray (no interpolated values) so DDL
// statements from schema.sql can run unchanged.
function runRaw(statement) {
  const strings = Object.assign([statement], { raw: [statement] });
  return sql(strings);
}

try {
  for (const statement of statements) {
    await runRaw(statement);
  }
  console.log(`✓ Schema applied (${statements.length} statements).`);
} catch (err) {
  console.error("✗ Failed to apply schema:", err.message);
  process.exit(1);
}
