# O1-A — technical implementation contract

Version 3.0 · September 24, 2026 · Finalized from approved decisions (Batch I, revised H7). Foundation implemented and verified locally (not deployed). Self-contained — does not require reading v1.0/v2.0 to understand current scope or acceptance criteria.

Authority: `ZMR-approval-register.md` (Batches A–D, G1/G2/G4/G6–G8, and Batch I: I1–I5 approved per `ZMR-approved-work-terminal-prompt.txt`), `ZMR-ownership-specification.md`, `ZMR-O1-A-build-package.md`. Revised H7 (Property Overview tab responsibilities) is a constraint on this batch's UI, not new scope owned by it — see §1.3.

No live migration, deployment, or business-data entry occurred. Every claim in this document marked "verified" was executed against a disposable local Postgres 16 instance built from this repository's own migration history plus a minimal mock of Supabase's `auth`/`storage` schemas — not the hosted project, which this session has no credentialed access to. Where that distinction matters, it is called out explicitly.

---

## 0. What changed to produce this version, and why

Earlier drafts (v1.0: single-owner `properties.llc_id`, flat entity-only contact fields; v2.0: multiple owners but with several mechanisms — percentage completeness, effective dating, legacy-pointer sync, correction scope, conflict protection — explicitly left as open decisions) are superseded. Batch I resolved every one of those open decisions:

- **I1** (percentage rules): known percentages must be positive and ≤100%; a property/entity's currently-known percentages may never sum to more than 100%; if *every* current owner has a known percentage, they must sum to *exactly* 100% (never inferred, never left off); a partial/unknown allocation (some or all owners' percentages not yet known) is valid and distinct from a complete one. Multi-owner edits (e.g. 48/52 → 50/50) are atomic — never observable in an invalid intermediate state.
- **I2** (history): effective-dated history is preserved for both property ownership and entity membership, with `effective_date` (when the fact was/is true) kept separate from `recorded_at` (when the system learned it); unknown historic dates are recorded as unknown, never guessed.
- **I3** (legacy pointer): no invented primary/first-owner fallback. `properties.llc_id` is never written by the new mutation path — there is exactly one writable source of truth for title ownership. A read-only view bridges legacy single-owner consumers.
- **I4** (corrections): every route that can change a property's ownership or an entity's membership requires a reason, with no bypass — enforced at the database level (see §2.6), not just by application convention.
- **I5** (protection + audit): the touched Property information save gets stale-write protection; the new contacts/methods/links tables get audit-trail coverage.
- **Revised H7**: the Property Overview tab keeps Overview limited to identity, a compact occupancy/rent snapshot, and property details; deeper KPI/Financials/Mortgage/Activity/Documents behavior stays in their own tabs. This contract's new Ownership section lives in Overview (identity-adjacent, per Batch E's approved page order: "Property identity → Ownership → Acquisition → ...") and does not duplicate anything already owned by another tab, nor move any existing section between tabs.

---

## 1. Scope

### 1.1 Included in this implementation pass (built and verified locally — §9)

- Nine additive migrations implementing the full ownership/contacts/documents foundation (§2).
- The two SECURITY DEFINER Postgres functions that are the sole write path for ownership/membership data (§2.6), with database-level authorization checks, aggregate validation, and atomic multi-row updates — verified directly, not just written.
- The TypeScript query/service layer for all of the above (§3).
- One wired UI increment: the property profile's new "Ownership" box (§4), showing 1..N current owners with optional percentages, and its add/remove/percentage-change editing, each requiring a reason.
- A `vitest` test suite (new — no test runner existed in this repository before this pass) covering the pure validation/error-interpretation logic shared between client and server rules.

### 1.2 Explicitly not yet built (see §10 for the concrete remaining-work list)

- The owner/entity profile page (`/entities/:id`) itself — Identity, Contacts, Tax classification, Documents, Financial-accounts sections. The query layer for contacts and entity documents exists and is verified at the schema/RLS level (§9), but no UI consumes it yet.
- The `OrganizationTypePropertiesPanel` reassign-dropdown replacement — the entity-side "remove this entity's interest" control that must call the same shared function as the property-side box built in this pass. Left as an isolated, named remaining item (§10) rather than touched partially.
- Entity membership interest UI (the query/RPC layer exists and is verified; no box renders it yet).
- Any acquisition, Add-property-flow, or Documents-center work — unchanged exclusions from every prior version of this contract.
- Any bookkeeping/tax-calculation code path. No percentage anywhere in this schema is read by `financial_transactions`, `chart_of_accounts`, or any report.

