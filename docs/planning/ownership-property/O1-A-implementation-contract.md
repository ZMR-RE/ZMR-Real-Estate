# O1-A — technical implementation contract

Version 3.1 · September 24, 2026 · Entity/membership UI complete, Settings bypass closed, I1 completeness logic corrected, migration-idempotency claim corrected, browser-verified against an isolated mock harness. Self-contained — does not require reading v1.0/v2.0 to understand current scope or acceptance criteria.

Authority: `ZMR-approval-register.md` (Batches A–D, G1/G2/G4/G6–G8, and Batch I: I1–I5 approved per `ZMR-approved-work-terminal-prompt.txt`), `ZMR-ownership-specification.md`, `ZMR-O1-A-build-package.md`, `ZMR-ownership-next-increment.txt`. Revised H7 (Property Overview tab responsibilities) is a constraint on this batch's UI, not new scope owned by it — see §1.3.

No live migration, deployment, or business-data entry occurred. Every claim in this document marked "verified" was executed either (a) against a disposable local Postgres 16 instance built from this repository's own migration history plus a minimal mock of Supabase's `auth`/`storage` schemas, or (b) against an isolated in-browser mock-data harness (§9.4) — never the hosted project, which this session has no credentialed access to. §9 states precisely which claim used which method and what each does and does not prove.

---

## 0. What changed in this revision (v3.1), and why

A checkpoint review of v3.0 found four issues, corrected here:

1. **The idempotency claim was wrong.** v3.0 §9.2 said two applications to fresh databases confirmed "idempotency of the sequence as a whole." That only demonstrates repeatable clean setup — it says nothing about re-applying a migration to a database that already has it. Actually tested now (§9.2): re-running an already-applied migration file fails immediately and loudly (`column already exists`, `trigger already exists`), identical to how every pre-existing migration in this repo behaves under the same test. The claim is corrected to state exactly this, not idempotency.
2. **I1's completeness rule had a real bug**, not just an imprecise description. §2.3/§2.6 (v3.0) validated a set as "complete" whenever every entered owner happened to have a known percentage — meaning a single owner entered at 48%, with the rest of the ownership not yet on file, was rejected outright (treated as an invalid "fully-known-but-not-100%" set) rather than accepted as a legitimate incomplete allocation. Fixed by adding an explicit `allocation_status` ('incomplete' | 'complete') that the caller must assert on every save — never inferred from the entries themselves. See §2.3/§2.6/§4 for the corrected design, and §9.2 for the regression test proving both the old bug and the fix.
3. **Fixture identities are now clearly fictional.** v3.0's database-level verification (schema/RLS/trigger mechanics, all 96 migrations, cross-account rejection) used data produced by replaying this repo's own seed migrations, which recreate the real account's actual property/LLC names (`5336 W Foster Ave`, `2169 Ash St`, etc.) as a byproduct of testing the migration *sequence* itself. That is schema-level testing, not a check against real business data, but reusing real identities as test fixtures blurs that distinction. The new I1-fix verification and all interactive browser testing in this revision use exclusively invented `ZMR-TEST-FIXTURE`-prefixed names, never a real property/entity identity. §9.2/§9.4 state which evidence used which.
4. **Entity/membership UI is now built**, and **the Settings ownership-reassignment bypass is closed** — both were listed as remaining work in v3.0 §10 and are now implemented (§3/§4/§6) and browser-verified (§9.4).

Batch I's five items remain resolved as v3.0 described (repeated here for completeness, with #1 restated correctly per point 2 above):

