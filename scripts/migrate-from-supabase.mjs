import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./_env.mjs";

loadEnv();

// These default to the values that were embedded in the original index.html.
// Override them in .env.local if your Supabase project differs.
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://REDACTED.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "REDACTED";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✗ DATABASE_URL is not set. Run `npm run db:setup` first.");
  process.exit(1);
}

async function fetchTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(
      `Supabase returned ${res.status} for ${table}. ` +
        "If the project is paused, resume it in the Supabase dashboard and retry.",
    );
  }
  return res.json();
}

const sql = neon(connectionString);

try {
  console.log("→ Fetching from Supabase…");
  const [projects, settings] = await Promise.all([
    fetchTable("projects"),
    fetchTable("settings"),
  ]);

  console.log(
    `→ Found ${projects.length} project(s) and ${settings.length} setting(s).`,
  );

  for (const p of projects) {
    await sql`
      INSERT INTO projects (id, category, name, url, description, sort_order)
      VALUES (${p.id}, ${p.category}, ${p.name}, ${p.url}, ${p.description ?? null}, ${p.sort_order ?? null})
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        name = EXCLUDED.name,
        url = EXCLUDED.url,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order
    `;
  }

  for (const s of settings) {
    await sql`
      INSERT INTO settings (key, value)
      VALUES (${s.key}, ${s.value ?? null})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
  }

  // Keep the SERIAL sequence ahead of the imported ids so new inserts don't collide.
  await sql`
    SELECT setval(
      pg_get_serial_sequence('projects', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 0) FROM projects), 1)
    )
  `;

  console.log("✓ Migration complete.");
} catch (err) {
  console.error("✗ Migration failed:", err.message);
  process.exit(1);
}
