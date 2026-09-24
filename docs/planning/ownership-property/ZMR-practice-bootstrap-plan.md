# Practice project bootstrap plan — not yet executed

Written while blocked on the cost/access decision (see the terminal report). Nothing in this document has been run. It exists so the moment a practice project is authorized, setup can proceed immediately without re-deriving any of this.

## 0. What "practice" means here

A second, fully separate Supabase project (proposed name **ZMR Practice**), same organization as production only because that's where a project must be created — no data, users, or access is shared between it and the live "ZMR Real Estate" project (`jsrovnaxrtllvvavfqvq`). Real portfolio data stays exactly where it is today; this plan never reads, copies, or references it.

## 1. Why this repo's own Supabase CLI link is never touched

This working directory (`/Users/janki/Projects/ZMR-Real-Estate`) is currently linked to the **live** project (confirmed via `supabase projects list`, one linked project, `jsrovnaxrtllvvavfqvq`). Other terminals are actively working in this same shared directory. Running `supabase link --project-ref <practice-ref>` here would rewrite `supabase/.temp/project-ref` for everyone using this checkout — a real risk to concurrent work, not just a style preference.

Instead, every practice-project database operation uses `supabase db push --db-url "<practice-connection-string>"`, which pushes migrations to an arbitrary Postgres connection string **without** reading or changing the persisted link. This repo's own link to production is never touched by anything in this plan.

## 2. Steps, once a practice project exists

1. From the Supabase dashboard (or `supabase projects create "ZMR Practice" --org-id axoccuzqqmsucjpfqomm --db-password <generated> --region <same as production or owner's choice>` — only after the cost/access decision is made), obtain: project ref, project URL, anon key, service_role key, and the Postgres connection string. None of these are typed into chat — captured directly into local files via masked terminal input (`!` prefix) or copy-paste into a local editor, never displayed in a way this session echoes back.
2. `envs/practice/.env` (git-ignored, copy of `envs/practice/.env.example`):
   ```
   VITE_PRACTICE_TARGET=true
   VITE_SUPABASE_URL=https://<practice-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<practice anon key>
   ```
3. Apply all tracked migrations (currently 97, unmodified, in their original order — this plan never edits or reorders `supabase/migrations/`):
   ```
   supabase db push --db-url "postgresql://postgres:<password>@db.<practice-ref>.supabase.co:5432/postgres" --include-all
   ```
4. **What that push will do that needs handling** — reviewed directly, both migrations use `insert ... where not exists` guards (so re-running is safe) but write real business identifiers into a database meant to hold only fictional data:
   - `20260903192431_seed_zmr_account.sql` creates an `accounts` row named literally **"ZMR Real Estate"** and attempts to link Auth user UID `839171ad-d835-4e00-84c8-773f84889d6d` (the real owner's production Auth identity) as its `owner` member. That UID will not exist in the practice project's own `auth.users` — if `account_members.user_id` has a foreign key to `auth.users`, this insert fails (harmlessly, migration still completes since it's inside a `do $$ ... end $$` block reading `select ... where not exists`, not a hard failure path — confirm this at push time, since a real FK violation inside the block **would** abort the whole `do` block and needs to be seen, not assumed away).
   - `20260904180522_seed_properties.sql` creates two `properties` rows with the real addresses **"5336 W Foster Ave"** and **"2169 Ash St, Des Plaines, IL"**.
   - Neither file is edited — migration history stays identical to production's, which is the entire point of testing against it.
5. **Practice-only cleanup (a new script, never added to `supabase/migrations/`, run once, directly against the practice database only):**
   - Delete the two seeded `properties` rows and the "ZMR Real Estate" `accounts` row (cascades per existing FKs — confirm no orphan rows first with a `select` before any `delete`).
   - Create one disposable Auth user via the practice project's Auth Admin API (`service_role` key, server-side call — e.g. a short local Node/curl script, key never committed) with an obviously fictional address such as `zmr-test-practice@example.test` and a freshly generated password (stored only in a local, git-ignored file).
   - Insert one fresh `accounts` row named **"ZMR-TEST-PRACTICE Holdings"** and an `account_members` row linking it to that new Auth user as `owner`.
   - Re-query both the deleted and newly-created rows afterward and record the exact result (per this project's own Cleanup self-verification convention) before treating this step as done.
6. Configure Storage/Auth/RLS as needed (should already be correct from the pushed migrations — verify, don't assume) and inspect the practice bucket's actual configured upload limit (Storage → bucket settings, read-only) — record it as a **practice** limit explicitly, never presented as proof of the production limit.
7. Keep all outbound integrations (email, webhooks, scheduled jobs, bots) disabled in practice — confirm none of the 97 migrations enable any (a targeted grep, not an assumption) before relying on that.
8. `npm run dev:practice` (port 5190, `envs/practice/.env`, the real `AppShell`/routes/styles) — sign in as the new disposable practice user, and proceed with the checklist in the terminal report.

## 3. What this plan deliberately does not do

- Does not touch port 5173 or its `.env`.
- Does not modify `supabase/migrations/` (no rewritten history, no skipped files).
- Does not install Docker/Colima or any local stack (that remains the separately-documented Option 1 in `O1-A-implementation-contract.md` §9.5, not chosen here).
- Does not enter a password or payment detail into chat, and does not upgrade the organization's plan.
