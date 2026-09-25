# Package 1 — Connected property creation & core setup (v2, corrected)

Supersedes the v1 draft committed at `05a6cd8`. Corrected per
`ZMR-package-1-contract-corrections.txt` into one internally consistent,
source-backed specification. Every claim below cites the actual file/
migration it's based on — nothing is asserted as "already existing" or
"already safe" without a citation.

**What's already approved (do not re-approve, do not re-ask):** stop
requiring a redundant Name input when address identifies the property,
preserving every existing name value and its consumers; move new
ownership/contact entry onto the structured system, retaining original
flat legacy values for explicit reconciliation — never inferred, never
deleted (approval register, "Two legacy-field recommendations approved;
Package 1 review", Sept 25 2026). **What is NOT approved and is not
executed here:** the specific mechanisms below (a nullable name column
vs. an autofill value; the exact legacy-contact reconciliation flow; any
`llc_id` compatibility-pointer behavior). Those are proposals in this
document, flagged in §6, awaiting their own decision.

## 0. What this package is

Connects two things that exist today but don't talk to each other: the
single-form Add/Edit Property screen (`PropertyForm.tsx`) and the
already-real, already-tested structured ownership system
(`property_ownership_interests`, `src/modules/llcs/
ownershipInterestsQueries.ts`). It formalizes Batch B's approved
four-step creation shape (OWN-04: "Ownership → Property basics →
Documents (optional) → Review") as the actual creation flow, and
resolves the Name/flat-contact conflicts the Batch S3 preview flagged —
without inferring bookkeeping context from ownership percentages,
without clearing any existing legacy value, and without claiming
mechanisms exist that don't.

**Non-goals, explicit:** no visual restyle beyond what S3 already covers
(that gate is separate and still pending); Insurance/Financials/Tax/
Market-rent untouched; no production deploy or migration executed by
this document itself — every migration named below is a proposal for
approval, not something already applied.

## 1. Field dictionary — source, destination, consumers (source-verified)

### Name (`properties.name`)

**Verified:** the column is `not null` (`supabase/migrations/
20260903173528_initial_schema.sql:11`). The only real UI consumer is
`PropertyList.tsx:34-35`, which shows `propertyLabel(property)` (already
address-preferring — `shared/propertyLabel.ts:13` returns
`property.address ?? property.name`) plus a parenthetical `(name)` *only
when* `property.name !== label`. No other file reads `properties.name`
for display or logic (confirmed by repo-wide search this pass).

Two mechanisms are possible to satisfy the `not null` constraint once
Name is no longer a required *input*; **neither is approved yet, both
require a decision (§6):**

- **Option A (recommended) — make the column nullable.** One migration
  (`alter table properties alter column name drop not null`). Requires
  updating exactly one consumer: `PropertyList.tsx:35`'s guard becomes
  `property.name && property.name !== label` so a null name renders no
  parenthetical instead of literally showing `(null)`. This is the
  root-cause fix — Name becomes what it now actually is, an optional
  annotation, at the schema level too.
- **Option B — write a fallback value at save time.** No migration;
  `createProperty` writes `input.name?.trim() || input.address` when the
  user left Name blank. This reuses a value the user already entered on
  the same form (not a new inferred fact), but leaves a real column
  holding a synthetic copy of another field, which is exactly the kind
  of redundant-copy the correction flagged as unwanted by default.

This document does not choose between them — see §6 decision 1.

### `properties.llc_id` (single-entity compatibility pointer)

**Verified consumers, exhaustive repo search this pass:**
- `PropertyIdentityHeader.tsx:73` — display only (`llcDisplay(property.llc_id, llcOptions)`).
- `PropertyProfileHistoryTab.tsx:16` — `useAuditLog(property.id, property.llc_id)`, entity-scoped audit-log filtering.
- `PropertyProfileOverviewTab.tsx:73,116` — `FinancialAccountsSection` scoping (which financial accounts show as "this property's" vs. "shared account" for the property).
- `useCaptureForm.ts:112,156` / `CaptureEntryDetailsForm.tsx:139,146` — Quick Capture's financial-account picker groups accounts as "This property" vs. "Shared accounts" using this same value, transitively depending on `FinancialAccountsSection`'s scoping logic.
- `auditLogFormatting.ts:12` — labels a change to this column "Organization type" in the audit trail's generic field-diff renderer.
- `PropertyForm.tsx:133-134` — the current single-owner picker, which this package's wizard replaces as the *write* path (§4).

**Not** a consumer, despite the name collision: `PropertyOwnershipInterestsSection.tsx:44`'s `i.llc_id` reads `property_ownership_interests.llc_id` (a different table, same column name) — unrelated to the compatibility pointer discussed here.

**Corrected proposal (§6 decision 2 — not approved):** `property_ownership_interests` remains the sole authoritative source of who owns a property. `properties.llc_id` is set (or updated) **only when there is currently exactly one active ownership interest** — an unambiguous case, not an inference from percentages. When a property has 2+ current owners, `llc_id` is left exactly as it was (never cleared, never set to a guessed "majority" owner, never left stale on a tie by a rule that pretends to resolve it) — the four consumers above must instead be updated to explicitly handle "multiple owners" (e.g. `FinancialAccountsSection` shows an explicit owner/entity picker instead of assuming one scope) rather than silently trusting a pointer that can't represent the real state. **Existing properties whose `llc_id` was set before `property_ownership_interests` existed** (a legacy single-owner pointer with no matching interest row yet) are preserved as-is and get a one-time backfill: create a matching single ownership-interest row from the existing pointer (percentage left null/unresolved, never assumed 100%) rather than bulk-clearing the pointer or leaving it silently orphaned from the new system.

### Owner name / Contact phone / Contact email (flat legacy fields, `properties.owner_name/contact_phone/contact_email`)

**Corrected — nothing is cleared automatically, ever.** The creation
wizard's new Ownership step stops *writing* to these three columns; it
does not touch existing values on any record. For an existing property
that already has legacy values, the property's Overview page gains an
explicit "Reconcile legacy contact" action (not automatic, not tied to
any audit event) that:
1. Shows the existing legacy value(s) verbatim, read-only.
2. Lets the user select an existing `contacts` row or create a new one.
3. Requires an explicit role and an explicit link target (this property,
   and/or the resolved owner entity, per `contact_links`' existing
   shape — `contactsQueries.ts`).
4. Shows an explicit confirmation screen naming exactly which legacy
   value(s) will be copied into which new contact/method before
   anything is written.
5. On confirm: creates the contact/method/link row(s); the legacy
   column is marked reconciled (a new nullable `properties.
   legacy_contact_reconciled_at timestamptz` column, set once) but
   **the original value is left in place, not blanked** — "reconciled"
   is a status, not a deletion trigger. A user who wants the old value
   gone does that as its own, separate, explicit edit later, same as
   editing any other field.
6. Retrying step 5 after a partial failure (e.g. contact created,
   link insert failed) must detect the already-created contact via a
   request-scoped idempotency key (the same mechanism as creation's
   idempotency key, §5) rather than creating a duplicate contact.
7. The action itself writes one audit-log entry for traceability — the
   existing audit trigger records a field-diff automatically for
   `properties` columns it already covers; the *new* `contacts`/
   `contact_links` inserts are covered by their own existing audit path
   already used elsewhere for those tables (unchanged, not new scope).

**Explicit non-behavior, per correction:** no automatic conversion of
`owner_name` into an ownership interest or a percentage of anything.
`contacts` are reusable communication records; ownership interests
reference `llcs` (which already models both entities *and* people —
`llcs.owner_kind: 'individual' | 'entity' | null`, `llcsQueries.ts:24`).
A legacy `owner_name` string becoming an actual owner (an `llcs` row
with `owner_kind='individual'`) is a *product decision a human makes*,
not something this reconciliation action infers or performs.

### Ownership (percentage interests)

No schema change. Already real and already tested this session
(`property_ownership_interests`, `replace_property_ownership_interests`
RPC, `ownershipInterestsQueries.ts:213-227`). The wizard's step 1 is
where the user *enters* this — held in client state only, not yet
written to any table — and persisted at Save (§4/§5), not at step 1
itself; see §5 for exactly when and how.

### Contacts (people, multi-method)

No schema change. Already real (`contacts`/`contact_methods`/
`contact_links`, `contactsQueries.ts`) and already consumed by the
entity profile page. This package's optional contact-linking step in
the wizard, and the legacy-reconciliation action above, are new *call
sites* of this existing system — the system itself is not new work
introduced by Package 1.

### Acquisition (`purchase_price`, `purchase_date`, `purchase_method`) and Building Details (`square_footage`, `lot_size_value`/`unit`, `year_built`, `bedroom_count`, `bathroom_count`, `basement`, `garage_spaces`, `street_parking`, `parking_notes`, `property_tax_id`, `municipal_zoning_code`, `county_assessor_use_code`, `county`, `township`, `property_type`, `exterior_wall_materials`)

**Corrected — these are not wizard steps, and this package does not
build a new section for them.** `PropertyForm.tsx` already renders every
one of these fields in its "Purchase & valuation" and "Property
details" groups, and that *exact same component* is already wired into
the property's own Overview tab as the "Property information"
`EditableSection`'s Edit state (`PropertyProfileOverviewTab.tsx:77-95`).
Editing these fields after creation already works today, unchanged, via
that existing Edit action — the Box interaction standard's normal
view/Edit toggle. The wizard itself only touches Ownership, Property
basics (address/city/state/zip/status), and optional Documents — Batch
B's actual approved four steps, no more.

### Documents (Deed, other acquisition/closing documents)

No schema change. Existing `documents`/`document_owner_links` tables and
upload functions (`documentsQueries.ts`) are reused (§7 for the exact
sequencing, which is not atomic with the database write and must not be
described as if it were).

No new tables are required. New migrations required: one small
idempotency mechanism (§5), the `legacy_contact_reconciled_at` column
above, and — only if Option A is chosen for Name — dropping that
column's `not null` constraint. None of these are executed by this
document.

## 2. Legacy preservation

- No existing `name`, `owner_name`, `contact_phone`, or `contact_email`
  value is ever written to, blanked, or overwritten by anything in this
  package. The only new write to these columns is the one-time,
  user-initiated legacy-contact reconciliation above, and even that
  never blanks the original value.
- No existing `llc_id` value is bulk-cleared. A legacy single-owner
  pointer with no matching `property_ownership_interests` row gets a
  backfilled interest row, not a cleared pointer.
- A brand-new account with zero properties, zero ownership interests,
  and zero contacts must complete the wizard end to end with no
  ZMR-specific assumption (Multi-tenant discipline).

## 3. Layout and states

Batch B's literal four steps, rendered **in place inside the existing
`/properties` registry route** (not new pages, not new URLs) — the same
mechanism `usePropertyRegistry`'s `isCreating`/`isFormOpen` state
already uses for today's single form; this package changes what renders
inside that same in-place slot, not how it's reached.

1. **Ownership** — pick an existing owner (`llcs` row, any
   `owner_kind`) or add one inline; direct-individual ownership stays
   supported and unresolved until named (Q02, already approved — never
   guessed). Percentage entry held in client state only.
2. **Property basics** — address/city/state/zip (required), status,
   optional Name. *Not* Acquisition or Building Details (§1).
3. **Documents (optional)** — stage files client-side; nothing uploads
   yet (§7).
4. **Review** — every entered value shown read-only, empty fields
   omitted (Empty field visibility rule). Save here is the one and only
   persistence point for this flow (§5, §7).

Editing an *existing* property never re-enters this wizard — it opens
`PropertyForm`'s existing Edit state on Overview, exactly as today, for
every field including Acquisition/Building Details.

## 4. Navigation

No new route, no new top-level nav item (Navigation discipline rule).
After a successful Save, lands on the new property's Overview tab,
reusing Batch S1's existing navigation behavior unchanged
(`usePropertyRegistry.ts`'s post-create `navigate(..., { state: {
initialTab: 'overview' } })`).

## 5. Validation

- Address/city/state/zip: required at step 2 (Q01, already approved).
- Ownership: at least one entry required before Review; percentage
  stays optional per entry (Q03); `allocation_status` stays an explicit
  user checkbox, never computed from whether percentages sum to 100 —
  this is the exact bug already fixed once for the existing Ownership
  box (Batch S "Batch S executed" entry) and must not be reintroduced
  here by a second, separate implementation of the same idea.
- Name: per whichever option §6 decision 1 resolves to.
- Every other field's existing validation (numeric/date fields, pick
  lists) is unchanged — no column changes shape.

## 6. Owner decisions still needed (the two settled approvals do not cover these)

1. **Name storage mechanism** — Option A (nullable column, one
   consumer fix, recommended) vs. Option B (address fallback value,
   no migration, but writes a redundant copy). See §1.
2. **`llc_id` compatibility-pointer rule** — set only on a single
   resolved owner, left untouched on 2+ owners, backfilled (not
   cleared) for pre-existing legacy pointers; the four real consumers
   listed in §1 need explicit multi-owner handling, not a guess. See §1.
3. **Legacy-contact reconciliation flow** — the seven-step mechanism in
   §1 (select/create, explicit role+link, explicit confirmation,
   reconciled-not-cleared, idempotent retry, audit trace) is a proposal;
   approve, revise, or replace it.

Nothing above is executed, and no destructive/schema/data change
happens on the strength of these being *proposed* — only once each is
explicitly decided.

## 7. Concurrency, idempotency, and Storage (corrected — no false atomicity claims)

**Verified current state, not assumed:** `createProperty`
(`propertiesQueries.ts:90-96`) is a single-table `insert`, with no
transaction linking it to anything else. `replacePropertyOwnershipInterests`
(`ownershipInterestsQueries.ts:213`) is a separate RPC call requiring an
existing `property_id` — it cannot run in the same call as creation.
Today's only anti-double-submit guard is the client-side `disabled=
{saving}` on the Save button (`PropertyForm.tsx:476-479`) — a UI
convenience, not a durable guarantee against a network retry, a slow
response followed by a second click before the button visually
disables, or two tabs.

**Proposed fix (new migration, not yet executed):** a single Postgres
function, `create_property_with_ownership(p_account_id, p_idempotency_key,
p_property fields..., p_ownership_entries, p_reason, p_allocation_status)`,
mirroring the existing pattern already used for
`replace_property_ownership_interests` — one RPC, one implicit
transaction, so the property row and its initial ownership interest(s)
are created atomically or not at all. A new small table,
`property_creation_requests(idempotency_key uuid primary key,
account_id uuid, property_id uuid, created_at timestamptz)`, gives
duplicate-safe retries: the client generates one UUID when the wizard
starts step 1 and resends the same key on every Save attempt; the
function does `insert ... on conflict (idempotency_key) do nothing
returning property_id`, and a conflict means "already created, return
the existing id" rather than creating a second property. This is
implementation design needed to make the four-step flow safe, not new
user-facing product scope, and it does require an explicit migration —
stated plainly, not glossed over.

**Storage is not part of that transaction, and is not claimed to be.**
Per the existing, already-shipped pattern in
`documentsQueries.ts:uploadEntityDocument` (upload to Storage, *then*
insert the `documents` row, *then* insert the link row — three
sequential steps, each independently erroring) and in Quick Capture's
own submit flow (`useCaptureForm.ts:384-483`: create the row first,
*then* upload staged files one at a time, tolerating a mid-list failure
without rolling back the already-created row), Package 1's Documents
step follows the same accepted shape:
1. Files chosen at step 3 are held as in-memory `File[]` only (same
   pattern as `useCaptureForm.ts:102`'s `files` state) — nothing is
   uploaded, nothing exists in Storage yet, and Cancel at any step
   before Save discards them with no cleanup needed because nothing was
   ever written.
2. At Review's Save: the atomic RPC above runs first (property +
   ownership). Only once it returns a real `property_id` does upload
   begin, file by file, into Storage, followed by each file's
   `documents` row insert (existing `PropertyDeedUploadField`/
   `usePropertyDeedDocument` path, unchanged).
3. **Partial failure after the property already exists is a real,
   possible, and acceptable state**, same as Quick Capture's own
   accepted behavior today: if upload 2 of 3 fails, the property and
   ownership are already saved and not rolled back; the error surfaces
   with which file failed; the user lands on the new property's
   Overview/Documents tab where the existing per-field Deed/document
   upload controls let them retry the specific failed file directly —
   no separate "resume wizard" mechanism is invented, because the
   property already exists and its normal Edit-mode upload controls
   already handle exactly this.
4. A retried Save with the *same* idempotency key after the RPC
   succeeded but before the client got a response (e.g. a dropped
   connection) returns the existing property via the conflict path in
   step 2's function — it does not create a duplicate property, and
   does not re-run already-completed uploads twice, since the client
   only ever uploads once per file selection, gated on getting a real
   `property_id` back.

This explicitly does not promise "no migrations" (two are named above)
and does not promise every downstream consumer is untouched (§1 lists
exactly which ones need a change and why).

## 8. Permissions

Unchanged: every query stays `account_id`-scoped via RLS; the new RPC
and the legacy-reconciliation writes use the same account-scoped access
pattern already enforced everywhere else. No new role or tier.

## 9. Documents / history

- The audit trail already covers `properties` field changes and the
  `property_ownership_corrections` table for every ownership write —
  this package's atomic creation function must call the same
  correction-recording path `replace_property_ownership_interests`
  already uses for its very first write (a "created" correction entry,
  not a silent first row), so a property's ownership history reads
  consistently from day one instead of starting with an unexplained gap.
- The legacy-contact reconciliation action's own audit entry (§1 item 7)
  is new call-site usage of existing audit paths, not new audit
  infrastructure.

## 10. Acceptance evidence required before this package is marked done

- Empty-account case: a brand-new account completes all 4 steps with no
  ZMR-specific assumption.
- Existing-record case: a property created before this package (flat
  legacy fields populated, no ownership-interest row, `llc_id` set) opens
  correctly, shows the legacy line untouched, and is a valid target for
  the reconciliation action and the `llc_id` backfill — neither crashes,
  neither loses data.
- Idempotency case: submitting Save twice with the same idempotency key
  (simulating a retry) produces exactly one property and one ownership
  interest set, not two.
- Partial-upload-failure case: a 3-file Documents step where the second
  upload is made to fail leaves the property and its first successfully
  uploaded document intact, surfaces which file failed, and the
  property's own Documents/Edit controls can complete the remaining
  upload afterward.
- `llc_id` compatibility-pointer case, both branches: a single-owner
  property gets `llc_id` set to that owner; a 2-owner property leaves
  `llc_id` at its prior value, and each of the four listed consumers is
  individually re-verified against the 2-owner case, not assumed fine.
- Full pass in Practice (real Supabase, real dashboard UI), same
  evidence standard as every prior batch this session — no random
  fixtures, no mock-only claims presented as integration evidence.

## 11. Migration and release dependencies (stated explicitly, not omitted)

New migrations this package requires, none yet written or applied:
1. `create_property_with_ownership` Postgres function (atomic creation + first ownership write + its correction-audit entry).
2. `property_creation_requests` table (idempotency key → property id).
3. `properties.legacy_contact_reconciled_at` nullable timestamp column.
4. Only if §6 decision 1 resolves to Option A: `alter table properties alter column name drop not null`, plus the one-line `PropertyList.tsx` consumer fix named in §1.

No migration touches `property_ownership_interests`, `contacts`,
`contact_methods`, `contact_links`, or any Insurance/Financials/Tax
table. Release gate is unchanged from every prior batch: Practice
verification against this section's acceptance evidence, the separate
S3 visual-approval gate for any layout change, then a scoped production
release proposal with its own compatibility/rollback check. No
production deploy or migration is authorized by this document.

## 12. Dependency-ordered packages after this one (boundaries only, unchanged from v1)

- **Package 2 — Insurance O2–O7**: depends on this package's `contacts`
  system only (already real, not newly built here); otherwise
  independent.
- **Package 3 — Financial accounts (Batch N)**: independent; note its
  own eventual multi-owner-scoping question should reuse this package's
  §1 `llc_id` consumer analysis rather than re-deriving it.
- **Package 4 — Property tax (Batch P)**: independent.
- **Package 5 — Market/rent history (Batch Q)**: independent.
- **Package 6 — Capture/History (Batches J–M)**: still queued last, per
  the owner's own sequencing across this entire session.

## 13. Source-backed readiness checklist

| Item | State | Evidence |
|---|---|---|
| Structured ownership system real and tested | Yes | `ownershipInterestsQueries.ts`; Practice verification, Batch S |
| Contacts system real | Yes | `contactsQueries.ts` |
| `llcs` supports person-kind owners | Yes | `llcsQueries.ts:24`, `owner_kind` |
| Current creation is a single non-atomic insert | Confirmed | `propertiesQueries.ts:90-96` |
| Current duplicate-submit guard is client-only | Confirmed | `PropertyForm.tsx:476-479` |
| Upload-then-link is the existing accepted pattern (not atomic with DB row) | Confirmed | `documentsQueries.ts:uploadEntityDocument`; `useCaptureForm.ts:384-483` |
| Acquisition/Building Details already editable post-creation | Confirmed | `PropertyProfileOverviewTab.tsx:77-95` reuses `PropertyForm.tsx` |
| `properties.name` is `not null` today | Confirmed | `20260903173528_initial_schema.sql:11` |
| Only one real display consumer of `properties.name` | Confirmed | `PropertyList.tsx:34-35` |
| Four `llc_id` consumers beyond the form itself | Confirmed | see §1 |
| New migrations required | Yes, 3–4 listed | §11 |
| S3 visual-approval gate | Still open | separate from this contract |
