# Package 1 — Connected property creation & core setup

Prepared per `ZMR-workflow-package-reconciliation.txt` instruction 5, under
the owner-approved "Option 3" connected-workflow process (CLAUDE.md,
"Connected workflow delivery"). This is an executable implementation
contract for the FIRST candidate package, not a status report. Scope is
deliberately bounded to identity/location, structured ownership/contact
references, Acquisition/Building Details, and existing-record
preservation — it does not touch Insurance, Financial accounts,
Property tax, Market/rent history, or Capture/History (Batches N–Q, J–M
remain separately queued, per the instruction's own scope limit).

## 0. What this package actually is

The current Add/Edit Property screen (`PropertyForm.tsx`) and the
already-implemented, already-tested structured ownership system
(`property_ownership_interests`, `src/modules/llcs/
ownershipInterestsQueries.ts`, verified live in Practice as part of
Batch S) currently coexist without being connected to each other. This
package connects them: it resolves the two conflicts flagged in the
Batch S3 preview (`src/devHarness/PropertyFormGroupedPreview.tsx`) by
retiring the registry form's own flat ownership fields in favor of the
real structured system, and by de-emphasizing the free-text Name field
in favor of address as the actual identifier — while preserving every
existing value already on record. It also formalizes Batch B's
originally-approved four-step flow (Ownership → Property basics →
Documents → Review) as the actual creation path, instead of today's
single flat form.

**Explicit non-goals:** no visual restyle beyond what's already approved
(S3's grouped-form direction still requires its own separate visual
sign-off before any layout change ships — this package's schema/logic
changes do not depend on that sign-off and are sequenced first);
Insurance/Financials/Tax/Market-rent unchanged; no production deploy or
migration in this package's own execution — release is a separate,
later gate (§9).

## 1. Field dictionary — source, destination, consumers

| Field | Current source (table.column) | New/changed destination | Consumers that read it today |
|---|---|---|---|
| Name | `properties.name` (required, free text) | **Unchanged column.** UI requirement relaxed: no longer required at creation; kept as an optional label, pre-filled from address if left blank at Save time (never inferred silently — see §6 Q1). | Registry list row label only (`PropertyList.tsx`) — confirmed via source read, nothing else consumes it |
| Address/City/State/Zip | `properties.{address,city,state,zip}` | Unchanged. Becomes the enforced identifier at creation (already required by Batch B's approved Q01). | `propertyLabel()` helper, profile `<h1>`, registry sort, breadcrumb |
| Organization type (legacy single-entity pointer) | `properties.llc_id` | **Unchanged column, meaning narrows.** Stops being edited directly in the creation/edit form; becomes a derived read-only display computed from `property_ownership_interests` (majority owner, or "Multiple owners" when 2+) per O1-A's still-open decision (contract §10 item 3) — **this package resolves that decision: `llc_id` is synced server-side on every ownership write to the majority-percentage owner's `llc_id`, or left as the sole owner's when there's exactly one; ties/no-majority leave it at its last-synced value rather than guessing.** Existing financial-account scoping that reads `llc_id` is unaffected because the column keeps being populated, just no longer hand-edited on this form. | `useLlcs`, financial-account scoping, Settings org-type views |
| Owner name / Contact phone / Contact email (flat) | `properties.{owner_name,contact_phone,contact_email}` | **Columns kept, never dropped.** Creation/edit form stops writing to them. A read-only "Legacy contact (pre-migration)" line shows existing values on any record that still has them, with an explicit one-time "Migrate to structured contacts" action (§6 Q2) that copies the value into a real `contacts`/`contact_methods` row linked to the property and then blanks the legacy field — reversible only by the same audit trail every other correction uses, never silent. | None found outside this form itself and the registry list (confirmed via source read this session) |
| Ownership (percentage interests) | `property_ownership_interests` (already real; `ownershipInterestsQueries.ts`) | **No schema change.** Creation flow's step 1 becomes a save into this same table via `replacePropertyOwnershipInterests`, using the property's real id — which means, for a brand-new property, ownership can only be saved *after* the property row exists (see §4 step ordering). | `PropertyOwnershipInterestsSection`, `usePropertyOwnershipInterests`, Mortgage/KPI equity displays |
| Contacts (people, multi-method) | `contacts` / `contact_methods` / `contact_links` (already real; `contactsQueries.ts`) | **No schema change.** Creation flow's optional contact step links an existing or new contact to the property with a role, same mechanism the entity profile already uses. | Entity profile Contacts section, property Ownership box |
| Acquisition (`purchase_price`, `purchase_date`, `purchase_method`) | `properties.{purchase_price,purchase_date,purchase_method}` | Unchanged columns; grouped into their own creation step ("Acquisition") rather than buried in the single long form. | Mortgage tab cost-basis calc, KPI depreciation note |
| Building Details (`square_footage`, `lot_size_value`/`lot_size_unit`, `year_built`, `bedroom_count`, `bathroom_count`, `basement`, `garage_spaces`, `street_parking`, `parking_notes`, `property_tax_id`, `municipal_zoning_code`, `county_assessor_use_code`, `county`, `township`, `property_type`, `exterior_wall_materials`) | `properties` columns, all already real (confirmed against `PropertyForm.tsx` field-by-field this session) | Unchanged columns; grouped into a "Building details" creation step, optional at creation (can be filled in later from the profile, per Box interaction standard's Edit action — creation does not force every field). | KPI physical-facts cards, Mortgage/property-tax consumers, exterior-material display |
| Documents (Deed, other acquisition/closing docs) | `documents` table, `property_id` FK (already real) | Unchanged. Creation flow's optional Documents step uploads through the same `PropertyDeedUploadField`/generic document upload already shipped — no new upload mechanism. | Documents tab, Activity/History |

No new tables and no new columns are required by this package. Every
change is either (a) a UI-layer regrouping of already-existing fields
into steps, or (b) a write-path change (stop writing three legacy
columns, keep reading them) plus the one small `llc_id`-sync trigger
named above.

## 2. Legacy preservation

- No existing `properties.owner_name`/`contact_phone`/`contact_email`
  value is ever deleted by this package. They are read-only until the
  owner explicitly triggers the one-time migrate action per record.
- No existing `properties.name` value changes. The relaxed-requirement
  behavior only affects what happens on a *new* Save going forward.
- `properties.llc_id` keeps being written (by the sync described above)
  so every existing consumer of that column keeps working unchanged.
- A brand-new account with zero properties and zero ownership interests
  must be able to complete the whole four-step flow end to end with no
  assumption that any ZMR-specific data exists (Multi-tenant discipline).

## 3. Layout and states

Creation is a 4-step flow (Batch B's approved shape), each step a normal
page, not a modal:
1. **Ownership** — pick an existing owner (entity or a person via
   Contacts) or add one inline; direct-individual ownership stays
   supported (Q02: kept unresolved/"Individual ownership" until named,
   never guessed).
2. **Property basics** — address/city/state/zip (required), status,
   optional Name.
3. **Documents (optional)** — Deed/acquisition documents; skippable.
4. **Review** — every entered value shown read-only (empty fields
   omitted, per the Empty field visibility rule) with a single Save.
   Creation is atomic at this step: the property row and the initial
   ownership interest are created in one transaction; cancelling at any
   prior step persists nothing (Q07, already approved, already the
   existing single-form behavior — preserved, not weakened).

After creation, Building Details and Acquisition are **not** part of the
required wizard — they're already-shipped Edit-mode sections on the
property's own Overview tab, following the standing Box interaction
standard (view-only by default, single Edit action, Save/Cancel).
Editing an *existing* property never re-enters the 4-step wizard; it
opens the relevant box's own Edit state, exactly as today.

Desktop/phone states: reuses the app's existing single-column form
convention at every step (no width change bundled into this package —
the S3 grouped-form direction is a separate, still-pending visual
decision, sequenced after this one).

## 4. Navigation

`/properties` (registry) → "Add property" starts step 1 in place,
matching the existing registry's in-place form pattern (no new route).
Step order is linear with Back/Next; Review's Save is the only
persistence point. After Save, navigation matches Batch S1's existing,
already-shipped behavior: land on the new property's Overview tab. No
new top-level nav item (Navigation discipline rule) — this lives inside
the existing Properties section.

## 5. Validation

- Address, city, state, zip: required at Property-basics step (Q01,
  already approved).
- Ownership: at least one owner entry required before Review; percentage
  stays optional per entry (Q03 — never inferred), `allocation_status`
  is an explicit user checkbox, never computed from whether percentages
  sum to 100 (the exact bug I1 already fixed once — this package must
  not reintroduce it).
- Name: no longer required; if left blank, defaults to the address
  string at save time so the registry list row is never empty — this is
  formatting a value the user already entered elsewhere on the same
  Save, not inferring new information, so it does not conflict with the
  Data integrity rule against guessing field values.
- Every other field keeps its existing validation unchanged (numeric
  fields, date fields, etc.) since no column changes shape.

## 6. Owner decisions still needed (not resolved by this contract)

1. **Name-field behavior above** (stop requiring it, default to address
   when blank) is a recommendation, not yet approved — matches the S3
   preview's own flagged conflict. Approve/revise before implementation.
2. **Legacy flat-contact migration mechanism** (read-only display +
   explicit one-time "Migrate to structured contacts" action) is a
   recommendation. Alternative: leave the three legacy fields visible
   and editable indefinitely alongside the new system. Needs a decision
   before the Property-basics step's exact layout is finalized.
3. Confirms `llc_id` sync rule above (majority-percentage owner, ties
   unresolved/left at last value) as the resolution to O1-A contract
   §10 item 3 — flagging for explicit approval since it was previously
   left open.

No destructive, schema, or data change is executed on the strength of
these recommendations alone, per the reconciliation instruction.

## 7. Permissions

Unchanged from today: every query is `account_id`-scoped via RLS, no new
role or permission tier introduced. The one-time contact-migration
action writes through the same account-scoped `contacts` insert path
the entity profile already uses.

## 8. Concurrency / retries

- Property creation: unchanged existing duplicate-retry safeguard (Q07,
  already shipped) — a repeated Save after a network hiccup does not
  create a second row.
- Ownership save at step 1: uses the existing optimistic-concurrency
  `version` check already built and tested in `ownershipInterestsQueries.ts`
  — for a brand-new property this is its first write, so no conflict is
  possible yet; the guard matters once the owner returns to Edit an
  existing property's ownership later, which is already covered by
  existing, already-tested code, unchanged by this package.
- The legacy-contact migration action is a single, idempotent write
  (blank the three legacy columns, insert one contact/contact_method
  row) — retrying an already-completed migration must detect the
  already-blank legacy fields and no-op rather than creating a duplicate
  contact.

## 9. Documents / history

- Documents step reuses the existing `documents` table/upload path
  unchanged (§1). No new document category is introduced by this
  package.
- Every ownership write (creation's step 1 included) already produces a
  `property_ownership_corrections` audit row via the existing mechanism
  — this package relies on that, does not duplicate or bypass it.
- The legacy-contact migration action should itself write one audit/
  history entry (which surface — Activity log vs. a dedicated note — is
  part of owner decision 2 above).

## 10. Acceptance evidence required before this package is marked done

- Empty-account case: a brand-new account with zero properties can
  complete all 4 steps and land on a working Overview with no
  ZMR-specific assumption (Multi-tenant discipline, explicit test).
- Existing-record case: opening an existing property created before
  this package (flat Owner name/Contact phone/Contact email populated,
  no `property_ownership_interests` row) must render correctly with the
  read-only legacy line, must not crash, and must not silently discard
  those values.
- Cancel-at-any-step case: no property or ownership row exists after a
  cancel at steps 1–3 (Q07 regression check).
- The `llc_id` sync rule verified against a real 2-owner, no-majority
  case and a real 2-owner, one-majority case.
- Full functional pass in Practice (not production), following the same
  evidence standard Batch S already established: real dashboard UI, real
  Supabase, genuine documents, no random-byte fixtures.

## 11. Migration and release dependencies

- No new migration required (§1) beyond the small server-side `llc_id`
  sync, which can be a trigger or an application-layer write inside
  `replacePropertyOwnershipInterests` — application-layer write is
  recommended (matches the existing pattern of every other write in that
  file going through one function, per CLAUDE.md's Root-cause/one-write-
  path preference) rather than a new database trigger, unless a future
  bulk/backfill need requires trigger-level enforcement.
- Depends on nothing outside this package's own scope — Insurance,
  Financials, Tax, Market/rent are untouched and unblocked by this.
- Release gate: same as every other batch this session — Practice
  verification and this contract's acceptance evidence, owner visual
  review of the (separately-gated) S3 form layout, then a scoped
  production release proposal with its own compatibility/rollback check.
  No production deploy or migration is authorized by this contract.

## 12. Dependency-ordered packages after this one (boundaries only)

- **Package 2 — Insurance O2–O7**: coverage-limit rows, premium basis
  field, reusable contacts (reuses this package's `contacts` system
  directly), real file upload, cancellation/renewal, shared
  multi-property policies. Depends on Package 1 only for the shared
  `contacts` system; otherwise independent.
- **Package 3 — Financial accounts (Batch N)**: Overview account
  reference, institution/purpose/notes, archive/restore. Independent of
  Package 1; depends on nothing built here.
- **Package 4 — Property tax (Batch P)**: bill/installment facts,
  distinct payments, reminders. Independent.
- **Package 5 — Market/rent history (Batch Q)**: monthly multi-source
  entry, named-source charts. Independent.
- **Package 6 — Capture/History (Batches J–M)**: explicitly deprioritized
  by the owner behind property/ownership work across this entire
  session; still queued last.

Each later package is intentionally left at this boundary/dependency
level of detail, per the instruction's own allowance — full field-level
specification for each follows the same contract shape as this document
once its turn comes.
