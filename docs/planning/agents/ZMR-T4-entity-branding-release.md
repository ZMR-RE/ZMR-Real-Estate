# T4 — Entity branding & documents: independent release candidate

**Branch:** `t4/entity-branding`, cut from `main` at `20795b3` in worktree `../ZMR-Real-Estate-T4-branding`.
**Status:** implemented locally; review page available. **Not released, not live, not in Practice.**

## Owner approval

- **Approved:** the four branding decisions — logo, four optional colour roles, issuer/contact details and document defaults.
- **Location:** Settings › Entities › Branding & documents, reachable from the entity profile.
- **Record:** it uses the existing entity record, with no second issuer record.
- **Scope of effect:** workspace theming stays separate.
- **Snapshots:** issued documents keep a snapshot of their branding. Nothing is issued until the invoicing release, which adds that snapshot.

## What's in it (and nothing else)

- **Migration `20261001190000_entity_document_branding.sql`:**
  - `entity_document_branding`: one row per entity, holding
    - colours;
    - reply-to email, phone, website and default payment instructions;
    - paper size and legal-name line;
    - default invoice and receipt notes, and the footer;
    - the current logo and a version number.
  - `entity_logo_versions`: insert-only; one PNG/JPEG per upload, 1 MB or less, with SHA-256.
  - Database contrast rule (4.5:1) for the three text colour roles and for labels on the accent band. Malformed colours are refused.
  - A version check refuses stale saves.
  - Restrictive Storage policies: logo files under `…/entity-branding/…` can't be deleted or overwritten by members.
- **Screen:** `src/modules/entityBranding/`.
  - It adds an "Entities" tab to `Settings.tsx`, deep-linked with `?tab=entities&entity=…`.
  - It adds a link box on `EntityProfile.tsx`.
  - Live sample invoice and receipt, which follow unsaved edits.
  - An optional "Number each field" view, with a field-source list.
- **Owner refinements applied to the document layout:**
  - no reserved space without a logo;
  - billed people with email/phone from their profiles, blanks omitted;
  - payment instructions supplied per document.

## Can it ship without the unfinished invoice migrations? Yes, with these concrete dependencies

1. **No schema dependency on invoicing.**
   - The migration references only `llcs`, `accounts`, `auth.users`, `is_account_member` and `storage.objects`, all already on `main`.
   - Verified: `main`'s 104 migrations plus this one apply to a fresh database, and **19/19 checks pass**.
   - The runner fails on any failed or missing check, and its self-test proves detection.
   - None of `rent_invoicing`'s Stage 1 migrations are on this branch.
2. **Migration order in production (release-owner decision).**
   - The timestamp `20261001190000` sorts **after** T1's and T2's pending, unreleased migrations (`20260929020000`–`20261001130000`).
   - If branding is applied first, those later-applied migrations become "older than the latest applied". Supabase's `db push` then needs `--include-all`, or the release owner applies an explicit manifest (as the Package 1 release did).
   - Either is fine, but it must be a conscious release step. The alternative is re-timestamping this migration just before release to follow whatever has shipped.
3. **Shared files.** One small edit each in `Settings.tsx` (tab plus deep link) and `EntityProfile.tsx` (link box).
   - No other terminal has pending edits to either, as of Sep 30.
   - `Settings.tsx` is on the shared-file caution list, so re-check git status at integration.
4. **Storage policies are additive.** They are restrictive and scoped to `entity-branding` paths, so they don't change any other document's behaviour. A control check confirms ordinary documents stay deletable.
5. **Known limit: not verified on hosted Storage.** The disposable database checks the policy logic, not the Storage API.
   - **Practice check needed:** upload a logo, then try to overwrite and delete it as a member. Both must be refused.
   - This needs T2's Practice window handoff.
6. **Nothing activates invoicing.**
   - No invoice screen, action or migration is included.
   - The payment-instructions field is stored for later invoices. Its help text doesn't mention property overrides, which ship with invoicing.

## Review page (simulated backend)

`npx vite --config vite.entity-branding-review.config.ts` serves http://127.0.0.1:5198/entity-branding-review.html.

- It's the real Settings screen, on the Entities tab, inside the real app frame.
- It runs on fictional entities with an in-memory backend: no database, no network.

## Checks run

- **Disposable Postgres:** 19/19, with the failure-counting runner and self-test.
- **Unit tests:** 96 (colour, contrast, logo fit, documents, the refinements, and mapping).
- **Build and type-check** clean. Lint shows only a data-loading warning of the same kind as existing hooks.
- **Browser, on the review page:**
  - saved logo and settings shown;
  - unreadable colour refused with a warning;
  - live preview of unsaved edits;
  - Save persists;
  - switching to an unbranded entity shows standard colours.
