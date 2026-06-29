import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  type Category,
  type PortfolioData,
  type Project,
  type ProjectRow,
  DEFAULT_BIO,
  rowToProject,
} from "./types";

// Lazily create the Neon client so that `next build` (which may run without a
// DATABASE_URL present) doesn't crash at import time. The client is only
// instantiated the first time a query actually runs.
let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env.local (see .env.example).",
    );
  }
  _sql = neon(connectionString);
  return _sql;
}

/** Loads all projects + the bio in a single round trip. */
export async function getPortfolioData(): Promise<PortfolioData> {
  const sql = getSql();
  const [projectRows, settingRows] = await Promise.all([
    sql`
      SELECT id, category, name, url, description, sort_order
      FROM projects
      ORDER BY sort_order ASC NULLS LAST, id ASC
    ` as unknown as Promise<ProjectRow[]>,
    sql`SELECT key, value FROM settings WHERE key = 'bio'` as unknown as Promise<
      { key: string; value: string | null }[]
    >,
  ]);

  const projects = projectRows.map(rowToProject);
  const bioRow = settingRows.find((s) => s.key === "bio");

  return {
    bio: bioRow?.value?.trim() || DEFAULT_BIO,
    web: projects.filter((p) => p.category === "web"),
    wp: projects.filter((p) => p.category === "wp"),
    ui: projects.filter((p) => p.category === "ui"),
  };
}

export async function insertProject(input: {
  category: Category;
  name: string;
  url: string;
  description: string;
  sortOrder: number;
}): Promise<Project> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO projects (category, name, url, description, sort_order)
    VALUES (${input.category}, ${input.name}, ${input.url}, ${input.description}, ${input.sortOrder})
    RETURNING id, category, name, url, description, sort_order
  `) as unknown as ProjectRow[];
  return rowToProject(rows[0]);
}

export async function updateProjectRow(input: {
  id: number;
  name: string;
  url: string;
  description: string;
}): Promise<Project | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE projects
    SET name = ${input.name}, url = ${input.url}, description = ${input.description}
    WHERE id = ${input.id}
    RETURNING id, category, name, url, description, sort_order
  `) as unknown as ProjectRow[];
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function deleteProjectRow(id: number): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM projects WHERE id = ${id}`;
}

/** Persists a new ordering for a category: ids are written in the given order. */
export async function persistOrder(ids: number[]): Promise<void> {
  const sql = getSql();
  await Promise.all(
    ids.map(
      (id, index) => sql`UPDATE projects SET sort_order = ${index} WHERE id = ${id}`,
    ),
  );
}

export async function upsertBio(value: string): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO settings (key, value)
    VALUES ('bio', ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}