- **I1** (percentage rules): known percentages must be positive and ≤100%; currently-known percentages may never sum to more than 100%. Completeness is a separate, explicit assertion (`allocation_status`) the caller makes on every save — **never inferred** from whether the entered percentages happen to be all-known or sum to 100. A `complete` assertion is validated strictly (every current owner must have a known percentage, summing to exactly 100); an `incomplete` assertion accepts any valid partial state, including a single known owner with the rest not yet entered. Multi-owner edits (e.g. 48/52 → 50/50) are atomic — never observable in an invalid intermediate state.
- **I2** (history): effective-dated history is preserved for both property ownership and entity membership, with `effective_date` (when the fact was/is true) kept separate from `recorded_at` (when the system learned it); unknown historic dates are recorded as unknown, never guessed.
- **I3** (legacy pointer): no invented primary/first-owner fallback. `properties.llc_id` is never written by the new mutation path — there is exactly one writable source of truth for title ownership. A read-only view bridges legacy single-owner consumers.
- **I4** (corrections): every route that can change a property's ownership or an entity's membership requires a reason, with no bypass — enforced at the database level (see §2.6) and now, additionally, with the one remaining application-level bypass (the Settings "Reassign" dropdown) closed (§3.4/§6).
- **I5** (protection + audit): ownership-interest writes get stale-write protection via a version check; the new contacts/methods/links tables get audit-trail coverage.
- **Revised H7**: the Property Overview tab keeps Overview limited to identity, a compact occupancy/rent snapshot, and property details; deeper KPI/Financials/Mortgage/Activity/Documents behavior stays in their own tabs. This contract's new Ownership section lives in Overview (identity-adjacent, per Batch E's approved page order: "Property identity → Ownership → Acquisition → ..."); the entity profile page is its own contextual route (§3.1), not a nav addition, and does not duplicate anything already owned by another tab.

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

**History mechanics:** ending an interest (removal, or a percentage change) never deletes or rewrites the old row — it sets `end_date`/`is_current=false` and, for a percentage change, points `superseded_by_id` at the replacement row. A partial unique index enforces exactly one *current* row per pair while allowing unlimited historical rows over time. **Verified** (§9.2, using fictional `ZMR-TEST-FIXTURE` identities): a two-step rebalance (100% → 48/52 → 50/50) on the same property produced five rows total — the original, both intermediate states, and both final rows — with every historical row's own `percentage`/`effective_date` intact and correctly chained via `superseded_by_id`. Also verified interactively in a real browser against the same corrected logic (§9.4).

**Completeness — `allocation_status`, corrected in this revision (§0 point 2):** the version-tracking tables (`property_ownership_versions`, `llc_membership_versions` — see §2.6) each carry an `allocation_status text not null default 'incomplete' check (in ('incomplete','complete'))` column. This is an **explicit fact the caller asserts on every save**, never derived from the interests themselves:

```sql
alter table property_ownership_versions add column allocation_status text not null default 'incomplete'
  check (allocation_status in ('incomplete', 'complete'));
-- llc_membership_versions gets the identical column.
```

The earlier version of this design inferred "complete" whenever every current entry happened to have a known percentage — which meant a single owner entered at 48%, with the rest of the ownership not yet on file, was rejected as an invalid "fully-known-but-not-100%" allocation rather than accepted as a legitimate incomplete one. There was no way to represent "I know about this one owner so far" without the system either wrongly treating it as finished or refusing to save it at all. Fixed: a save now explicitly declares `allocation_status`; `incomplete` accepts any valid partial state (including exactly this case), and only an explicit `complete` assertion is held to the strict "every owner known, summing to exactly 100" standard (enforced in `_validate_ownership_entries`, §2.6). **Verified** (§9.2): the 48%-only/incomplete case is now accepted; the identical entries marked `complete` are rejected; adding the second owner and marking `complete` at 100% succeeds. Also verified interactively in the browser harness (§9.4) — a real `EditableSection`'s Save button, checkbox, and inline status text all reflect this correctly.

Two computed reads (not stored redundantly beyond `allocation_status` itself, so they can never drift from the interests/version row they summarize):

- `property_current_owner` (view) — returns a single `llc_id` only when exactly one current interest exists; `null` both when there are zero (unresolved) and when there are two or more (genuinely multi-owner) — the legacy-pointer bridge from I3, never arbitrarily picking one of several real owners.
- `property_ownership_summary` (view) — `owner_count`, `owners_with_percentage`, `percentage_total`, and `completeness` (`'none' | 'incomplete' | 'complete'`, read directly from `allocation_status`, with `'none'` overriding it whenever there are zero current owners regardless of the stored flag). `llc_membership_summary` is the identical view for entity membership.

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

- `replace_property_ownership_interests(property_id, entries, reason, expected_version, allocation_status default 'incomplete')`
- `replace_llc_membership_interests(llc_id, entries, reason, expected_version, allocation_status default 'incomplete')`

