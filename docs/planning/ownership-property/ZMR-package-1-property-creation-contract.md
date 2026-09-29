# Package 1 — Connected property creation & core setup (v3, final readiness)

> **Approval update — September 28, 2026:** The owner approved the revised creation/Review and grouped Edit layouts with three required corrections: restore Documents Edit, make unknown shares readable, and use normal Save/Cancel with normal-size responsive verification. This supersedes visual-approval-pending statements below. Execute the approved connected scope in Practice using `ZMR-package-1-approved-build-prompt.txt`; production release remains separately gated.


Supersedes v2 (`53b844f`). Corrected per
`ZMR-package-1-final-readiness-handoff.txt`. The two settled product
approvals (drop the redundant Name requirement; move to structured
ownership/contacts, retaining legacy values for explicit reconciliation)
are unchanged and not re-asked. This revision resolves every remaining
engineering gap with a concrete, source-backed, testable mechanism —
nothing left as "pick one" where the approved behavior already implies
the answer — and narrows the one real open product question (legacy
ownership ambiguity) to a single plain recommendation.

**What changed in this revision, in one place:**
- Name is now nullable — **implemented and verified this pass** (not just proposed): migration applied to Practice, TypeScript types/consumers updated across the whole repo, build/lint/test clean. See §1.
- Audit coverage for `contacts`/`contact_methods`/`contact_links` INSERTs — **implemented and verified this pass**. A related, more serious, pre-existing bug was found and fixed in the same migration: see §1.
- The `llc_id` "backfill" idea from v2 is withdrawn — it silently turned an unverified legacy pointer into confirmed ownership, which is exactly what's now explicitly prohibited. Replaced with an explicit, never-automatic "confirm ownership" action. See §2.
- The idempotency mechanism in v2 was broken (`ON CONFLICT DO NOTHING RETURNING` returns no rows on conflict — it cannot actually retrieve the prior request). Fixed, with account-scoped authorization and explicit changed-payload handling. See §5.
- Document/Storage recovery now has a concrete, testable design (stable object keys, resumability after reload, verified-safe cleanup). See §6.
- Scope is stated plainly where it was previously implied: §8.

## 1. Name and audit coverage — implemented and verified this pass

**Name:** `properties.name` is now nullable
(`supabase/migrations/20260925090000_properties_name_nullable.sql`).
Verified applied to Practice directly (not assumed): `information_schema.columns` confirms `is_nullable = YES`, and a real `insert ... values (..., name => null, ...)` against Practice succeeded and was cleaned up. Every TypeScript consumer was updated, not just the one found by an earlier text search — the compiler caught three more than that search did, which is exactly why "validate all TS types" mattered here:
- `propertiesQueries.ts`'s `Property.name: string | null`.
- `usePropertyRegistry.ts`'s `BLANK_PROPERTY.name: null`.
- `PropertyForm.tsx`'s Name field: `required` and the asterisk removed, `onChange` now stores `null` on an empty value instead of `''`.
- `PropertyList.tsx:35`'s parenthetical guard: `property.name && property.name !== label`.
- `shared/propertyLabel.ts`'s `PropertyRef.name: string | null`, and its own fallback chain extended to `property.address ?? property.name ?? '—'` — a property with neither address nor name was always structurally possible (address was never HTML-`required` either) and the function's return type is `string`, so it needs its own terminal fallback, not just a pass-through of `name`.
- `reportsCalculations.ts`'s `computeBalanceSheet` parameter shape (doesn't read `.name`, but its type annotation was wrong).
`npm run build`/`lint`/`test` clean (53/53) after every change. No component was assumed to be the only dependent — the type system was used to prove it.

**Audit coverage:** contacts/contact_methods/contact_links already had UPDATE-only audit coverage, added by `20260925030000_contacts.sql` — that file's own comment already named the exact gap this closes ("Creating a new contact, method, or link is not itself audit-logged"). `20260925100000_audit_trail_contacts.sql` generalizes the existing `log_audit_changes()` function to also handle `TG_OP = 'INSERT'`, and extends the three existing triggers (drop+recreate under the same names, not a second parallel trigger) to fire on insert. Verified live against Practice: inserting a real (`ZMR-TEST-`-prefixed, cleaned up after) contact now produces two `audit_log` rows (`name`, `archived`, old value empty, new value populated); before the fix, none were produced.

**Two regressions introduced by that same `20260925100000` migration were found and fixed with forward migrations** (`20260925100000` is already applied to Practice, so both are corrected forward, not by editing that file in place, to avoid environment divergence). The migration had replaced both `contact_links_audit_log` and `contact_methods_audit_log`'s existing `after update` triggers with `after insert` only, on the stated reasoning that no `updated_at` column means a create-once record:

- `contact_links` — wrong specifically because `contactsQueries.ts`'s `setContactLinkPrimary` (line 112-113) does a real `update contact_links set is_primary_contact = ...`, a genuine update path unrelated to whether the table tracks its own `updated_at`. Fixed in `20260925110000_contact_links_audit_update_fix.sql`.
- `contact_methods` — corrected a second time, one pass later: this session first (wrongly) treated the missing UI update call site as evidence the loss was acceptable. It wasn't — the *original* `20260925030000_contacts.sql` migration deliberately gave `contact_methods` the same `after update` coverage as `contacts`/`contact_links`, RLS already permits updating it, and "nothing in the app happens to call update yet" is not the same claim as "update coverage was never needed." Fixed in `20260925120000_contact_methods_audit_update_fix.sql`.

