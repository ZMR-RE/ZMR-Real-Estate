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
