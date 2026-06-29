export type Category = "web" | "wp" | "ui";

export const CATEGORIES: Category[] = ["web", "wp", "ui"];

/** Raw row shape as stored in the `projects` table. */
export interface ProjectRow {
  id: number;
  category: Category;
  name: string;
  url: string;
  description: string | null;
  sort_order: number | null;
}

/** Client-facing project shape (matches the original vanilla app). */
export interface Project {
  id: number;
  category: Category;
  name: string;
  url: string;
  desc: string;
  sort_order: number;
}

export interface PortfolioData {
  bio: string;
  web: Project[];
  wp: Project[];
  ui: Project[];
}

export const DEFAULT_BIO =
  "A collection of recent projects spanning web development, WordPress builds, and interface design.";

export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    url: row.url,
    desc: row.description ?? "",
    sort_order: row.sort_order ?? 0,
  };
}
