-- Schema for the lean portfolio (Neon / Postgres).
-- Run with: npm run db:setup

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN ('web', 'wp', 'ui')),
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_category_sort_idx
  ON projects (category, sort_order);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