**Targeted tests run against Practice, each with a real operation and an asserted audit-row (or explicit absence):** contact create (2 rows) and update (1 row); link create (3 rows) and change-primary (the exact `is_primary_contact: false → true` update, 1 row, confirmed distinct from the insert's own `null → false` row); `contact_methods` insert (4 rows) and update (the exact `value` change, 1 row, confirmed distinct from the insert's own row); a real transaction edit + void (3 rows: `amount`, `voided`, `voided_at`); a real period lock + reopen (2 rows: `status` both ways). Account isolation checked two ways: at the write level (a second test account's rows carried that account's own `account_id`, not the first account's), and at the read/write-authorization level (a simulated RLS session as the first account's real user: 0 rows visible or updatable for the second account's `contact_methods` row, versus a real, positive same-account access check in the identical session proving the simulation itself was genuine, not a false negative). All test rows (and their audit rows) were created under `ZMR-TEST-AUDITFIX`/`ZMR-TEST-CMAUDIT`-prefixed names/values and positively confirmed removed (zero remaining across every table touched) after testing.

**A separate bug was found while tracing this, fixed in the same migration, and its production impact has now been checked directly — correcting an earlier overstatement.** `20260925030000_contacts.sql`'s own rewrite of `audit_log_table_name_check` dropped `'financial_transactions'` and `'financial_periods'` from the allowed list (both added by earlier migrations, `20260911100000` and `20260911110000`) instead of extending it — a real regression, reproduced directly on Practice (inserted a real test transaction and voided it; the void failed before the fix, succeeded after).

**Production exposure — checked read-only, not inferred:** `supabase migration list` (compares local migration files against the linked production project's own migration ledger) shows every migration from `20260925010000` onward, including the offending `20260925030000`, has **no corresponding remote entry** — production has not received the contacts/ownership migration batch at all. Confirmed directly against production's live schema (read-only, via `supabase db query --linked`, the Management API — no database password handled or exposed): `audit_log_table_name_check`'s actual current definition on production is `CHECK (table_name = ANY (ARRAY['properties','llcs','mortgage_details','financial_transactions','financial_periods']))` — correct and complete — and its five `after update` audit triggers (`properties`, `llcs`, `mortgage_details`, `financial_transactions`, `financial_periods`) are exactly what's expected, with no `contacts`/`contact_methods`/`contact_links` tables or triggers present at all. **Production is not affected. An earlier report in this work log claimed this as an urgent, already-shipped production issue — that claim was wrong, based on Practice reproduction alone, and is corrected here.** The fix (already in `20260925100000`, Practice-only) will ship as part of this package's normal eventual release, not as a separate emergency patch.

## 2. Ownership ambiguity — one plain recommendation, not a raw column question

**The rule, in one sentence:** a legacy `Organization type` selection (`properties.llc_id`) is a *historical reference*, never treated as confirmed ownership, until either (a) the property's real ownership-interest data unambiguously resolves to that same single owner, or (b) the account owner explicitly confirms it via a dedicated action. Nothing here infers, backfills, or bulk-converts.

**Every consumer of `properties.llc_id` must treat it as authoritative *only* under case (a) below, and as a non-authoritative historical label otherwise** — this is not optional per-consumer judgment, it's the one rule every one of the four real consumers (`PropertyIdentityHeader.tsx:73`, `PropertyProfileHistoryTab.tsx:16`, `PropertyProfileOverviewTab.tsx:73,116`'s `FinancialAccountsSection` scoping, and Quick Capture's account grouping which depends on it) must implement:

| Case | What `property_ownership_interests` actually shows | `llc_id` treated as authoritative? | What the four consumers show |
|---|---|---|---|
| Zero owners | No rows at all | No | "No owner recorded" — plain, not an error |
| Legacy-only | No rows; `llc_id` set from before the ownership-interests system existed | **No — this is the case the recommendation is about** | "Ownership not yet confirmed (previously recorded as: *[entity name]*)" — read-only, with a **"Review ownership"** action available on the property's own Ownership box (owner-approved label, Sept 25 2026). Opening it shows the recorded association plainly, permits correcting it or adding multiple owners, and requires an explicit allocation-completeness assertion and a reason before saving — it never silently confirms and never defaults to 100% for a single entry. Saving creates one real, explicit `property_ownership_interests` row (via the existing `replace_property_ownership_interests`) — a human decision, every time, never automatic, never bulk. |
| One owner, allocation incomplete | One row, `allocation_status = 'incomplete'` | **No** — one entry with incomplete status is not proof of sole ownership (the exact case the handoff named: 48% incomplete could mean more owners are still being entered) | The one known owner, plus "additional owners may exist — allocation not yet marked complete" |
| Owner kind unresolved | One or more rows reference an `llcs` row with `owner_kind is null` | No (kind is unresolved, not just count) | "Owner type unresolved" — shown plainly, never guessed as individual or entity |
| 2+ current owners | 2+ rows | No | Every consumer shows/handles multiple owners explicitly — e.g. `FinancialAccountsSection` presents an owner/entity picker instead of silently scoping to one |
| Transition back to exactly one | Was 2+, now exactly 1 row remains, `allocation_status = 'complete'` | **Yes** — this is the only case `llc_id` may be set/updated, and it's driven by real interest data, not a legacy pointer | The one confirmed owner |

This table is the actual implementation contract for the four consumers — none of them may fall back to trusting `llc_id` in any row of this table except the last one. No consumer needs a fifth case invented; every property is in exactly one of these six states at read time.

**What this replaces from v2:** the earlier "one-time backfill: create a matching single ownership-interest row from the existing pointer" proposal is withdrawn. That was an automatic conversion of an unverified legacy association into confirmed ownership — precisely what's now ruled out. The Legacy-only row above is the corrected replacement: preserved, labeled, inspectable, and only ever promoted to real ownership by an explicit, individually-reasoned human action.

## 3. Contacts — unchanged from v2, still not owner identities

No schema change. `contacts`/`contact_methods`/`contact_links` are reusable communication records; ownership interests reference `llcs` (which already models both entities and people — `llcs.owner_kind: 'individual' | 'entity' | null`, `llcsQueries.ts:24`). The legacy-contact reconciliation flow — opened via the owner-approved **"Review saved contact details"** action (select/create a contact, explicit role and link, explicit confirmation of exactly what transfers, retained-not-cleared original value, idempotent retry, now-real audit coverage per §1) — is unchanged in mechanism from v2 and uses only existing, standard patterns already established for this system — no new product question is being re-asked here.

## 4. Layout, navigation, validation — unchanged from v2

Batch B's literal four steps (Ownership → Property basics → Documents (optional) → Review), in place inside the existing `/properties` registry route, no new pages or nav item. Acquisition and Building Details remain explicitly *not* wizard steps — `PropertyForm.tsx` already renders them and is already wired into Overview's existing "Property information" Edit section (`PropertyProfileOverviewTab.tsx:77-95`); nothing new is built for them. Address/city/state/zip required at step 2 (Q01); Name now genuinely optional (§1); ownership needs at least one entry with an explicit `allocation_status`, never inferred from percentage math.

## 5. Idempotent, account-scoped creation (corrected — the v2 mechanism didn't work)

**The bug in v2, stated precisely:** `insert ... on conflict (idempotency_key) do nothing returning property_id` returns **zero rows** whenever there's an actual conflict — `DO NOTHING` means no row is touched, and `RETURNING` only ever reflects rows the statement actually affected. A retry with a reused key would have gotten an empty result and no way to find the property it was retrying — the opposite of what idempotency is for.

**Corrected mechanism**, following the exact security precedent already established by `replace_property_ownership_interests` (`ownershipInterestsQueries.ts:213` / `20260925060000_ownership_interest_functions.sql:157-159`: `security definer` + an explicit `is_account_member()` check inside the function body, never trusting a caller-supplied id at face value):

```sql
create or replace function create_property_with_ownership(
  p_account_id uuid,
  p_idempotency_key uuid,
  p_property jsonb,        -- the property fields, same shape PropertyInput already sends
  p_ownership_entries jsonb,
  p_reason text,
  p_allocation_status text
)
returns uuid -- the property id, whether newly created or already-existing
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload_hash text := encode(digest(p_property::text || p_ownership_entries::text, 'sha256'), 'hex');
  v_request record;
  v_property_id uuid;
begin
  if not is_account_member(p_account_id) then
    raise exception 'Not authorized for this account.' using errcode = 'ZM002';
  end if;

  -- Reserve-or-fetch in one statement, so a retry always gets back a
  -- real row instead of nothing: DO UPDATE with a no-op self-assignment
  -- forces RETURNING to yield the existing row on conflict, which plain
  -- DO NOTHING can never do.
  insert into property_creation_requests (idempotency_key, account_id, payload_hash, property_id, created_at)
  values (p_idempotency_key, p_account_id, v_payload_hash, null, now())
  on conflict (idempotency_key) do update
    set idempotency_key = property_creation_requests.idempotency_key
  returning * into v_request;

  -- Keys cannot disclose another account's record: if this key was
  -- already reserved by a different account, this is either a UUID
  -- collision (astronomically unlikely) or a client bug/attempted probe
  -- — refuse without revealing anything about the other account's row.
  if v_request.account_id <> p_account_id then
    raise exception 'Not authorized for this account.' using errcode = 'ZM002';
  end if;

  if v_request.property_id is not null then
    -- Already fully completed by a prior call with this exact key.
    if v_request.payload_hash <> v_payload_hash then
      -- Same key, different payload — an explicit, named conflict, not
      -- a silent "use whichever version" choice.
      raise exception 'This request was already completed with different data. Start a new property instead of resubmitting changed data under the same request.' using errcode = 'ZM005';
    end if;
    return v_request.property_id;
  end if;

  if v_request.payload_hash <> v_payload_hash then
    raise exception 'This request is already in progress with different data.' using errcode = 'ZM005';
  end if;

  -- First real attempt for this key: create the property, then its
  -- first ownership interest, in the same transaction as everything
  -- above — atomic creation, not a claim, a property of using exactly
  -- one function call for all of it.
  insert into properties (account_id, name, address, city, state, zip, status /* ...rest of p_property */)
  select p_account_id, p_property->>'name', p_property->>'address', p_property->>'city', p_property->>'state', p_property->>'zip', coalesce(p_property->>'status', 'active')
  returning id into v_property_id;

  perform replace_property_ownership_interests(v_property_id, p_ownership_entries, p_reason, 0, p_allocation_status);

  update property_creation_requests set property_id = v_property_id where idempotency_key = p_idempotency_key;

  return v_property_id;
end;
$$;
```

(The property-field list above is illustrative — the real implementation inserts every `PropertyInput` column, same as today's `createProperty`.) A new small table backs this:

```sql
create table property_creation_requests (
  idempotency_key uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  payload_hash text not null,
  property_id uuid references properties(id),
  created_at timestamptz not null default now()
);
alter table property_creation_requests enable row level security;
create policy "members can see their own account's requests"
  on property_creation_requests for select using (is_account_member(account_id));
-- No client-facing insert/update policy: only the security-definer
-- function above writes this table, same pattern as
-- property_ownership_interests itself.
```

**What this resolves, explicitly:**
- *Account-scoped, not caller-trusted:* `is_account_member(p_account_id)` is checked before anything else, exactly like every other write function in this schema (`ownershipInterestsQueries.ts`'s functions) — a caller cannot supply someone else's `account_id` and have it accepted.
- *Same-key retries return the same completed property:* the reserve-or-fetch `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` always yields a real row, whether freshly reserved or already-completed, so a genuine retry (identical payload) returns the same `property_id` every time.
- *Concurrent requests with the same key:* the `property_creation_requests` row's primary key gives Postgres's own row-level locking for free — two simultaneous calls with the same key serialize on that `INSERT ... ON CONFLICT`, so only one can proceed to actually create the property; the second sees `property_id is not null` (if the first finished first) or blocks briefly and then sees it (if concurrent).
- *Changed payload under the same key is handled explicitly:* a hash mismatch raises a named, distinct error (`ZM005`) rather than silently picking either version.
- *Keys cannot disclose another account's record:* an `account_id` mismatch on the reserved row raises the same generic authorization error used everywhere else in this schema, never returning any detail about the other account's property.
- *Atomic reservation/property/ownership/audit:* everything happens inside one `plpgsql` function call, one implicit transaction — no partial state is ever visible from outside it.

## 6. Document/Storage recovery (corrected — client-only "uploads once" is not evidence of anything)

**The gap named in the handoff, confirmed real:** a client-side guarantee ("this file only gets uploaded once per selection") says nothing about what happens on a network timeout, a browser reload mid-upload, or the user re-selecting the same file after either. Without a server-side identity for each staged file, a retry can produce either a duplicate `documents` row or an orphaned Storage object with nothing pointing to it.

**Design:**
- Each file staged at the Documents step gets a client-generated `file_key` (a UUID) the moment it's selected, held alongside the `File` object in memory. The `file_key` — not a random value chosen at upload time — becomes the Storage object's own path segment: `${accountId}/properties/${idempotencyKey}/${file_key}-${originalFilename}`. Because the path is a deterministic function of (idempotency key, file key), re-running the exact same upload after a retry targets the exact same object, not a new one.
- The idempotency key and each staged file's `{file_key, name, size}` (not the `File` object itself, which cannot survive a reload) are mirrored into `sessionStorage` the moment they're chosen. On a reload mid-wizard, the wizard resumes into the *same* creation attempt (same idempotency key) instead of silently starting a new one, and shows "You had selected: invoice.pdf (142 KB) — please re-attach it" for any file whose `File` object was lost to the reload — the user re-selects the actual bytes, the system re-uses the same `file_key`/path, and does not treat it as a new, sixth file.
- Upload sequencing, after `create_property_with_ownership` returns a real `property_id` (§5): for each staged file, first check whether a `documents` row already exists for that exact `storage_path` (a plain `select` scoped by `account_id`) — if one does, this file was already fully uploaded and linked by a previous attempt; skip it. If not, upload to Storage, then insert the `documents` row, then insert its `property_id`/document-owner link, in that order — the same three-step, independently-erroring sequence already used by `documentsQueries.ts:uploadEntityDocument` and Quick Capture's own submit flow (`useCaptureForm.ts:384-483`), not an invented mechanism.
- **Tested failure boundaries, each independently:**
  - *Storage upload itself fails* (network drop): no `documents` row is created; a retry re-uploads to the same deterministic path (overwriting a possible partial object, which Supabase Storage's own upload semantics already handle safely — a failed/partial upload is never a complete object at that key).
  - *Document row insert fails after a successful Storage upload*: the file now exists in Storage with nothing pointing to it yet. A retry's "does a documents row already exist for this path" check correctly says no, so it inserts the missing row — the file itself is never re-uploaded, since the deterministic path already holds it and the insert step doesn't depend on re-uploading.
  - *Owner-link insert fails after a successful document-row insert*: same shape as the existing, already-shipped behavior in `uploadEntityDocument` — the document row is real, just not yet linked; a retry's per-file check sees the row exists and completes only the missing link step, rather than creating a second document row for the same file.
- **Cleanup, verified-safe only:** an orphaned Storage object (uploaded, but no `documents` row ever completed for it — e.g. the user abandoned the wizard entirely after a partial upload) is only ever deleted by a process that (a) lists objects under the account's own `${accountId}/properties/` prefix, (b) confirms no `documents.storage_path` references that exact key, and (c) confirms the object is older than a fixed grace period (24 hours, chosen so an upload that's still genuinely in progress is never mistaken for abandoned) — never a blind delete based on naming pattern or age alone. This reuses the same "list, cross-check, then act" shape already implied by `getAccountStorageUsage` (`documentsQueries.ts`), not a new class of destructive operation.
- **No duplicate saved property from an upload retry:** by construction — the property is created exactly once by §5's idempotency mechanism, before any upload begins; every retry of the Documents step operates against the already-existing `property_id`, never re-running property creation.

## 7. Permissions

Unchanged: every query stays `account_id`-scoped via RLS or an explicit `is_account_member()` check inside a `security definer` function (§5, §6) — no new role or tier introduced anywhere in this package.

## 8. Scope, stated plainly (corrected — do not let "editable" imply "fully built")

- Acquisition (`purchase_price`/`purchase_date`/`purchase_method`) and Building Details fields are editable today through `PropertyForm.tsx`, reused by Overview's Edit section. **This is not the same as Batch C's full approved scope** — reusable acquisition *contacts* (a role-linked person for the purchase, separate from the generic Ownership contacts) and dedicated closing-*document* grouping (a labeled "Closing documents" collection distinct from the generic Documents area) are **not built**, and Package 1 does not build them. They remain queued, unchanged status from the backlog matrix.
- Overview's specialist-section grouping (Batch E/R's placement decisions) is unaffected by this package — Package 1 only touches creation and the four consumers named in §2, not how Overview's boxes are arranged.
- No migration in this package touches Insurance, Financial accounts, Property tax, or Market/rent tables.

## 9. Acceptance evidence required before this package is marked done

- Empty-account case: a brand-new account completes all 4 steps with no ZMR-specific assumption.
- Existing-record case: a property with legacy `owner_name`/`contact_phone`/`contact_email` and a legacy-only `llc_id` (no ownership-interest row) opens correctly, shows "Ownership not yet confirmed (previously recorded as: X)," and is a valid target for both the contact-reconciliation action and the explicit ownership-confirmation action — neither crashes, neither loses data, neither happens automatically.
- All six §2 ownership-ambiguity cases, each individually re-verified against each of the four real `llc_id` consumers — not assumed consistent from one case tested.
- Idempotency: same key + same payload (genuine retry) returns the same property twice, not two properties; same key + changed payload raises the named `ZM005` conflict; a key belonging to a different account is refused without disclosing anything about that account's data.
- Upload recovery: a 3-file Documents step with a forced failure at each of the three boundaries named in §6, individually, each confirmed to leave the correct recoverable state and no duplicate property.
- Full pass in Practice (real Supabase, real dashboard UI) — the same evidence standard every prior batch this session used.

## 10. Migration and release dependencies

New migrations already written and verified against Practice this pass:
1. `20260925090000_properties_name_nullable.sql` — applied, verified.
2. `20260925100000_audit_trail_contacts.sql` — applied, verified; also fixes the pre-existing `financial_transactions`/`financial_periods` constraint regression (§1). **Confirmed, read-only, not applied to production, and production confirmed unaffected by the regression it fixes** — see §1.
3. `20260925110000_contact_links_audit_update_fix.sql` — forward-fix for a regression `20260925100000` itself introduced (lost `contact_links` UPDATE audit coverage); applied and verified against Practice. Also Practice-only.
4. `20260925120000_contact_methods_audit_update_fix.sql` — same cause, second table (`contact_methods`); applied and verified against Practice. Also Practice-only.

New migrations still to be written (not yet applied anywhere):
5. `create_property_with_ownership` function + `property_creation_requests` table (§5).
6. `properties.legacy_contact_reconciled_at` nullable timestamp column (§3, unchanged from v2).

No migration in this package touches `property_ownership_interests` schema, or any Insurance/Financials/Tax table. Release gate unchanged: Practice verification against §9, the separate S3 visual-approval gate for any layout change, then a scoped production release proposal — no production deploy or migration is authorized by this document. All four applied migrations above are Practice-only and will ship with this package's own eventual, separately-approved release — none is a standalone emergency patch, since production was confirmed unaffected.

## 10a. Owner-facing wording — approved September 25, 2026

The exact action labels **"Review ownership"** (§2's legacy/unconfirmed-ownership case) and **"Review saved contact details"** (§3's legacy-contact action) are approved. Both open a review before anything saves; neither silently confirms ownership nor replaces original information — that behavior is unchanged from the mechanism §2/§3 already specify, and approving the wording did not by itself approve any new behavior beyond it. Applied in this revision to every place this contract names the action, and to the S3/creation-flow visuals (§13).

## 11. Dependency-ordered packages after this one (unchanged from v2)

Package 2 (Insurance O2–O7), Package 3 (Financial accounts N), Package 4 (Property tax P), Package 5 (Market/rent Q), Package 6 (Capture/History J–M) — boundaries only, unchanged.

## 12. Concise readiness checklist

| Item | State | Evidence |
|---|---|---|
| Name nullable, all consumers updated | Done, verified | Migration applied + build/lint/test clean; live insert with `name = null` verified on Practice |
| Contacts/methods/links INSERT audit coverage | Done, verified | Migration applied; live test insert produced real audit rows on Practice |
| `financial_transactions`/`financial_periods` audit-constraint regression | Found and fixed in Practice | Live constraint read before/after; live void-transaction test failed before the fix, succeeded after |
| **Production impact of that regression** | **Unaffected — confirmed, not inferred** | `supabase migration list`: no Sept-25 migration has reached production; `supabase db query --linked` (read-only, Management API, no password handled): production's constraint already correctly includes both tables, its five triggers are exactly as expected, no contacts/methods/links tables exist there at all |
| `contact_links` UPDATE-audit regression (introduced by this session's own prior fix) | Found and fixed with a forward migration | Live trigger list before/after; targeted create/update/link/change-primary/contact-method/transaction/period tests, each asserting the expected audit row or its confirmed absence; all test data verified removed after |
| `contact_methods` UPDATE-audit regression (same prior fix, same cause) | Found and fixed with a second forward migration — "no current UI update path" was not a valid reason to drop coverage the original migration deliberately provided | Live trigger list before/after; targeted insert+update test, exact-value assertion (not just a count); cross-account denial confirmed via a simulated second-user RLS session (0 rows visible/updatable), with a same-account positive-access sanity check proving the simulation itself was real |
| `llc_id` ambiguity | Resolved to one plain rule (§2), no auto-backfill | — |
| Idempotency mechanism | Corrected, account-scoped, handles concurrent/changed-payload cases | Design only — not yet implemented (needs the function + table in §10 item 4) |
| Upload/Storage recovery | Concrete, testable design against real failure boundaries | Design only — not yet implemented |
| Insurance Edit width | **Implemented locally; verified in Practice; not deployed**, responsive (not fixed on phones) | §14; verified live at 960px/700px/390px, no overflow at any |
| Owner-facing labels ("Review ownership", "Review saved contact details") | **Approved and applied** everywhere this contract and the visuals name the action | §10a |
| Scope honesty (Acquisition contacts, closing docs, Overview grouping) | Explicitly stated as out of scope | §8 |
| S3 / creation-flow visual-approval gate | Still open | §13 |
| Production changes | None made | All four applied migrations are Practice-only |

**Genuinely unresolved product choices (only this remains):**
1. Final visual approval of the property-creation four-step flow and the post-create grouped Edit form (§13) — the two-column direction, the Insurance width, and both action labels are already approved; what's left is sign-off on the actual assembled screens themselves, not any further wording or mechanism question.

## 13. Visuals (this pass)

All captured live from the real running harness and tracked at
`docs/planning/ownership-property/visuals/` (see that folder's own
README for what each file shows in detail):

- **Insurance Edit form, implemented locally, verified in Practice, not deployed**: `insurance-implemented-wide-960.jpg` / `-intermediate-700.jpg` / `-narrow-390.jpg` — confirms the responsive width at three real viewport sizes, not just the wide case, with no horizontal overflow at any of them (checked via `scrollWidth`/`clientWidth`, not eyeballed).
- **S3 grouped Edit form, updated for the approved labels**: `s3-updated-desktop-identity-contacts.jpg`, `s3-updated-mobile-identity.jpg`, `s3-updated-mobile-review-contact-button.jpg` — Name no longer required, flat contact fields replaced by "Review saved contact details."
- **Property-creation four-step flow, new this pass**: `creation-flow-step1-ownership.jpg` through `-step4-review.jpg` (desktop), `creation-flow-mobile-step1.jpg` (390px) — the separate flow this contract's §4 describes, distinct from the grouped Edit form above.

Not yet approved: the assembled screens themselves (layout, exact copy in context, the creation-flow step indicator's mobile treatment, which the visuals README flags as a rough first pass worth a specific look).

## 14. Insurance Edit width — implemented locally, verified in Practice, not deployed

`.insurance-policy-form { max-width: 960px }` (`src/index.css`), scoped
to this one class — verified as the form's sole real-world consumer
before adding the rule, so no other form in the app is affected. A
max-width, not a fixed width: confirmed live at 1400px (960px reached),
700px (578px, two-column `.field-group-row` reflow engaged), and 390px
(268px, single column) — all three with `document.documentElement.
scrollWidth === clientWidth`, i.e. no horizontal page overflow at any of
them. Every existing field, value, validation rule, and the upload/
document/view/Edit/Save/Cancel behavior are all unchanged — only the
form's own width rule was touched. Documented in `DESIGN-SYSTEM.md`.

## 15. Completion status — September 28, 2026 (corrects §12's "design only" rows)

§12's table above was written before implementation and is now stale on
two rows specifically — left in place as the historical readiness
snapshot, corrected here rather than edited in place:

| Item | §12's claim | Actual state now | Evidence |
|---|---|---|---|
| Idempotency mechanism | "Design only — not yet implemented" | **Implemented and tested against real Practice**, not just unit-reasoned | `create_property_with_ownership` (migration `20260928020000`), SQL-tested directly: empty-account creation, inline-new-owner creation, genuine retry (same key+payload → identical property, zero duplicates), changed-payload retry (`ZM005`), cross-account key reuse (`ZM002`, nothing disclosed), true concurrency (two simultaneous calls, same new key → one property, one new owner) |
| Upload/Storage recovery | "Design only — not yet implemented" | **Implemented and fault-injection-tested against real Practice**, not just designed | Real document upload through the live wizard, with actual injected failures (via a test-only `window.fetch` intercept in the browser session — never a code-level switch in the shipped app) at two of the three named boundaries: Storage upload itself, and the documents-row insert. Both: property never duplicated, successful file(s) retained, failed file recovered correctly on retry (same deterministic Storage path re-used, no duplicate Storage object, no duplicate documents row), final state verified in Postgres. A real reload-mid-wizard → re-attach → Save cycle was also exercised live, end to end. The third boundary (owner-link insert) is code-reviewed against the identical check-before-insert pattern, not independently fault-injected this pass. |
| Existing-contact reconciliation | Not in §12 (added after) | **Implemented and tested against real Practice, including a real bug found and fixed** | "Link to an existing contact" tested with a property's genuinely *persisted* (saved, not just typed) legacy owner_name/contact_phone/contact_email: the contact's own pre-existing method was preserved untouched, the two new methods were added correctly, and the legacy fields on `properties` were confirmed byte-for-byte unchanged after. A real retry-duplication bug was found live (confirming the completion handoff's own suspicion) and fixed: `findContactLinkForScope`/`findContactMethodByValue` now guard both inserts, re-verified live afterward with zero duplicates. Cross-account `contact_id` denial confirmed directly at the database level (`trg_contact_links_same_account`), not just inferred from the UI's own account-scoped picker. |
| Quick Capture ownership-authority consumer (contract §2's 4th named consumer) | Not in §12 (added after) | **Implemented and tested against real Practice** | `useCaptureForm.ts`/`CaptureEntryDetailsForm.tsx` resolve ownership authority fresh (not from a cached/legacy pointer) before scoping the Financial-account picker's "Shared accounts" group. Live-tested: a legacy-only unconfirmed property correctly hides the shared account; the same LLC with `owner_kind` still unresolved also correctly hides it (never guessed); the same LLC once `owner_kind` and allocation are both resolved correctly shows it. |
| Direct-creation bypass (`usePropertyRegistry.ts`) | Not in §12 (added after) | **Confirmed unreachable through the real UI and removed**, not just left in place | `PropertyRegistry.tsx` never renders the old create-via-`PropertyForm` path anymore (the wizard replaced it); the dead branch calling `createProperty` directly (no idempotency, no ownership) was deleted from `usePropertyRegistry.save()` and replaced with an explicit refusal if ever called without a property selected — creation can only happen through `create_property_with_ownership` now, by construction. |
| New-owner `owner_kind` resolution | Not in §12 (added after) | **No new feature needed — verified live using the existing Entity Profile edit flow** | A test LLC created with `owner_kind = null` (the wizard's own inline-new-owner default, per the no-guess policy) was opened at its real Entity Profile, its existing "not yet confirmed" Identity field was set to a real value through the UI, and the save was confirmed in Postgres. |

**What remains genuinely open:** production release (separately gated,
unchanged); the third upload-recovery boundary (owner-link insert)
fault-injected live rather than code-reviewed only; the reconciliation
modal's "create new contact" path made idempotent against its own retry
(only "link to existing" was fixed and re-verified — "create new"
retried twice would still create two contacts, a smaller and disclosed
gap); Quick Capture's own repeated-entity/shared-account case verified
only via the shared unit-tested resolver, not a second live UI pass
(the underlying per-property queries are identical to the live-tested
single-property case, so this is judged low-risk, not zero-risk).
OWN-I2's roadmap checkbox remains unchecked — see the approval register
and work log for the exact reasoning.

## 16. Release-readiness corrections — September 29, 2026 (corrects §15's remaining-gaps list and its migration-safety claims)

Continuation from `85f54d9`, per `ZMR-package-1-release-readiness-corrections.txt`. §15 disclosed five gaps; this pass closes the first four with real fixes and Practice evidence (not report wording alone), and corrects an overstated migration-safety claim made in this session's own prior report.

**1. Reconciliation atomicity/retry-safety (both paths), error handling, retained state.**
Root cause: the modal did several separate client-side Supabase calls (create/find contact, find-or-create link, find-or-create each method, mark reconciled), several of which had their errors silently ignored, `done` was set unconditionally, and only "link existing" had any retry guard — "create new" had none, confirmed still duplicating.

Fix: a new atomic, idempotency-keyed RPC, `reconcile_legacy_contact` (migration `20260929010000`, mirrors `create_property_with_ownership`'s reserve-or-fetch pattern in a `legacy_contact_reconciliation_requests` table). The entire operation — resolve/create the contact, resolve/create the link, resolve/create each method, mark the property reconciled, mark the request complete — runs inside this one function, i.e. one Postgres transaction, for both "existing" and "new" modes alike. `ReviewSavedContactDetailsModal.tsx` now makes exactly one call; `done` is set only on that call's own success, and any error leaves every field exactly as entered, retryable from the same state. The idempotency key is generated once per modal mount (`useState(() => crypto.randomUUID())`), so a same-attempt retry (including two overlapping Confirm clicks) always carries the same key.

Live-tested against Practice with genuinely persisted legacy fixtures (`ZMR-TEST-RECONCILE-*`, all removed and positively re-verified after):
- Happy path, "create new" mode: contact + link (with role) + both methods created, `legacy_contact_reconciled_at` set — all in one transaction.
- **Two simultaneous confirmations**: two parallel `psql` sessions called the RPC with the identical idempotency key at the same time (real concurrency, not simulated sequentially). Both returned the same `contact_id`; exactly one contact, one link, two methods exist — the second call's `INSERT ... ON CONFLICT` blocked on the first's row lock and took the fast path, never re-executing the writes.
- **Lost response**: `window.fetch` was patched (browser-session-only, never shipped) to let the real RPC request reach the server and commit, then throw before the response reached the client. The client correctly showed an error and stayed on the form (not `done`); server-side, the contact/link/methods/reconciled-flag had all actually committed. Clicking Confirm again (same key) hit the fast path and returned the same `contact_id` with zero duplication — this is the exact "new-contact retries still duplicate contacts" bug from the work log, now fixed and reproduced-then-fixed live, not just reasoned about.
- **Preservation**: a later `existing`-mode call against the same contact with a different role and a different (but not identical) phone value left the original role and phone untouched and added the new phone as an additional method — no update-in-place, no destructive uniqueness constraint.
- **RLS/authorization**: a second Practice account's real user, authenticated via a simulated RLS session, was rejected both when passing the other account's `account_id` directly (`Not authorized for this account`) and when passing its own `account_id` with the first account's `property_id` (`Property not found for this account`); the same user's `select` against `legacy_contact_reconciliation_requests` returned zero rows for the first account's requests, versus the correct row count for its own account's real user, confirming the simulation itself was genuine.
- **Event history**: contrary to this contract's own §1 note (which described the audit triggers as "after update" only, current as of Sept 25), `contacts_audit_log`/`contact_links_audit_log`/`contact_methods_audit_log` are now `AFTER INSERT OR UPDATE` on Practice (fixed by one of the four Sept-25 audit-coverage migrations, after §1 was written) — a full audit trail (contact create, link create with its role, both method creates, and the property's own `legacy_contact_reconciled_at` update) was confirmed present for the reconciliation created above. §1's "fires on UPDATE only" line is now stale for these three tables specifically; not corrected in place there, corrected here.

**Not empirically tested this pass, and why:** "partial failure after contact creation" (a failure between the contact insert and a later step, inside the same call) was to be verified by temporarily adding a throwaway `CHECK` constraint to force a late-step failure on Practice; the sandbox's own safety classifier refused the `ALTER TABLE` as a shared-resource modification, and per this session's standing instructions that refusal was respected rather than worked around. This property is instead a direct consequence of Postgres's transaction semantics (an unhandled exception in a plpgsql function rolls back everything the same call did, including the reservation-table insert at the top) — a documented DB guarantee, not a claim specific to this code, but genuinely not empirically fault-injected here. Flagged rather than silently assumed.

**2. `document_owner_links` fault boundary and inline-created-owner document links.**
Root cause: `usePropertyCreationWizard.ts`'s `save()` computed the owner ids to link documents to from the client's own `wizardEntries` list, filtered to entries that already had a real `ownerId` — a brand-new inline-created owner's id is minted server-side inside `create_property_with_ownership` and was never in that list, so its documents' links were never created by any code path (a comment asserted this was "completed by the property's own Documents tab afterward," which no code actually implemented).

Fix: after `createPropertyWithOwnership` succeeds, `save()` now calls `listPropertyOwnershipInterests(accountId, propertyId)` and links every file to every id it returns — the property's own real, server-confirmed current owners, existing and newly-minted alike, since that's the same row `replace_property_ownership_interests` wrote inside the same transaction as the property itself. The Review step now states in plain text which owners each staged document will be linked to (`PropertyCreationReviewStep.tsx`), making the existing implicit "link every document to every current owner" behavior visible rather than silent, short of building a per-file owner-selection UI (judged out of scope for this pass — no existing product decision asked for one, and adding it would be new scope, not a correction).

Live-tested against Practice: a two-owner property (one pre-existing owner, one brand-new inline owner) with two staged documents saved cleanly — direct query confirmed all 4 expected `document_owner_links` rows (2 files × 2 owners), including the new owner, closing the gap directly. Fault-injected the link boundary itself (a `window.fetch` patch failing the 2nd of 4 `document_owner_links` POSTs, browser-session-only): the affected file correctly showed "Failed — will retry on Save" (not "Uploaded"), the wizard did not navigate away, and Postgres showed exactly 3 of the 4 expected links (the multi-owner one-success/one-failure case). Removing the fault and retrying (after a genuine page reload and file re-attach, exercising the real resumability path) completed the missing link with no duplicate property, documents, or links — verified directly in Postgres before and after.

**3. Six-state × four-consumer evidence matrix.**
Prior state: 3 of 6 ownership-authority states live-verified, only for Quick Capture (§15's row 4). This pass reused that evidence and added the missing cells:

| State | PropertyIdentityHeader (Organization type) | PropertyProfileHistoryTab | FinancialAccountsSection | Quick Capture |
|---|---|---|---|---|
| None | Live: "No owner recorded" | Not independently re-verified this pass (code-identical wiring to the tested cases below) | Code-verified: `authoritativeLlcId` is null by construction | Live: real LLC's real financial account correctly absent ("No matches") |
| Legacy-only | Live: "Ownership not yet confirmed (previously recorded as: …)" | Not independently re-verified this pass | Code-verified | Live-verified previously (§15) |
| One-incomplete | Live: "[Owner] — additional owners may exist, allocation not yet marked complete" | Not independently re-verified this pass | Code-verified | Live: real LLC's real financial account correctly absent |
| Kind-unresolved | Live: "Owner type unresolved" | Not independently re-verified this pass | Code-verified | Live-verified previously (§15) |
| Multiple | Live: "Multiple owners — see Ownership section below" | **Live**: expanded History showed only the property's own 4 audit rows, correctly excluding the (non-authoritative) LLC's own audit history | Code-verified; also live-confirmed absent even though the property is directly linked to the LLC that owns the real account (the strongest case — proves the picker isn't naively scoping by "any linked LLC") | Live: same LLC's real financial account correctly absent even on this directly-linked property |
| Transitioned-to-one | Live: "[Owner]" plain, no hedge | Not independently re-verified this pass | Code-verified | Live-verified previously (§15) |

"Code-verified" means: `PropertyProfileOverviewTab.tsx`'s `FinancialAccountsSection` receives exactly `ownershipAuthority.authoritative ? ownershipAuthority.llcId : null` as its `llcId` prop, and `resolveOwnershipAuthority`'s 6-state output is covered by 13 passing unit tests (`ownershipInterestsQueries.test.ts`) — not a live click through the Financial-accounts Edit UI this pass. `PropertyProfileHistoryTab.tsx`'s own multiple-state cell is live-verified above; the other five states use the identical `authoritativeLlcId` wiring as the Overview tab (same computed value, read once), not independently re-clicked through per-state.

New fixtures used, all `ZMR-TEST-`-prefixed, created and removed within this session (see cleanup note below); `properties.name`, `owner_kind` on the one pre-existing LLC touched (`c682e99c…`, "ZMR-TEST-PRACTICE Owner A") was reverted to its original `null` after use, not deleted. One `llc_id` was set directly via SQL update (not through the wizard) to construct the `legacy_only` fixture, since no current UI path creates a property with that legacy pointer set and zero ownership-interest rows — the shape predates this system.

Multi-property selection and refresh-on-open (an explicit ask in the corrections) were exercised as part of the Quick Capture pass above: the Payment-method picker was re-opened after switching the Property field between four different properties in the same mounted form, without a reload, and correctly reflected each property's own scoping every time — this is the same mechanism the cross-module-data-freshness rule requires, confirmed working, not just assumed from the code.

**4. Production release manifest — read-only verified, not guessed.**
`supabase migration list` (compares local files against production's own remote ledger) confirms production's last applied migration is `20260924060000`; every migration from `20260925010000` through this pass's own `20260929010000` — 14 files — shows no remote entry. `supabase db query --linked` (read-only, Management API, no database password ever handled) directly confirmed on production's live schema: `contacts`, `contact_methods`, `contact_links`, `property_ownership_interests`, `llc_membership_interests`, `document_owner_links`, `property_creation_requests`, and `legacy_contact_reconciliation_requests` do not exist; `properties.name` is still `NOT NULL`; no `updated_at`-maintaining trigger exists on `properties` yet (only `properties_audit_log` and `properties_create_default_unit`); the `extensions.digest` function (pgcrypto) that two of the new RPCs depend on is already present. This confirms and extends the prior report's read-only finding — production genuinely has none of the Sept-25-forward foundation, not just the two migrations the prior release proposal named.

**Ordered list of the 14 missing migrations** (filename order is dependency order here — each only references objects the earlier ones in this same list create; no reordering needed):

1. `20260925010000_llcs_entity_profile_fields.sql` — adds `llcs.owner_kind` and related entity-profile columns; prerequisite for every ownership-interest migration below.
2. `20260925020000_llc_tax_elections.sql` — new table, no dependents in this list beyond itself.
3. `20260925030000_contacts.sql` — new `contacts`/`contact_methods`/`contact_links` tables; also rewrites `audit_log_table_name_check` (must extend, not replace, the existing check — see the known regression note in §1, already fixed forward by #10–11 below, but the raw file itself reproduces the original mistake if applied in isolation and read alone).
4. `20260925040000_document_owner_links.sql` — new table, depends on `documents` and `llcs` (both already on production).
5. `20260925050000_ownership_interests.sql` — new `property_ownership_interests`/`llc_membership_interests`/version tables; depends on `llcs.owner_kind` (#1).
6. `20260925060000_ownership_interest_functions.sql` — `replace_property_ownership_interests` and related functions; depends on #5.
7. `20260925070000_cross_account_integrity.sql` — triggers on `contact_links`/`contact_methods`/`document_owner_links`/others; depends on #3, #4, #5.
8. `20260925080000_properties_set_updated_at.sql` — adds the missing `updated_at`-maintaining trigger on `properties` (confirmed absent on production above); the app's own optimistic-concurrency check (`usePropertyRegistry.ts`/`usePropertyProfile`'s stale-edit guard) already assumes this trigger exists — **this is a real old/new compatibility gap, not just an additive nicety**: deploying the current frontend against production before this migration runs would silently disable that conflict detection.
9. `20260925090000_properties_name_nullable.sql` — drops `properties.name`'s `NOT NULL` (confirmed still present on production above); a pure relaxation, safe regardless of order relative to the rest, but grouped here for completeness.
10. `20260925100000_audit_trail_contacts.sql` — extends audit coverage to the new tables; depends on #3.
11. `20260925110000_contact_links_audit_update_fix.sql` — depends on #3, #10.
12. `20260925120000_contact_methods_audit_update_fix.sql` — depends on #3, #10.
13. `20260928010000_legacy_contact_reconciled_at.sql` — adds `properties.legacy_contact_reconciled_at`; no dependents besides #14/#15.
14. `20260928020000_create_property_with_ownership.sql` — the property-creation RPC; depends on #1, #5, #6.
15. `20260929010000_reconcile_legacy_contact.sql` (this pass) — the reconciliation RPC; depends on #3, #13.

(15 items — the corrections text estimated "14"; the discrepancy is this pass's own new migration, #15, which did not exist when the corrections were written.)

**Correcting this session's own prior overstatement:** an earlier report in this work log described the pending migrations as "idempotent" and carrying "no data loss risk." That claim conflated two different things. `create_property_with_ownership`'s own reserve-or-fetch pattern makes repeated *calls to that RPC* safe to retry — it says nothing about whether the *migration file that creates the RPC* is safe to run twice. It is not, in the ordinary sense: `create table`/`create policy`/`alter table ... add column` all fail on a second run against a database that already has them (Postgres migrations are typically applied via `create or replace function` where re-runnable, but the table/column/policy DDL in this batch is not). What actually makes this batch safe is narrower and more accurate to state plainly: (a) `supabase db push` tracks which migrations a given database has already applied and only runs the ones it hasn't — this is the tool's own bookkeeping, not a property of the SQL files themselves; (b) every statement in all 15 files is additive (new tables, new columns, new functions, new triggers, one dropped `NOT NULL`, one extended `CHECK`) — nothing drops a table, drops a column, or narrows an existing constraint against data that might already violate it; (c) production has zero existing rows in any of the new tables (they don't exist yet), so there is no pre-existing data to validate against a new constraint. "No data loss risk" is accurate for this specific batch under these specific conditions (additive-only, applied via the tracked push mechanism, no narrowing constraints) — it is not a general property of "idempotent" migrations, and should not be stated as one again without re-deriving it for whatever the next batch actually contains.

**5. Restore/recovery and release sequence — a concrete proposal, not yet approved for live use.**
- **Rehearsal**: Practice already received exactly these 15 migrations, in this order, via `supabase db push` — the identical mechanism the production push would use. This pass is itself the rehearsal, not a separate additional step; re-running it fresh against a newly-reset Practice database before the real production push (a true from-empty rehearsal) is the one additional step recommended if a from-zero proof is wanted, since current Practice was built up incrementally across sessions, not in one clean pass.
- **Old/new client compatibility**: every migration is additive except the `NOT NULL` relaxation and the extended `CHECK` constraint, both of which are compatible with the currently-deployed (pre-Package-1) frontend as-is. The one real sequencing constraint: **migrations must be applied before the new frontend is deployed, never after** — the new frontend calls `create_property_with_ownership`/`reconcile_legacy_contact` and queries `contacts`/`property_ownership_interests` directly; deployed against pre-migration production it would fail outright on every Package-1 screen. The currently-deployed frontend has no code path that depends on any object these migrations add, so it is unaffected by the migrations running first and sitting there unused for however long the frontend deploy is separately gated behind visual/product approval.
- **Data validation before constraints**: not applicable to this specific batch — no existing production row is being validated against a new constraint (see point (c) above); flagged here as the step to actually perform on some future batch that does narrow a constraint or add a `NOT NULL` to a populated table, not skipped as a general practice.
- **What this is not**: this is a proposal to review, not an executed or authorized production change. No production writes, migrations, or deploys were made this pass, consistent with the corrections' own instruction.

**Verification run this pass:** `npm run build` (real `tsc -b` type-check, not the bare `tsc --noEmit` this repo's CLAUDE.md flags as non-verifying), `npm run lint`, `npm test` all clean on the changed files; all new SQL applied to and tested against Practice only, per usual; a clean-clone build (fresh `git clone` + `npm install` + `npm run build`) was run before this pass's commit, per the multi-terminal Definition-of-Done rule.

**Test data used and removed:** six `ZMR-TEST-`-prefixed properties, two `ZMR-TEST-`-prefixed LLCs, three `ZMR-TEST-`-prefixed contacts, one `ZMR-TEST-`-prefixed financial account, and four uploaded test files, all created during this pass's live verification and all confirmed deleted afterward by direct re-query (zero remaining, not just "reported cleaned"); the one pre-existing LLC touched had its edited field (`owner_kind`) reverted to its original `null`, not deleted, per the pre-existing-record rule. Three storage objects from earlier, unrelated sessions were found alongside the ones being cleaned and deliberately left untouched, since they predate and are outside this pass's own test data.

**What remains genuinely open after this pass:**
- "Partial failure after contact creation" is a proven-by-construction (Postgres transaction semantics) rather than empirically fault-injected property of `reconcile_legacy_contact`, for the sandbox-permission reason stated above.
- `PropertyProfileHistoryTab.tsx` and `FinancialAccountsSection`'s own Edit-mode UI were not independently re-clicked through for the `none`/`legacy_only`/`one_incomplete`/`kind_unresolved`/`transitioned_to_one` states this pass — covered by identical-wiring code tracing plus unit tests, not a fresh live pass per state per consumer.
- No per-file document-owner-selection UI exists (every staged document links to every current owner, now visibly stated on Review rather than silently done) — flagged as a possible future product decision, not built this pass; out of scope unless separately approved.
- Production remains fully unmigrated and undeployed — this section is a release-readiness proposal for owner review, not a completed release.
- A separate, queued addendum (`ZMR-next-handoff-learning-and-verification.txt`, dated September 28 2026) exists for the *next* terminal covering historical-bookkeeping readiness and other tracks; it explicitly asks to keep this run uninterrupted and was not acted on here.

## 17. Focused corrections, round two — September 29, 2026 (addendum's Part 1)

Continuation from `d66c3f6`, incorporating the queued addendum above. No production changes, no real business data entered, no settled layout reopened.

**1. Owner-approved document-linking requirement — actually built this time.** §16's "visible confirmation" text was a partial fix at best — the owner's real, previously-stated request was *control* over where a document attaches, not a clearer explanation of an unconditional link-to-everyone default. Root cause: `uploadStagedDocuments` never had a concept of a file having its own owner selection; it received one flat `ownerIds` list for the whole batch.

Fixed with a proper per-file selection, not a wizard rebuild:
- `OwnershipDraftEntry` now carries a stable `rowKey` (generated once per row, survives reorders/reloads); `StagedFileMeta`/`StagedFile` now carry `linkedOwnerRowKeys: string[]`, empty by default — a newly-staged file is property-only until the user checks a specific owner. A pre-existing sessionStorage draft missing these fields is backfilled on load, not discarded.
- The Documents step (`PropertyCreationDocumentsStep.tsx`) gained one checkbox per current ownership row, per file, using the existing field/label/checkbox conventions already used elsewhere in this step (no new component). Unchecking every box returns a file to property-only.
- The Review step now shows each file's own resolved link list (or "Property only"), not a single blanket line.
- `save()` resolves each rowKey to a real `llc_id` from the property's own committed ownership interests: an `existing`-mode row resolves directly (its `ownerId` already is the real id); a `new`-mode row correlates by the exact name it submitted, among interests not already claimed by an existing row's id — never expanding to "every current owner" as a fallback. Two new rows sharing the identical trimmed name are a genuine, disclosed ambiguity: **both**, not just the second, are left unresolved (resolving one by elimination would be a guess wearing a correlation's clothes) — a file that selected one of those specific rows surfaces a clear, actionable error instead of linking silently to the wrong owner or to nobody.
- Removing an ownership row now also strips that row's key from every staged file's own selection, so a file never keeps pointing at a row that no longer exists.

**Verification — two tiers, disclosed as such:** the Chrome extension this session's browser tooling depends on was disconnected for this entire pass (confirmed repeatedly, not a one-off), so the Documents-step checkboxes and the Review-step per-file summary were code-reviewed against this step's own established conventions and against the already-passing unit suite (85 tests — the fresh `propertyCreationDraft.test.ts` backfill case included — build/lint/test all clean), but **not re-driven through the live browser UI this pass**, unlike §16's own document-boundary work. The `save()`-time resolution algorithm itself — the part with real risk (correctly identifying which real, server-minted id a client-side selection actually maps to) — **was** verified live, directly against Practice, via a standalone script exercising the exact same RPC/table calls and the exact same resolution logic `usePropertyCreationWizard.ts` runs (mirrored line-for-line, not approximated): an existing-mode selection resolved to its own id; a new-mode selection resolved to the real, server-minted id from the committed creation result; property-only produced zero links; a selected-owner file linked to exactly that owner and no other; an inline-new-owner file linked to exactly the new owner; a deliberately-broken link attempt left the other, successful link undisturbed and a retry completed the missing one without duplicating; and the duplicate-name collision case left both colliding rows unresolved, confirmed empty of any guessed mapping. All test data (`ZMR-TEST-DOCLINK`-prefixed) removed and re-verified gone — including a real, minor process learning below.

**Learning record:** the verification script's own cleanup step used the anon-key client (RLS-scoped) to delete `property_creation_requests`/`properties`/`llcs`, and didn't check each call's own `.error` — that table has no client-facing delete policy (by design, security-definer-only writes), so the deletes silently affected zero rows rather than erroring loudly, and the cleanup appeared to succeed when it hadn't. Caught by the same "re-query and positively confirm, don't trust the script's own claim" discipline this project's cleanup rules already require, then actually cleaned up via direct (superuser) `psql`, and re-verified empty. Cause: a testing-script gap (unchecked error path in throwaway verification code), not a defect in the shipped app — the app's own equivalent deletes, where they exist, are already behind checked `{data,error}` handling. No shipped-code or rule change needed; noted here because it's exactly the class of silent-failure bug this whole corrections pass has been about, just this time in the harness testing the fix rather than the fix itself.

**2. Migration safety — a real, previously-unfound release blocker, found and fixed before production ever saw it.**

Read-only pre-checks the cross-account-integrity migration's own comment requires, now actually run against production (not previously possible — "this session has no credentialed access" per that migration's own comment, superseded by this session's read-only `supabase db query --linked` access): both required queries —
- `properties.llc_id` referencing an `llcs` row in a different account, and
- `llcs.holding_company_id` referencing a `holding_companies` row in a different account —

**returned zero rows on production, both.** No inconsistency exists; nothing to stop or resolve; `20260925070000_cross_account_integrity.sql` is safe to apply as written.

**A real defect was found while reviewing the sequence "against the current production schema AND relevant existing data," not just the final schema**, exactly as asked: `20260925030000_contacts.sql`'s own `audit_log_table_name_check` rewrite (already documented in §1 as a regression, already forward-corrected on Practice by `20260925100000`) doesn't just leave a *narrower* constraint sitting on production for a few migrations — its own `ALTER TABLE ... ADD CONSTRAINT` statement, applied fresh to a database that already has qualifying rows, **fails immediately and rolls back**. Confirmed directly: production's `audit_log` already has 19 `financial_transactions` rows and 1 `financial_periods` row (read-only query). Postgres validates every existing row against a newly-added `CHECK` constraint unless `NOT VALID` is used — production has both, so migration #3, applied exactly as it reads today, would abort the entire push right there, before anything past it ever ran. This is not "the final schema is correct so the path there is harmless" — the path itself was broken.

**Fix:** `20260925030000_contacts.sql`'s constraint statement is corrected in place to the full eight-value list from the start (properties, llcs, mortgage_details, financial_transactions, financial_periods, contacts, contact_methods, contact_links) — never narrowing at all, so a fresh apply never hits the failure. This is safe for Practice specifically because Supabase's own migration ledger (`supabase_migrations.schema_migrations`) keys an applied migration by version, not file content — confirmed directly (`supabase db push` against Practice reports "up to date" after the edit, and the ledger's own `statements` column still holds the original, as-applied text verbatim, so the true historical record of what Practice actually ran is preserved there, not in the file). `20260925100000`'s own already-applied restore and its historical narrative are left untouched — nothing about what already happened on Practice is rewritten, only what production will receive on its first-ever run of migration #3.

No other `ADD CONSTRAINT`/`NOT NULL`/`CHECK` statement across all 15 migrations touches a table that already has rows on production (confirmed by grepping every migration in the batch and cross-checking each new constraint's target table) — this was the one load-bearing exception, not a pattern.

**Interruption/recovery:** each migration file is applied and its ledger row committed independently (consistent with every observed push in this session — a resumed push always picks up from the first genuinely-unapplied migration, never re-attempting an already-committed one); an interruption mid-batch leaves everything before the interruption point durably applied and safely resumable, not partially torn.

**Backup/restore availability — checked, not assumed:** `supabase backups list --project-ref jsrovnaxrtllvvavfqvq` (read-only) reports WAL-G physical backups enabled but **Point-In-Time Recovery is NOT enabled** for production (`PITR: false`, no restore-point window reported). This means: no restore to an exact pre-migration second is currently available — recovery from a bad migration would rely on whatever the last automated physical snapshot captured (age unknown from this CLI call) or, far more practically given every migration in this batch is additive, a **forward corrective migration** rather than a restore. A frontend rollback does **not** revert any of these database changes — the tables/functions/constraints stay exactly as migrated regardless of which frontend commit is serving traffic; only a database-level action (restore, or a new forward migration) changes schema state. Recommend the owner decide whether to enable PITR before this release, as a separate, owner-facing decision — not something this pass enables on its own authority.

**"14" vs "15" corrected:** the original corrections text estimated 14 pending migrations; the accurate, read-only-verified count is **15** (the corrections text predates this pass's own `20260929010000_reconcile_legacy_contact.sql`, migration #15 in §16's ordered list, which didn't exist when "14" was written). No other discrepancy — the other 14 match exactly.

**Reused, not re-run:** the six-state evidence matrix, the reconciliation atomicity tests, and the document_owner_links fault-injection from §16 are unchanged by this pass and were not re-verified again here, since nothing in this pass's changes touches them.

## 18. Historical bookkeeping readiness — scoped assessment only, September 29, 2026

Per the addendum's Part 2 instruction, a bounded readiness assessment (not a rebuild, not new backlog authorization) is written up separately at `docs/planning/bookkeeping/ZMR-historical-bookkeeping-readiness-2026-09-29.md`, since it's a distinct topic from Package 1's ownership/creation work this contract otherwise covers. Summary conclusions are in that session's final report. §19 below corrects two overclaims found in that document on a later pass — noted here since it's this contract's own cross-reference to it, not because this contract owns that file.

## 19. T1 second-pass verification — September 29, 2026 (labeled-terminal handoff)

Continuation from `6eacdb0`, per the owner's T1-labeled assignment (`ZMR-terminal-assignments.md`) following CLAUDE.md's new Labeled terminal coordination rule. No code changes this pass — this section records verification only. Release candidate remains `6eacdb0`; no new commit.

**1. Browser-based live verification of the Documents-step controls — blocked, not completed.** The Chrome extension this session's browser tooling depends on was checked repeatedly across this entire pass (multiple attempts, spaced out) and remained disconnected throughout — this is not a one-off timing issue carried over from the prior pass; it has now persisted across two full sessions. Chrome itself is running (confirmed via `ps aux`, a long-lived process). Per the tool's own guidance and how a stuck extension service-worker connection typically resolves, **the precise minimal action needed is: fully quit Google Chrome (Cmd+Q — closing windows alone does not stop the background process) and relaunch it, then confirm the Claude extension's icon shows a connected, signed-in state** before the next terminal or session attempts this step again. This was not something retryable from inside this session — it needs that action taken outside it first. Property-only default, selected-owners-only, inline-new-owner selection, back/forward preservation, Review accuracy, save/reload, and failed-link retry through the actual application frame at desktop and mobile widths **remain unverified live** — the one item keeping Package 1 from a ready recommendation.

**2. Corrected migration sequence, validated on a disposable database — not just "Practice's ledger says applied."** The prior pass's confidence rested on `supabase db push` reporting Practice "up to date" after editing an already-applied migration file — true, but that only proves Practice never re-ran the edited text, not that the edited text itself is correct. This pass built a genuinely disposable, local (non-Docker, native Homebrew Postgres 16) database, replayed all 90 pre-Sept-25 migration files from this repo in order — the actual committed SQL, not a description of it — reproducing production's real pre-upgrade schema exactly (confirmed identical `audit_log_table_name_check` definition, same column set, before proceeding), then inserted two fictional audit rows (`financial_transactions`/`financial_periods`, invented values, not copied from anywhere) reproducing the exact hazard condition production's real data creates. Two controlled results:
- The **original, uncorrected** constraint statement (recovered via `git show 6eacdb0^:...`), applied against this reproduced hazard state, **failed exactly as diagnosed** (`check constraint "audit_log_table_name_check" ... is violated by some row`) — confirming the original defect was real, not a misdiagnosis.
- The **corrected** 15-migration sequence, applied in full against the same reproduced starting state, **applied cleanly end to end**, and the resulting schema was spot-checked against Practice's own confirmed live state (final 8-value constraint, all three RPC functions, all seven new tables, `properties.name` nullable, the `properties_set_updated_at` trigger, and the `contact_links`/`contact_methods` audit triggers' final `AFTER INSERT OR UPDATE` shape) — all matched exactly.

The one seed-migration hurdle (a hardcoded real Supabase Auth user id from `20260903192431_seed_zmr_account.sql`) was resolved with a single fictional placeholder row keyed to that same id — no real production data, credentials, or identity details were copied; the disposable database and its Unix-socket directory were fully torn down afterward, nothing left running or on disk.

**3. Recovery guidance, corrected — PITR-off does not mean restore is unavailable, it means this specific tool's restore path isn't.** `supabase backups restore --help` confirms that CLI command is PITR-timestamp-only (`-t/--timestamp`); with PITR disabled, that specific command would not serve production. `supabase backups list` separately reports `WALG: true` — WAL-G is the physical base-backup mechanism Supabase's managed platform runs under essentially all projects regardless of the customer-facing PITR toggle, which strongly suggests some form of dashboard-driven backup/restore (a periodic snapshot, not point-in-time) exists at the plan-tier level — **this is inference from Supabase's known product structure, not independently confirmed**; this session's tooling has no way to list actual snapshot ages or a dashboard-only restore path, and that gap is stated here rather than guessed past. Concretely, for the owner/whoever holds dashboard access: check Project Settings → Database → Backups on the production project directly for the actual list of restore points and their ages before relying on this guidance either way. Separately, and true regardless of what that check finds: every migration in this batch is additive, so the lowest-risk recovery from a problem specific to *these migrations* is a forward corrective migration, not a full-project restore (which would revert every table's data to the backup's own age, not just undo the migration) — a frontend rollback reverts none of this regardless. No restore of any kind was attempted or tested against production, as instructed.

**4. Bookkeeping report corrections — proposed, not applied (T2 owns that file).** Reviewed `docs/planning/bookkeeping/ZMR-historical-bookkeeping-readiness-2026-09-29.md` against the requested four-way distinction (verified DB objects / locally implemented UI / deployed frontend availability / actual workflow evidence) and found it conflated the middle two with the last in two places:
- The CSV-import row's "Yes, and reachable" claim rested on reading `App.tsx`/`AppShell.tsx` (local code) and on this session's own earlier navigation to `/financials` **in Practice** — neither establishes that this route is live on the *production* frontend, since this session cannot determine which commit production is currently serving. The stale-comment correction itself ("not wired into App.tsx yet") stands — that was a check against this repo's own current source, not a production claim — but "reachable" should read "reachable in Practice and in this repo's current source; production frontend deploy status is separately unverified from here," not "reachable" unqualified.
- The P&L/Cash Flow rows' "not dependent on any opening balance... accurate today for whatever transactions are correctly entered" overstates what was actually checked. The only thing verified is a narrow, real, code-read structural fact: `computeProfitAndLoss`/`computeCashFlow` sum whatever transaction rows they're given for one period, with no reference to any prior-period balance — genuinely true, and it does mean the opening-balance gap specifically does not apply to these two reports. It is not evidence the reports are *accurate* — no unit test exists for any function in `reportsCalculations.ts` (confirmed: no test file for that module at all), and no live test of a report's on-screen output against a known set of transactions is recorded anywhere in this project's history. "Structurally unexposed to the opening-balance gap" and "verified accurate" are different claims; the document should say the first and not imply the second. (Concretely, this module's own history includes a real prior bug — the documented improvement-flagged double-counting fix already noted in its own comments — which is itself a reason not to claim "accurate" without an actual test.)

These are proposed corrections for T2 (or the owner) to apply in that file, not applied here — consistent with the terminal-assignment split (T2 owns the bookkeeping report) and with routing decisions/edits to shared documents through the planning conversation rather than a direct cross-scope edit.

**Learning, recorded once (cause → fix → prevention → evidence):**
- **Cause**: a specification/verification gap, not an implementation error — the prior pass's migration-safety claim relied on a true-but-insufficient fact (Practice's ledger didn't re-run the edited file) to stand in for the actually-needed fact (the edited file's SQL is itself correct against production's real starting condition).
- **Fix**: built a disposable, local, from-scratch database replaying the real migration history plus fictional-but-representative hazard data, then applied both the broken and corrected constraint statements as a controlled pair — proving the diagnosis and the fix, not just the ledger's silence.
- **Prevention**: no new global rule proposed — this is a one-time depth of proof appropriate to a genuinely production-blocking defect, not a pattern needing a standing rule; the existing "verify database objects and relevant existing data, not just the final schema" instruction already covers this, it just hadn't been carried through to an actual reproduction before this pass.
- **Evidence**: the controlled failure/success pair above, plus the seven-point schema spot-check matching Practice exactly.

Separately, the bookkeeping-report overclaims were a **specification-application gap** on my part (the four-way distinction the report needed to draw was implicit in what "readiness" means, not stated as a requirement until this pass) rather than a new defect in the underlying feature code — no rule change proposed; the fix is the two corrections named above, to be applied to that file by its owner.

## 20. Documents-step live browser verification — September 28, 2026 (closes §19's one remaining gap)

The Chrome extension reconnected mid-session (Chrome's own process restarted — confirmed by PID/start-time change — after the owner quit and relaunched it). Full live verification of the per-file document-owner controls followed, through the real AppShell at both desktop (1400×900) and mobile (390×844) widths, using the owner's own Practice sign-in.

**Two real wizard completions, both saved and verified in Postgres, not just observed on screen:**
- Property `777 T1 Doclink Verify Court`: two owners (one existing — `ZMR-TEST-PRACTICE Owner A` — one inline-new — `ZMR-TEST-T1 New Owner`), three staged files each given a different selection (property-only, existing-owner-only, new-owner-only). Saved; `document_owner_links` queried directly afterward showed exactly the three expected rows: the property-only file with **no** link at all, the existing-owner file linked to that owner only, and the new-owner file linked to the owner **actually minted server-side** during that same save — confirming the rowKey→real-id resolution works against a genuinely fresh inline owner, not just a pre-existing one.
- **Back/forward preservation**, same wizard instance: after selecting owners on step 3, navigated Back to step 2 and Next forward again — every checkbox's checked state was byte-for-byte unchanged (verified by reading each file's checkbox states before and after).
- **Review accuracy**: the Review step's per-file line matched the actual selections exactly ("Property only" / the existing owner's name / the new owner's name) for all three files, cross-checked against the eventual database rows above.
- **Save/reload preservation**: a second property (`888 T1 Reload Retry Court`), one file with an owner selected and one left property-only, was staged and selected, then the browser was navigated away and the wizard reopened from a cold reload (not just a soft step change). Both files correctly required re-attachment (as designed — `File` objects can't survive a reload); their `linkedOwnerRowKeys` selections survived the reload untouched, confirmed by reading each file's checkbox state immediately after reopening, before any re-attachment happened.
- **Failed-link retry**: after re-attaching both files, the `document_owner_links` insert was fault-injected (browser-session-only `window.fetch` patch, never a shipped code path) to fail. Saving showed the owner-selected file as "Failed — will retry on Save" and the property-only file (which never attempts a link at all) as "Uploaded" — no premature success state, no premature navigation. Removing the fault and retrying completed the save; the final Postgres state showed exactly one document with a link (to the correct owner) and one with none — no duplicate documents, no duplicate links, confirming the retry resumed rather than redid.
- **Mobile width (390px)**: the Documents step's checkbox UI rendered with no horizontal overflow (`scrollWidth === clientWidth`, confirmed programmatically, not just eyeballed), the hint text wrapped cleanly, and the checkbox/label remained usable at that width. A desktop-width (1400px) screenshot of the same step is on file, showing the identical control inside the real AppShell frame, not a component harness.

All test data (two properties, one LLC, five Storage objects, all `ZMR-TEST-`/`T1`-prefixed) removed and positively re-verified gone by direct re-query after — properties/llcs/storage-objects counts all back to the exact pre-test baseline, `property_creation_requests` at zero.

**This closes the one item §19 left open.** Combined with §19's migration-safety reproduction and §16–18's earlier evidence, no further known gaps remain in this pass's own scope.
