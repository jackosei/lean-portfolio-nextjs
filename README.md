# Jack K. Osei — Portfolio

A small portfolio site built with **Next.js (App Router) + TypeScript**, backed by
**Neon serverless Postgres**. Projects are grouped into Web App, WordPress, and
UI/UX categories with live screenshot previews. Owner-only editing is unlocked
with a 6-digit PIN and protected by a **server-side** session — visitors only ever
see the read-only site.

> Migrated from a single-file vanilla HTML/JS app that used Supabase. The original
> file is kept at [`legacy/index.html`](legacy/index.html) for reference.

---

## Why Neon instead of Supabase?

Supabase's free tier pauses an inactive project after a week, which left the
portfolio showing no data until it was manually resumed. Neon's free tier scales
compute to zero too, but **auto-wakes in under a second on the next request** — it
never pauses the project, so the site never goes stale.

---

## Features

- **Three project categories** — Web App, WordPress, and UI/UX Design
- **Live screenshot previews** — generated via [screenshotone.com](https://screenshotone.com), proxied through `/api/thumb` so the API key stays on the server
- **Server-protected edit mode** — visit `?edit`, enter your PIN, and writes are authorized by an httpOnly session cookie. The anon-key-in-the-browser hole from the old version is gone.
- **Add / edit / delete / drag-to-reorder projects**, plus inline bio editing
- **Light / dark theme** — preference saved to `localStorage`, applied before first paint (no flash)

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Copy the **pooled** connection string from *Connection Details*.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | `openssl rand -hex 32` |
| `EDIT_PIN_HASH` | `npm run pin:hash -- <your-6-digit-pin>` |
| `SCREENSHOTONE_ACCESS_KEY` | your screenshotone key (required for preview thumbnails) |

### 4. Create the tables

```bash
npm run db:setup
```

### 5. (Optional) Migrate your existing Supabase data

If your old Supabase project still has data, pull it into Neon. Make sure the
Supabase project is **resumed** first, then run:

```bash
npm run db:migrate-supabase
```

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local` first (the script
reads them from the environment — no credentials are stored in the code).

### 6. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Editing your portfolio

1. Go to `http://localhost:3000/?edit` (or `https://yoursite.com/?edit` in prod).
2. Enter your 6-digit PIN on the keypad.
3. Edit controls unlock: add / edit / delete projects, drag to reorder, click the
   bio to change it.
4. Click **Exit ✕** to end the editor session.

The PIN is verified on the server against `EDIT_PIN_HASH`; a valid PIN sets a
short-lived (8h) httpOnly session cookie. Every mutation re-checks that cookie, so
the database cannot be written to without it.

---

## Deploying to Vercel

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Add the same env vars (`DATABASE_URL`, `AUTH_SECRET`, `EDIT_PIN_HASH`,
   `SCREENSHOTONE_ACCESS_KEY`) in **Project Settings → Environment Variables**.
3. Deploy. (You can also add Neon directly from the Vercel Marketplace, which sets
   `DATABASE_URL` for you.)

---

## Project structure

```
app/
  layout.tsx          fonts, theme bootstrap, metadata
  page.tsx            server component — loads data from Neon
  actions.ts          server actions (login/logout + CRUD), all auth-gated
  api/thumb/route.ts  screenshot proxy (keeps the API key server-side)
  globals.css         ported styling from the original site
components/
  Portfolio.tsx       client component — all interactivity (edit mode, modals, drag)
lib/
  db.ts               Neon client + typed queries
  auth.ts             PIN check + signed session cookie
  types.ts            shared types
schema.sql            table definitions
scripts/              db setup, Supabase migration, PIN hashing
legacy/index.html     the original single-file app (reference only)
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:setup` | Create the database tables |
| `npm run db:migrate-supabase` | Copy data from the old Supabase project |
| `npm run pin:hash -- <pin>` | Print the `EDIT_PIN_HASH` for a PIN |

---

## License

MIT — feel free to fork and make it your own.