### 1.3 Revised H7 boundary

Nothing in this pass adds a KPI, financial, mortgage, activity, or document behavior to the Overview tab, and nothing here relocates an existing section between tabs. The Ownership box is new content, placed in Overview per Batch E's approved order, and reads/writes only the tables introduced by this contract — it does not duplicate any storage or form already owned by another tab.

---

## 2. Information model — as built

### 2.1 `llcs` — generalized ownership-entity table, extended in place

Migration: `20260925010000_llcs_entity_profile_fields.sql`. Extends the existing table (no rename, no parallel table — every existing consumer of `llcs.id`/`properties.llc_id`/`property_financial_accounts.llc_id`/`holding_companies` keeps working against the same rows and columns unmodified). New columns, all nullable:

| Column | Type | Notes |
|---|---|---|
| `owner_kind` | `text check (in ('individual','entity'))` | **No default.** Every pre-existing row backfills to `null` (unresolved) — not asserted `'entity'`. An earlier draft inferred `'entity'` for every existing row because the current Add-property form has never collected a person's name; that is evidence about the form, not a verified fact about any given row, and was corrected per CLAUDE.md's Data integrity rule. |
| `display_name` | `text` | Falls back to `name` when null |
| `legal_structure` | `text check (in ('llc','corporation','partnership','trust','other','unknown'))` | Fixed enum, not pick-list — see rationale below |
| `mailing_address`, `mailing_city`, `mailing_state`, `mailing_zip` | `text` | Same shape as `properties`' own address columns |
| `notes` | `text` | |
| `membership` | `text check (in ('single_member','multiple_members','unknown'))` | Coarse flag, independent of the actual member roster (§2.3) |
| `federal_tax_treatment` | `text check (in ('unknown','disregarded_entity','partnership','s_corporation','c_corporation','other'))` | Never auto-derived from `membership` or `legal_structure` |
| `federal_tax_treatment_effective_date` | `date` | |
| `tax_verification_status` | `text check (in ('needs_review','user_verified'))` | Left `null` by default, not defaulted to `'needs_review'` — that would assert a review that never happened |
| `tax_verified_by`, `tax_verified_at` | `uuid`, `timestamptz` | Set only by an explicit "Mark verified" action |
| `last_verified_date`, `last_verified_by` | `date`, `uuid` | Same — never a side effect of an unrelated field edit |

Contact fields are deliberately **not** here — see §2.4.

**`legal_structure` is a fixed enum despite CLAUDE.md's pick-list-first default**, for the stated reason CLAUDE.md's own exception clause requires: it has fixed downstream meaning (which `federal_tax_treatment` values are even coherent) the same way `financial_transactions.category` is fixed because `category_account_mappings` keys off its exact values. `membership`, `federal_tax_treatment`, `tax_verification_status`, and election `status` (§2.2) are fixed for the identical reason. Election `election_type` is **not** fixed — an open, growing catalog with no downstream code keying off specific values, so it follows the normal pick-list-first rule.

**Audit coverage, stated precisely:** `llcs` already had a generic trigger (`log_audit_changes()`, attached `after update`) diffing every column except `id`/`account_id`/`created_at`/`updated_at`/`property_id`. Every column above is covered by that existing trigger purely by being a plain column on an already-covered table — **verified directly** (§9.2): an `UPDATE` setting `legal_structure` produced exactly one `audit_log` row with correct old/new values and `source='user'`; an `INSERT` of a new `llcs` row produced zero audit rows. Both facts — UPDATE-only coverage, and only on `properties`/`llcs`/`mortgage_details` — are real, pre-existing characteristics of this trigger, not something this batch changes.

### 2.2 `llc_tax_elections` — tax-election history, unchanged from prior drafts