`entries` is the **complete** desired set of currently-effective owners/members (`{owner_id, percentage, effective_date}[]`); anything current but absent from it is treated as removed. `allocation_status` is the caller's explicit completeness assertion (§2.3) — added in this revision; the original version of these functions had no such parameter and inferred completeness from the entries themselves, which was the I1 bug (§0). Each function, in one Postgres transaction (one client RPC call):

1. Requires a non-blank `reason` (raises `ZM003` otherwise).
2. Resolves the account and verifies `is_account_member()` against `auth.uid()` **explicitly, inside the function body** — being `SECURITY DEFINER` grants the privilege to bypass RLS, it is not itself an authorization check, and this function does not rely on it as one (raises `ZM002` if not a member).
3. Validates every entry: percentages positive/≤100 at 2-decimal precision, no duplicate owners, every referenced id belongs to the same account (`ZM002`/`ZM003`).
4. Validates the aggregate, in `_validate_ownership_entries(entries, allocation_status)`: known percentages may not sum past 100 regardless of `allocation_status` (`ZM003`); **only** when `allocation_status = 'complete'` does it additionally require at least one entry, zero unknown percentages, and a sum of exactly 100 (`ZM003`) — an `'incomplete'` assertion accepts any valid partial state, including a single known owner with the rest not yet entered.
5. Locks and checks a per-property/entity version counter against `expected_version`, rejecting a stale write (`ZM001`) rather than silently overwriting a newer one (I5's stale-write protection, extended to this new data).
6. Ends every current interest not present in `entries` (sets `is_current=false`, logs a `removed` correction), then inserts/updates the rest (logs `added` or `percentage_changed`), each correction row carrying the required `reason`.
7. Stores `allocation_status` on the version row and increments the version counter, returning it.

Because validation is computed entirely from the caller's *desired end state* before any row is touched, a rebalance is atomic — **verified** (§9.2): 48/52 → 50/50 in one call left no intermediate state visible to a concurrent reader, and a two-step sequence (add a second owner, then rebalance) produced the correct five-row history described in §2.3.

**Verified security properties**, each with a real, executed test against the scratch database (§9.2, using the repo's own seed-migration fixture data — a schema/security test, not a check against real business data; see §0 point 3), not just a written assertion:
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
| `src/modules/llcs/llcsQueries.ts` | Extended | `Llc` interface gains every §2.1 column; existing `LlcInput`/`updateLlc`/`createLlc` (used by the Settings "Organization types" form, `LlcForm.tsx`) are **unchanged**. `EntityProfileInput`/`updateLlcProfile`/`getLlc`/`markLlcVerified` handle the new profile fields separately. This revision adds the election-history CRUD used by the now-built UI: `LlcTaxElection`/`LlcTaxElectionInput` types, `listTaxElections`, `createTaxElection`, `updateTaxElectionStatus` (ordinary same-row update), `supersedeTaxElection` (inserts a new row, marks the old one `superseded` — never rewrites its facts) |
| `src/modules/llcs/ownershipInterestsQueries.ts` | Extended | Every Supabase call for both interest tables and both correction logs. This revision adds `AllocationStatus`/`OwnershipCompleteness` types, `getLlcMembershipSummary`, and threads `allocationStatus` through `replacePropertyOwnershipInterests`/`replaceLlcMembershipInterests` and `validateOwnershipEntriesClientSide` (§0 point 2) |
| `src/modules/contacts/contactsQueries.ts` | New module (v3.0) | `contacts`/`contact_methods`/`contact_links` CRUD, `listContactsForLlc`/`listContactsForProperty` (joined, methods embedded) |
| `src/modules/documents/documentsQueries.ts` | Extended (v3.0) | `listDocumentsForLlc` (via `document_owner_links` join), `uploadEntityDocument`/`createEntityLink` (accept `llcIds: string[]`), `getAccountStorageUsage` |
| `src/modules/properties/propertiesQueries.ts` | Reduced | `PropertyForOrganizationType`, `listPropertiesByLlc`, and `updatePropertyLlc` **removed** (not deprecated, deleted outright — CLAUDE.md's guidance against backward-compat cruft) after confirming zero remaining callers. These were the Settings-side bypass's only data-access functions (§3.4) |
| `src/shared/pickLists/pickListsQueries.ts` | Extended | `PickListName` union gains `'tax_election_type'`, `'contact_method_label'`, `'contact_role'` — no migration needed, since `pick_list_options.list_name` is plain `text` with no database-level check constraint; this is a TypeScript-only addition |

`npm run build` (`tsc -b && vite build`), `npm run lint` (`oxlint`), and `npm run test` (`vitest run`) are all clean against the full repository with every file in this document added, per §9.1.

---

## 3.4 Entity profile page and Settings bypass closure — new in this revision

**New route:** `/entities/:id` (`src/App.tsx`), same contextual-route shape as the existing `/tenants/:id` — no sidebar entry.

**New files** (`src/modules/llcs/` unless noted):
- `EntityProfile.tsx` — the page itself, modeled directly on `TenantProfile.tsx`: breadcrumb, loading/not-found gates, a stack of boxes (Identity, Contacts, Linked properties, Tax classification + Election history, Membership, Documents, Financial accounts).
- `useEntityProfile.ts` — `getLlc`/`updateLlcProfile`/`markLlcVerified` wiring, same shape as `useTenantProfile.ts`.
- `EntityIdentityForm.tsx` — Identity edit fields; if `owner_kind` is still unconfirmed (`null`) on an existing record, the edit form shows an explicit "Owner / entity kind — not yet confirmed" selector rather than defaulting to a guess (§2.1's `owner_kind` design, carried through to the UI for the first time in this revision).
- `EntityTaxForm.tsx`, `useEntityTaxElections.ts`, `EntityTaxElectionsPanel.tsx` — Tax classification editing plus the election-history list/add/"Mark accepted"/Supersede actions.
- `EntityContactsPanel.tsx`, `useEntityContacts.ts` — the Contacts box: linked contacts with their methods, "+ Add phone/email" per contact, and a "Link a contact" control using the same `SearchableSelect`-with-inline-create pattern as every other picker in this app (search existing contacts via `listContacts`, refreshed on the picker's own `onOpen` per CLAUDE.md's cross-module-freshness rule, or create a new one).
- `EntityLinkedPropertiesPanel.tsx`, `useEntityLinkedProperties.ts` — the entity-side view of its own current ownership interests (address, percentage), with a "Remove this entity's interest" action per row.
- `EntityMembershipSection.tsx`, `useEntityMembershipInterests.ts` — the entity membership roster, structurally identical to the property Ownership box (§4) but scoped to `llc_membership_interests`: add/remove members, percentage per member, the same explicit "mark complete" checkbox, the same required reason.
- `EntityDocumentsPanel.tsx` — Phase 1 only (§8): lists documents linked via `document_owner_links`, and lets the user add a reference link (category, URL, label). No file-upload control is shown — see §4's Phase 1/Phase 2 note.
- Reused unmodified: `LlcFinancialAccountsPanel.tsx` for the Financial accounts box (exactly the "access to existing shared financial accounts" requirement, with no changes needed).

**Settings bypass closed** (I4 "no bypass," resolved per `ZMR-ownership-next-increment.txt`'s explicit instruction to replace it, not just flag it):
- `OrganizationTypePropertiesPanel.tsx` and `useOrganizationTypeProperties.ts` are **deleted**. Their "Reassign" dropdown called `updatePropertyLlc` directly — a raw `UPDATE properties SET llc_id = ...` with no reason captured, no version check, and no correction-log entry, bypassing everything §2.6 enforces for every other ownership-interest write.
- `OrganizationTypeList.tsx`'s "View properties" expandable row now embeds `EntityLinkedPropertiesPanel` — the **same component** the entity profile's own "Linked properties" box uses. There is now exactly one component, backed by exactly one write path (`replacePropertyOwnershipInterests`), for changing a property's ownership interest from either the entity side or (via `PropertyOwnershipInterestsSection`, §4) the property side.
- The entity name in `OrganizationTypeList.tsx` now links to `/entities/:id`.

**Verified**: `npm run build`/`lint`/`test` all clean after these changes (§9.1); the full entity profile page (every section above) was exercised in a real browser against isolated mock data (§9.4), including the Contacts linking flow, the Tax/Election panel, and the Membership box's completeness checkbox.

---

## 4. UI wired — property-side Ownership box

`src/modules/properties/PropertyOwnershipInterestsSection.tsx` + `usePropertyOwnershipInterests.ts`, added to `PropertyProfileOverviewTab.tsx` immediately after "Property information" (matching Batch E's approved page order). Uses the existing `EditableSection` box standard, no new pattern:

- **View**: `.field-grid` list of current owners (name, percentage or "Percentage not recorded" — never a blank/zero); a `status-badge` reading "Complete allocation" or "Incomplete — more owners may still be added," read from the explicit `allocation_status`/`completeness` value (§2.3), never inferred from the percentages shown next to it; `.empty-state` "No owner on file yet" when there are none.
- **Edit**: each current owner's percentage is editable inline with a Remove action; a `SearchableSelect` (excluding the existing `NO_LLC_ID` "Individual ownership" sentinel, which means something different — unresolved, not a selectable real owner) adds a new owner; a checkbox — "This is the complete ownership allocation (every owner listed, percentages totaling 100%)" — is the explicit, user-facing completion action §0 point 2 required; a required reason field; Save calls `replacePropertyOwnershipInterests` with the client-validated full entry set and the checkbox's `allocation_status` once.
- Client-side validation (`validateOwnershipEntriesClientSide`, now completeness-aware) blocks Save with an inline error before any network call; the server re-validates independently regardless.
- A stale-version rejection (someone else changed ownership since this box's data was loaded) surfaces its message and triggers a refresh, so the next attempt is against real current data rather than repeating a doomed retry.

**Verified interactively in a real browser** (§9.4): adding a second owner, checking "complete," entering a reason, and saving correctly produced a two-owner view with a green "Complete allocation" badge — the literal regression case for the I1 fix, confirmed end-to-end through actual rendered UI, not just at the database layer.

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

**Migrations** (`supabase/migrations/`) — the two marked "revised" were edited in place rather than layered under a new timestamp, since neither had ever been applied anywhere outside this session's own disposable scratch databases (§9.2's caveat on what "applied" means here):
- `20260925010000_llcs_entity_profile_fields.sql`
- `20260925020000_llc_tax_elections.sql`
- `20260925030000_contacts.sql`
- `20260925040000_document_owner_links.sql`
- `20260925050000_ownership_interests.sql` — **revised**: added `allocation_status` to both version tables and corrected `property_ownership_summary`/added `llc_membership_summary` to read it instead of inferring completeness (§0 point 2, §2.3)
- `20260925060000_ownership_interest_functions.sql` — **revised**: added the `allocation_status` parameter and the corrected validation branch to both `replace_*` functions and `_validate_ownership_entries` (§2.6)
- `20260925070000_cross_account_integrity.sql`

**Application files — new in this revision**: every file listed in §3.4 (`EntityProfile.tsx` and its ten supporting hook/component files under `src/modules/llcs/`).

**Application files — new in the prior revision (v3.0), unchanged here**: `src/modules/llcs/ownershipInterestsQueries.ts` (+ `.test.ts`), `src/modules/contacts/contactsQueries.ts`, `src/modules/properties/usePropertyOwnershipInterests.ts`, `src/modules/properties/PropertyOwnershipInterestsSection.tsx`.

**Modified in this revision**: `src/App.tsx` (new `/entities/:id` route), `src/modules/llcs/llcsQueries.ts` (election CRUD added), `src/modules/llcs/ownershipInterestsQueries.ts` (`allocationStatus` threaded through, `getLlcMembershipSummary` added), `src/modules/llcs/ownershipInterestsQueries.test.ts` (regression tests for the I1 fix), `src/modules/properties/usePropertyOwnershipInterests.ts`/`PropertyOwnershipInterestsSection.tsx` (completeness checkbox, `completeness` badge), `src/modules/llcs/OrganizationTypeList.tsx` (embeds `EntityLinkedPropertiesPanel`, links entity name to profile), `src/modules/llcs/OrganizationTypesSection.tsx` (stops passing the now-removed `accountId`/`llcOptions` props), `src/modules/properties/propertiesQueries.ts` (three functions removed, §3), `src/shared/pickLists/pickListsQueries.ts` (three new pick-list names).

**Deleted in this revision**: `src/modules/llcs/OrganizationTypePropertiesPanel.tsx`, `src/modules/llcs/useOrganizationTypeProperties.ts` (the closed bypass, §3.4).

**New in this revision — isolated browser-test harness** (never imported by the real app; see §9.4 for what it is and isn't evidence of): `src/devHarness/` (`mockSupabase.ts`, `mockRpc.ts`, `mockAuthContext.tsx`, `mockSupabaseClient.ts`, `fixtures.ts`, `HarnessApp.tsx`, `main.tsx`), `harness.html`, `vite.harness.config.ts`, `package.json`'s new `dev:harness` script.

**Modified in the prior revision (v3.0), unchanged here**: `src/modules/documents/documentsQueries.ts`, `src/modules/properties/PropertyProfileOverviewTab.tsx`, `package.json` (added `vitest`/`test` script), `.env.test`, `vitest.config.ts`.

**Untouched**: `Settings.tsx`, `AppShell.tsx`, every file under `src/modules/units`/`leases`/`tenants`, and the entire parallel Batch E/F/G/H Property-Overview-layout planning track.

---

## 7. Interaction contract

Unchanged principles from prior drafts, now implemented rather than only specified:

- **Save/Cancel**: the Ownership box follows `EditableSection` exactly — Edit → editable state → Save or Cancel → view-only. "Save" is the only label used.
- **Validation**: client-side check blocks Save with an inline error; the database is the actual enforcement boundary regardless of what the client already checked.
- **Failed requests**: on error, `saving` clears, the message renders via `role="alert"`, and entered values are preserved (the user can retry without retyping) — matching the existing pattern throughout this codebase.
- **Retry/double-submit**: the Save button disables for the duration of the request.
- **Conflicting edits**: implemented for the ownership-interest tables specifically (I5) via the version-counter check in §2.6 — **not** retrofitted onto the pre-existing Property information box's own save in this pass (see §10; still an open confirmation item, not assumed either way).
- **Cross-account isolation**: §2.7, verified.

---

## 8. Upload policy — unchanged, still phased

Phase 1 (link/read-only document work) does not depend on the hosted storage limit and is not blocked by anything in this pass. Phase 2 (actual batch file upload, D2–D4) remains blocked on verifying the real hosted Supabase Storage bucket limit — genuinely unresolved, not guessed (§10).

---

## 9. Verification performed

### 9.1 Static checks

`npm run build` (`tsc -b && vite build`) — clean. `npm run lint` (`oxlint`) — clean; 11 new warnings appear across the new hook files (all the identical pre-existing `react(set-state-in-effect)` pattern that already appears roughly 50 times throughout this codebase's other `use<Module>.ts` hooks — not a new category of issue, and not something this codebase treats as an error). `npm run test` (`vitest run`) — 20/20 passing (16 from v3.0 plus 4 new regression cases for the I1 completeness fix, §9.2).

### 9.2 Database-level verification (scratch Postgres 16, not hosted — see the caveat below)

A disposable local Postgres 16.15 cluster (Homebrew, no Docker available in this environment) was initialized in an isolated scratchpad directory, with a minimal hand-built mock of Supabase's `auth` schema (`auth.users`, `auth.uid()`) and `storage` schema (`storage.buckets`, `storage.objects`, `storage.foldername()`). Role-based grants (`anon`/`authenticated`/`service_role`, baseline table privileges) were replicated to match what Supabase provisions automatically outside this repository's tracked migrations.

**Carried forward from v3.0, using the repo's own seed-migration fixture data** (schema/security testing, not a check against real business data — §0 point 3): all 96 migrations applying cleanly on two independent fresh databases; the atomic rebalance; the pre-fix validation rules; the stale-version rejection; the cross-account rejections (function-level and RLS-level); the audit-trigger UPDATE-only/table-scoped behavior; the multi-entity document-link scenario; the §2.7 read-only cross-account pre-check (zero violations found).

**New in this revision, using exclusively fictional `ZMR-TEST-FIXTURE`-prefixed identities** (a fresh scratch database, `zmr_test3`, seeded with invented accounts/properties/entities — never the seed migrations' real names):

1. **Idempotency claim corrected.** v3.0 claimed the two-fresh-database test "confirmed idempotency of the sequence as a whole" — that only shows the sequence is deterministic when starting clean. Actually tested: re-running an already-applied migration file against a database that already has it produces an immediate, explicit failure —
   - `20260925070000_cross_account_integrity.sql` reapplied: `ERROR: trigger "properties_llc_same_account" for relation "properties" already exists`
   - `20260925010000_llcs_entity_profile_fields.sql` reapplied: `ERROR: column "owner_kind" of relation "llcs" already exists`
   - A pre-existing (not authored by this batch) migration, `20260904193000_llcs_entity.sql`, reapplied for baseline comparison: `ERROR: relation "llcs" already exists` — the identical failure mode, confirming this is how every migration in this repo behaves under reapplication, not a defect specific to the new ones. None of this repo's 96 migrations use `if not exists`/idempotent guards; Supabase's own migration ledger (`supabase_migrations.schema_migrations`, tracking which migrations have already run) is what prevents double-application in real operation, not idempotent SQL.
2. **I1 completeness fix, regression-tested directly:**
   - One owner at 48%, `allocation_status='incomplete'`, `expected_version=0` → **accepted**; `property_ownership_summary.completeness = 'incomplete'`, `percentage_total = 48.00`.
   - The identical 48%-only set with `allocation_status='complete'` → **rejected**: `A complete allocation must total exactly 100% (currently 48.00)`.
   - A second owner added at 52% with `allocation_status='complete'` → **accepted**; `completeness = 'complete'`, `percentage_total = 100.00`, `owner_count = 2`.
   - An empty entry set with `allocation_status='complete'` → **rejected**: `A complete allocation must include at least one owner`.
   - The identical four cases repeated against `replace_llc_membership_interests` (30%-only/incomplete accepted, same set/complete rejected, stale-version rejected) — confirming parity between the property and membership functions, per the instruction to preserve consistency "across all ownership/membership correction routes."

**What this does and does not prove:** this is genuine execution evidence for the SQL's correctness, RLS behavior, trigger logic, and (new in this revision) the corrected completeness rule — a materially stronger signal than "written but never run." It is Postgres 16.15 against a hand-assembled mock of Supabase's platform schema, not the hosted project (Postgres 17.6.1 per `supabase/.temp/postgres-version`), and every scenario used either the repo's own seed data (schema-level tests) or clearly-fictional invented identities (feature-level tests) — never real business data. Before any real deployment: (a) re-run the same migration sequence through the project's actual Supabase toolchain against a real nonproduction Supabase project (this environment had no Docker, so `supabase start` was not available — a genuine environmental limitation, not a shortcut), and (b) run the §2.7 pre-check against the actual hosted database, which this session could not reach.

### 9.3 Not performed (owner-led, per the explicit testing instruction)

No data was created, modified, or deleted in the live customer account. No live-dashboard UI verification against the real Supabase project was performed, and none is claimed — per the Batch I approval's own instruction, the owner tests all normal functionality through the dashboard once a build is ready.

### 9.4 Browser verification — isolated mock-data harness (new in this revision)

**What it is:** `src/devHarness/` plus `harness.html`/`vite.harness.config.ts`, run via `npm run dev:harness` on `http://localhost:5180/harness.html` — a separate Vite entry point and dev-server port from the real app's `npm run dev` (default 5173), with `shared/supabaseClient` and `shared/auth/AuthContext` aliased, for this bundle only, to in-memory mock implementations (`mockSupabaseClient.ts`, `mockAuthContext.tsx`). No real Supabase URL or key is read by this bundle at all — it cannot reach any real backend, live or nonproduction, even by accident. Fixture data (`fixtures.ts`) uses exclusively `ZMR-TEST-FIXTURE`-prefixed invented names. The page itself displays a persistent banner: "MOCK DATA HARNESS — not connected to Supabase... Not owner-acceptance or Supabase-integration evidence."

**What was actually exercised, in a real Chrome browser, against the real component code** (not a snapshot/unit test — the genuine `EntityProfile.tsx`, `PropertyOwnershipInterestsSection.tsx`, and every component they import, rendered and interacted with):
- The property Ownership box: opened Edit, added a second fictional owner, entered a percentage, checked "This is the complete ownership allocation," entered a reason, saved — the view correctly updated to show both owners and a green "Complete allocation" badge. This is the literal I1 regression scenario, confirmed working end-to-end through actual UI, not just the database layer.
- The full entity profile page: Identity (view mode correctly omits every blank field — display name, mailing address, notes, EIN, registered agent, etc. — showing only Owner/entity kind, Legal name, Legal structure, Formation jurisdiction, and a "Mark verified" button); Contacts (existing fictional contact with its method displayed, "+ Add phone/email," and a working "Link a contact" search-or-create form); Linked properties (correct empty state); Tax classification (LLC membership, Federal tax treatment, and an Election history table with "Mark accepted"/"Supersede" actions); Membership (correct empty state, and its Edit form showing the identical completeness checkbox/reason pattern as the property side); Documents (correct empty state, a working "Add a reference link" form, and the exact Phase 1 messaging: "File upload isn't available here yet — the hosted storage per-file limit hasn't been verified... reference links work now"); Financial accounts (the reused, unmodified `LlcFinancialAccountsPanel`, showing its own correct empty state).

**A real, environment-specific bug was found and fixed during this testing, worth recording precisely:** the harness's Vite alias initially matched only one relative-import depth (`'../../shared/auth/AuthContext'`), which is what every `src/modules/*/` file uses — but `src/shared/pickLists/usePickListOptions.ts` (one level shallower) imports the identical target via `'../auth/AuthContext'`, which the alias missed, crashing the harness the moment any component using `PickListSelect` rendered. Fixed by exhaustively grepping every distinct import specifier in the repo (`grep -rhoE "from '[^']*AuthContext'" src/`) and aliasing each one explicitly (§ vite.harness.config.ts's own comment has the full list). This bug was in the harness's own Vite config, not in any application file — it does not indicate a defect in `EntityProfile.tsx` or any component under test.

**What this does and does not prove:** this is real evidence that the built UI renders correctly, handles its interactive flows correctly, and correctly reflects the corrected I1 logic — a materially stronger signal than "the build compiles." It proves nothing about the real Supabase integration: RLS as enforced by the actual PostgREST/Auth stack, real network latency/error handling, or any interaction with real account data. It is not owner-acceptance testing and is not represented as such anywhere in this document.

---

## 10. Remaining work and open items

Concrete, not a request for more product decisions — Batch I already resolved the material ones. Items resolved in this revision (entity profile UI, membership UI, the Settings bypass) are removed from this list; see §0 for what changed.

1. **Retrofit the stale-write guard onto the pre-existing Property information box's own save?** Still not done — flagged for confirmation rather than assumed, since it changes behavior on an already-shipped form beyond what this batch strictly needed to touch.
2. **Hosted upload size limit.** Still unverifiable without Supabase dashboard/CLI access — blocks Phase 2 (batch file upload) only, per §8. Nothing else in this batch is blocked by it.
3. **Docker-based local Supabase verification** (`supabase start` + the project's own migration tooling) was unavailable in this environment; §9.2's verification, while real, used a hand-built approximation of the Supabase platform, not the platform itself. Whoever has Docker available should re-run the migration sequence through `supabase db reset` before this is trusted for a real nonproduction deployment.
4. **No real Supabase project (nonproduction or otherwise) beyond the single live "ZMR Real Estate" project was found** (`supabase projects list` returns exactly one, linked, project). §9.4's browser verification is real but explicitly not Supabase-integration evidence — it cannot be, since the harness's mock client never makes a network call. The concrete minimum action to get real integration testing: either (a) install Docker or a lightweight alternative (e.g. Colima — free, open source) so `supabase start` can run the project's actual local stack, or (b) create a second, dedicated nonproduction Supabase project through the dashboard for this kind of testing going forward. Both are the owner's call — see the accompanying report for the exact cost/action needed; neither was done in this session (installing platform software and creating external projects both require the owner's explicit action per the governing instructions).
5. **Whether entity membership changes need the same reason-capturing rigor as property ownership changes, applied consistently, has been resolved as "yes"** in this revision — `EntityMembershipSection`/`replace_llc_membership_interests` require a reason exactly like the property side, with full parity verified (§9.2). This item from earlier drafts is now closed, listed here only so its resolution is visible rather than silently dropped.
6. **A numbered owner UI test script** should be written once the owner has Docker or a nonproduction Supabase project available to actually run the app against (item 4) — a script written against the mock harness would describe mock behavior, not the owner's real app, so it is deliberately not written yet; see the terminal prompt for what it needs to contain when that blocker clears.

Nothing above reopens G1/G2/G4/G6–G8 or I1–I5. Everything else in this document is either a resolved, implemented, and verified fact, or an explicitly isolated remaining item.