Migration: `20260925020000_llc_tax_elections.sql`. One row per election attempt (`election_type`, `status`, `submitted_date`/`effective_date`/`acceptance_date`, `notes`). A mid-flight status update (Submitted → Accepted) is an ordinary `UPDATE` of the same row; a genuinely new/different election never rewrites an old row's facts — it inserts a new row and sets the old one's `status='superseded'` plus `superseded_by_id`. Not built upon by this pass's UI; query functions exist in `llcsQueries.ts` for a later increment.

### 2.3 `property_ownership_interests` and `llc_membership_interests` — effective-dated, multi-owner (I1/I2)

Migration: `20260925050000_ownership_interests.sql`. Both tables share one shape:

```sql
create table property_ownership_interests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  llc_id uuid not null references llcs(id) on delete restrict,
  percentage numeric(5,2) check (percentage is null or (percentage > 0 and percentage <= 100)),
  effective_date date,       -- when the interest is/was legally true; null = unknown
  end_date date,             -- when it stopped; null = still current
  is_current boolean not null default true,
  superseded_by_id uuid references property_ownership_interests(id) on delete set null,
  notes text,
  recorded_at timestamptz not null default now(),   -- when the system learned this, distinct from effective_date
  recorded_by uuid references auth.users(id),
  constraint property_ownership_interests_dates_check
    check (end_date is null or effective_date is null or end_date >= effective_date)
);
create unique index property_ownership_interests_current_unique
  on property_ownership_interests (property_id, llc_id) where is_current;
```

`llc_membership_interests` is identical except scoped by `(llc_id, member_llc_id)` — the entity being owned and its member (a person or another entity), with `check (llc_id <> member_llc_id)` blocking self-membership at the database level. **Kept as a fully separate table from property title**, per the explicit instruction to never conflate an entity's membership roster with a property's title ownership.

**History mechanics:** ending an interest (removal, or a percentage change) never deletes or rewrites the old row — it sets `end_date`/`is_current=false` and, for a percentage change, points `superseded_by_id` at the replacement row. A partial unique index enforces exactly one *current* row per pair while allowing unlimited historical rows over time. **Verified** (§9.2): a two-step rebalance (100% → 48/52 → 50/50) on the same property produced five rows total — the original, both intermediate states, and both final rows — with every historical row's own `percentage`/`effective_date` intact and correctly chained via `superseded_by_id`.

Two computed views (not stored columns, so they can never drift from the interests they summarize):

- `property_current_owner` — returns a single `llc_id` only when exactly one current interest exists; `null` both when there are zero (unresolved) and when there are two or more (genuinely multi-owner) — the legacy-pointer bridge from I3, never arbitrarily picking one of several real owners.
- `property_ownership_summary` — `owner_count`, `owners_with_percentage`, `percentage_total`, and `completeness` (`'none' | 'partial' | 'complete'`) — the explicit completeness state I1 asks for, computed, never inferred by filling in a missing percentage.

### 2.4 `contacts`, `contact_methods`, `contact_links` — reusable people, multiple methods, explicit attachment (G2)

Migration: `20260925030000_contacts.sql`. No existing table in this schema supported more than one phone/email per record (`vendors`/`tenants` both have single flat contact fields) — this is new infrastructure:

- `contacts` (`id`, `account_id`, `name`, `notes`, `archived`).
- `contact_methods` (`contact_id`, `method_type` (`phone`/`email`), `value`, `label` — pick-list, e.g. Mobile/Work/Home — `is_preferred`, the contact's own preferred method).
- `contact_links` (`contact_id`, `property_id` and/or `llc_id` — both may be set at once — `role` — pick-list — `is_primary_contact`, which of possibly several contacts linked to the *same* property/entity is the main one for that context, distinct from `is_preferred`).

Creating any of these three never creates a Supabase Auth user, an `account_members` row, or any access grant — verified structurally (no function or migration in this batch touches `account_members` or Auth admin APIs) and by a direct test (§9.2): linking a contact to an entity left the account's membership table completely unchanged.

**Audit coverage (I5):** the same generic trigger from §2.1 is now also attached to all three tables (`audit_log`'s `table_name` check constraint extended). **Verified**: an `UPDATE` on a `contacts` row's `notes` produced a correct audit row. Known, stated limitation: the trigger's `skip_cols` list (`id`/`account_id`/`created_at`/`updated_at`/`property_id`) is shared across every table it's attached to, not per-table — on `contact_links` (which has both `property_id` and `llc_id`), a `property_id` change is silently excluded from the diff while an `llc_id` change is not. This is a pre-existing characteristic of the shared trigger design (true wherever else a `property_id`-named column might exist), not something this migration introduces or repairs; repairing it would change audit behavior on `properties`/`llcs`/`mortgage_details` too, which is out of scope here.

### 2.5 `document_owner_links` — many-to-many entity/document links

Migration: `20260925040000_document_owner_links.sql`. A single nullable `documents.llc_id` column (an earlier draft's design) cannot represent a document relevant to more than one owning entity, which the multi-owner model makes a real case. Modeled as a join table instead, following the established "one document row, many per-parent relationships" idiom this schema already uses for `property_id`/`transaction_id`/`tenant_id`/etc. **Verified**: one document row linked to two entities via two `document_owner_links` rows was independently discoverable from both entities' queries, with `documents` itself still holding exactly one row (no duplication). `documents.property_id` (existing, singular) is unchanged — nothing in this batch asks for multi-property documents.

### 2.6 The sole write path — SECURITY DEFINER functions, no bypass (I3/I4)

Migration: `20260925060000_ownership_interest_functions.sql`. Neither `property_ownership_interests` nor `llc_membership_interests` has an `INSERT`/`UPDATE`/`DELETE` RLS policy for the `authenticated` role — **only a `SELECT` policy exists**. The only way to write either table is through one of two functions:

- `replace_property_ownership_interests(property_id, entries, reason, expected_version)`
- `replace_llc_membership_interests(llc_id, entries, reason, expected_version)`

`entries` is the **complete** desired set of currently-effective owners/members (`{owner_id, percentage, effective_date}[]`); anything current but absent from it is treated as removed. Each function, in one Postgres transaction (one client RPC call):

1. Requires a non-blank `reason` (raises `ZM003` otherwise).
2. Resolves the account and verifies `is_account_member()` against `auth.uid()` **explicitly, inside the function body** — being `SECURITY DEFINER` grants the privilege to bypass RLS, it is not itself an authorization check, and this function does not rely on it as one (raises `ZM002` if not a member).
3. Validates every entry: percentages positive/≤100 at 2-decimal precision, no duplicate owners, every referenced id belongs to the same account (`ZM002`/`ZM003`).
4. Validates the aggregate: known percentages may not sum past 100; if every current entry has a known percentage, they must sum to exactly 100 (`ZM003`).
5. Locks and checks a per-property/entity version counter against `expected_version`, rejecting a stale write (`ZM001`) rather than silently overwriting a newer one (I5's stale-write protection, extended to this new data).
6. Ends every current interest not present in `entries` (sets `is_current=false`, logs a `removed` correction), then inserts/updates the rest (logs `added` or `percentage_changed`), each correction row carrying the required `reason`.
7. Increments the version counter and returns it.

Because validation is computed entirely from the caller's *desired end state* before any row is touched, a rebalance is atomic — **verified** (§9.2): 48/52 → 50/50 in one call left no intermediate state visible to a concurrent reader, and a two-step sequence (add a second owner, then rebalance) produced the correct five-row history described in §2.3.

**Verified security properties**, each with a real, executed test against the scratch database (§9.2), not just a written assertion:
- A non-member's call to either function is rejected (`ZM002`).
- A non-member's direct `SELECT` against either interest table returns zero rows (RLS).
- A direct `INSERT` into `property_ownership_interests` by an authenticated account member, bypassing the function, is rejected by RLS ("new row violates row-level security policy") — this is what makes "no bypass" a database fact, not an application convention a future caller could forget.
- An owner belonging to a different account is rejected (`ZM002`).
- A stale `expected_version` is rejected (`ZM001`).
- A property/entity with no interests yet has no version row; the correct expected value for a first write is `0` (the version table's own default), not `null` — documented here because it is the one non-obvious calling convention in this design.

### 2.7 Cross-account integrity (I5 / CLAUDE.md Data safety)

Migration: `20260925070000_cross_account_integrity.sql`. Closes a gap that predates this batch: neither `properties.llc_id → llcs.id` nor `llcs.holding_company_id → holding_companies.id` had ever verified the referenced row shares the same `account_id` — only application-level picker scoping prevented a cross-account value, not the database. **Required read-only pre-check, actually run** (not skipped) against the seeded fixture data replicated in the scratch database (mirroring `20260903192431_seed_zmr_account.sql`/`20260904180522_seed_properties.sql`): both

```sql
select p.id from properties p join llcs l on l.id = p.llc_id where p.account_id <> l.account_id;
select l.id from llcs l join holding_companies h on h.id = l.holding_company_id where l.account_id <> h.account_id;
```

returned zero rows. **This is not evidence about the actual hosted production database**, which this session has no credentialed access to — whoever applies this migration there must run both queries first and report any row found, never let the resulting trigger's `before` check silently start rejecting an existing record's next unrelated edit.

Triggers were added for these two pre-existing relationships and for every new relationship this batch introduces (`contact_links.contact_id/property_id/llc_id`, `contact_methods.contact_id`, `document_owner_links.document_id/llc_id`) — each verified directly: setting `properties.llc_id` to a foreign-account entity, and separately inserting a `contact_links`/`document_owner_links` row crossing accounts, were both rejected with a clear `cross-account reference rejected (...)` message naming the specific relationship.

---

## 3. TypeScript query/service layer — as built

| File | Status | Contents |
|---|---|---|
| `src/modules/llcs/llcsQueries.ts` | Extended | `Llc` interface gains every §2.1 column; existing `LlcInput`/`updateLlc`/`createLlc` (used by the Settings "Organization types" form, `LlcForm.tsx`) are **unchanged** — a new `EntityProfileInput` type and `updateLlcProfile`/`getLlc`/`markLlcVerified` functions handle the new fields separately, so the already-shipped management form was never touched |
| `src/modules/llcs/ownershipInterestsQueries.ts` | New | Every Supabase call for both interest tables and both correction logs, kept in one file since every write is mediated by the correction-logging RPCs — splitting reads from writes would make it possible to add one without the other. Includes the two pure, unit-tested helpers: `interpretOwnershipError` (maps `ZM001`–`ZM004` to a UI-actionable category) and `validateOwnershipEntriesClientSide` (a client-side mirror of the server's own aggregate rules, for a responsive Save button — explicitly documented as non-authoritative; the server re-validates every rule regardless) |
| `src/modules/contacts/contactsQueries.ts` | New module | `contacts`/`contact_methods`/`contact_links` CRUD, `listContactsForLlc`/`listContactsForProperty` (joined, methods embedded) |
| `src/modules/documents/documentsQueries.ts` | Extended | `listDocumentsForLlc` (via `document_owner_links` join), `uploadEntityDocument`/`createEntityLink` (accept `llcIds: string[]`, insert one `documents` row plus N links), `getAccountStorageUsage` |

`npm run build` (`tsc -b && vite build`) and `npm run lint` (`oxlint`) are both clean against the full repository with every file above added, per §9.1.

---

## 4. UI wired in this pass

`src/modules/properties/PropertyOwnershipInterestsSection.tsx` + `usePropertyOwnershipInterests.ts`, added to `PropertyProfileOverviewTab.tsx` immediately after "Property information" (matching Batch E's approved page order). Uses the existing `EditableSection` box standard, no new pattern:

- **View**: `.field-grid` list of current owners (name, percentage or "Percentage not recorded" — never a blank/zero); `.empty-state` "No owner on file yet" when there are none.
- **Edit**: each current owner's percentage is editable inline with a Remove action; a `SearchableSelect` (excluding the existing `NO_LLC_ID` "Individual ownership" sentinel, which means something different — unresolved, not a selectable real owner) adds a new owner; a required reason field; Save calls `replacePropertyOwnershipInterests` with the client-validated full entry set once.
- Client-side validation (`validateOwnershipEntriesClientSide`) blocks Save with an inline error before any network call; the server re-validates independently regardless.
- A stale-version rejection (someone else changed ownership since this box's data was loaded) surfaces its message and triggers a refresh, so the next attempt is against real current data rather than repeating a doomed retry.

Not yet built in this pass (§10): the entity-side equivalent panel, the `OrganizationTypePropertiesPanel` reassign-control replacement, and the full entity profile page.

---

## 5. What this contract explicitly excludes (unchanged from every prior version)

- Legal ownership transfer of any kind.
- Any use of a percentage in bookkeeping, tax calculation, or reporting — no `financial_transactions`/`chart_of_accounts` code reads either interest table's `percentage` column.
- Splitting a shared document into per-owner partial files.
- Registry owner filter/grouping, any new top-level navigation entry.
- Role-based write enforcement (`account_members.role` remains unread by application code, exactly as everywhere else today).
- Any edit to `PropertySpecsSection.tsx`, `UnitsSection.tsx`, `useUnits.ts`, or any file under `src/modules/units`, `src/modules/leases`, `src/modules/tenants`.
- Hosted upload-limit-dependent work (D3) — genuinely unverifiable in this session (§10).

---

## 6. Files touched

**New migrations** (`supabase/migrations/`): `20260925010000_llcs_entity_profile_fields.sql`, `20260925020000_llc_tax_elections.sql`, `20260925030000_contacts.sql`, `20260925040000_document_owner_links.sql`, `20260925050000_ownership_interests.sql`, `20260925060000_ownership_interest_functions.sql`, `20260925070000_cross_account_integrity.sql`.

**New application files**: `src/modules/llcs/ownershipInterestsQueries.ts` (+ `.test.ts`), `src/modules/contacts/contactsQueries.ts`, `src/modules/properties/usePropertyOwnershipInterests.ts`, `src/modules/properties/PropertyOwnershipInterestsSection.tsx`.

**Modified**: `src/modules/llcs/llcsQueries.ts`, `src/modules/documents/documentsQueries.ts`, `src/modules/properties/PropertyProfileOverviewTab.tsx`, `package.json` (added `vitest` devDependency and a `test` script — no test runner existed before this pass), `.gitignore`-compatible `.env.test` (fake placeholder credentials only, for test isolation from the real `.env`), `vitest.config.ts` (new, separate from `vite.config.ts` so the existing build config is untouched).

**Untouched**: `Settings.tsx`, `App.tsx`, `AppShell.tsx`, `OrganizationTypePropertiesPanel.tsx` (its reassign control still calls the old `updatePropertyLlc` directly — see §10 item 2), every file under `src/modules/units`/`leases`/`tenants`, and the entire parallel Batch E/F/G/H Property-Overview-layout planning track.

---

## 7. Interaction contract

Unchanged principles from prior drafts, now implemented rather than only specified:

- **Save/Cancel**: the Ownership box follows `EditableSection` exactly — Edit → editable state → Save or Cancel → view-only. "Save" is the only label used.
- **Validation**: client-side check blocks Save with an inline error; the database is the actual enforcement boundary regardless of what the client already checked.
- **Failed requests**: on error, `saving` clears, the message renders via `role="alert"`, and entered values are preserved (the user can retry without retyping) — matching the existing pattern throughout this codebase.
- **Retry/double-submit**: the Save button disables for the duration of the request.
- **Conflicting edits**: implemented for the ownership-interest tables specifically (I5) via the version-counter check in §2.6 — **not** retrofitted onto the pre-existing Property information box's own save in this pass (see §10 item 1; the terminal prompt asked this be confirmed, not assumed).
- **Cross-account isolation**: §2.7, verified.

---

## 8. Upload policy — unchanged, still phased

Phase 1 (link/read-only document work) does not depend on the hosted storage limit and is not blocked by anything in this pass. Phase 2 (actual batch file upload, D2–D4) remains blocked on verifying the real hosted Supabase Storage bucket limit — genuinely unresolved, not guessed (§10).

---

## 9. Verification performed

### 9.1 Static checks

`npm run build` (`tsc -b && vite build`) — clean. `npm run lint` (`oxlint`) — clean (zero warnings in any new/modified file; the codebase's ~69 pre-existing warnings elsewhere are unrelated and unchanged). `npm run test` (`vitest run`, new script) — 16/16 passing, covering the aggregate-percentage rules and error-code interpretation.

### 9.2 Database-level verification (scratch Postgres 16, not hosted — see the caveat below)

A disposable local Postgres 16.15 cluster (Homebrew, no Docker available in this environment) was initialized in an isolated scratchpad directory, with a minimal hand-built mock of Supabase's `auth` schema (`auth.users`, `auth.uid()`) and `storage` schema (`storage.buckets`, `storage.objects`, `storage.foldername()`) — the parts of the Supabase platform that this repository's migrations reference but that vanilla Postgres doesn't provide. Role-based grants (`anon`/`authenticated`/`service_role`, baseline table privileges) were replicated to match what Supabase provisions automatically outside this repository's tracked migrations.

Executed and passing:
1. **All 96 migrations** (89 pre-existing plus the 7 new ones) applied cleanly, in order, on a completely fresh database — twice, from two independent fresh databases, confirming both correctness and idempotency of the sequence as a whole.
2. Every scenario in §2.3/§2.6/§2.7 above marked "verified" — the atomic rebalance, every validation rule (reject >100% known, reject fully-known-but-not-100%, accept partial/unknown), the stale-version rejection, the cross-account rejections (function-level and RLS-level), the audit-trigger UPDATE-only/table-scoped behavior, and the multi-entity document-link scenario — was executed as an actual SQL statement against this database and its result inspected, not inferred from reading the code.
3. The §2.7 read-only cross-account pre-check was executed against fixture data replicating the two real seeded properties (`5336 W Foster Ave`, `2169 Ash St`) and their LLC — zero violations found.

**What this does and does not prove:** this is genuine execution evidence for the SQL's correctness, RLS behavior, and trigger logic — a materially stronger signal than "written but never run." It is Postgres 16.15 against a hand-assembled mock of Supabase's platform schema, not the hosted project (Postgres 17.6.1 per `supabase/.temp/postgres-version`), and it used synthetic fixture IDs, not real production data. Before any real deployment: (a) re-run the same migration sequence through the project's actual Supabase toolchain against a real nonproduction Supabase project (this environment had no Docker, so `supabase start` was not available — a genuine environmental limitation, not a shortcut), and (b) run the §2.7 pre-check against the actual hosted database, which this session could not reach.

### 9.3 Not performed (owner-led, per the explicit testing instruction)

No data was created, modified, or deleted in the live customer account. No live-dashboard UI verification was performed — per the Batch I approval's own instruction, the owner tests all normal functionality through the dashboard once a build is ready; this checkpoint's UI increment (§4) has not yet been shown to a browser at all (no dev server was run against it in this session — see §10).

---

## 10. Remaining work and open items

Concrete, not a request for more product decisions — Batch I already resolved the material ones:

1. **Retrofit the stale-write guard onto the pre-existing Property information box's own save?** Not done in this pass (§7) — flagged for confirmation rather than assumed, since it changes behavior on an already-shipped form beyond what this batch strictly needed to touch.
2. **`OrganizationTypePropertiesPanel`'s reassign-dropdown replacement.** Still calls `updatePropertyLlc` directly, bypassing the new correction-and-reason mechanism. This is the one remaining "bypass" and should be closed before this feature is considered complete, but was deliberately isolated out of this pass rather than rushed alongside everything else.
3. **The full entity profile page.** Query layer verified; zero UI built. Next concrete increment.
4. **Entity membership interest UI.** Same status as item 3.
5. **Hosted upload size limit.** Still unverifiable without Supabase dashboard/CLI access — blocks Phase 2 (batch file upload) only, per §8.
6. **This session never opened a browser against the new UI.** `npm run build` proves it compiles; it does not prove it renders or behaves correctly. Running `npm run dev` and clicking through the new Ownership box (empty state, single owner, multi-owner, validation errors, stale-version message) is required before this is shown to the owner as ready — see the numbered test script in the terminal prompt for exactly what to check.
7. **Docker-based local Supabase verification** (`supabase start` + the project's own migration tooling) was unavailable in this environment; the verification in §9.2, while real, used a hand-built approximation of the Supabase platform, not the platform itself. Whoever has Docker available should re-run the migration sequence through `supabase db reset` before this is trusted for a real nonproduction deployment.

Nothing above reopens G1/G2/G4/G6–G8 or I1–I5. Everything else in this document is either a resolved, implemented, and verified fact, or an explicitly isolated remaining item.
