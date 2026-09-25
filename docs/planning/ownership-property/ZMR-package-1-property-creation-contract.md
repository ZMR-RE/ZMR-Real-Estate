# Package 1 — Connected property creation & core setup (v3, final readiness)

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

**A separate, more serious bug was found while tracing this and fixed in the same migration:** `20260925030000_contacts.sql`'s own rewrite of `audit_log_table_name_check` dropped `'financial_transactions'` and `'financial_periods'` from the allowed list (both added by earlier migrations, `20260911100000` and `20260911110000`) instead of extending it. Both tables' audit triggers were never dropped and still fire on every transaction edit/void and every period lock/reopen — which means, since that migration, every one of those UPDATEs has been hitting the check constraint *inside the same transaction* and failing outright (an AFTER trigger's failed INSERT rolls back the whole UPDATE). **Confirmed directly, not inferred:** read the live constraint on Practice (it was missing both values), then reproduced it — inserted a real test transaction and voided it; the void succeeded only after the fix was applied. This predates Package 1 and this handoff entirely; it is a live, already-shipped regression, not new scope, flagged here because this migration already had to touch the same constraint. **Recommend checking whether this has caused any real failed transaction edits/voids or period-lock actions in production since `20260925030000` was released, since the constraint fix has not been applied to production by this session.**

## 2. Ownership ambiguity — one plain recommendation, not a raw column question

**The rule, in one sentence:** a legacy `Organization type` selection (`properties.llc_id`) is a *historical reference*, never treated as confirmed ownership, until either (a) the property's real ownership-interest data unambiguously resolves to that same single owner, or (b) the account owner explicitly confirms it via a dedicated action. Nothing here infers, backfills, or bulk-converts.

**Every consumer of `properties.llc_id` must treat it as authoritative *only* under case (a) below, and as a non-authoritative historical label otherwise** — this is not optional per-consumer judgment, it's the one rule every one of the four real consumers (`PropertyIdentityHeader.tsx:73`, `PropertyProfileHistoryTab.tsx:16`, `PropertyProfileOverviewTab.tsx:73,116`'s `FinancialAccountsSection` scoping, and Quick Capture's account grouping which depends on it) must implement:

| Case | What `property_ownership_interests` actually shows | `llc_id` treated as authoritative? | What the four consumers show |
|---|---|---|---|
| Zero owners | No rows at all | No | "No owner recorded" — plain, not an error |
| Legacy-only | No rows; `llc_id` set from before the ownership-interests system existed | **No — this is the case the recommendation is about** | "Ownership not yet confirmed (previously recorded as: *[entity name]*)" — read-only, with a "Confirm this as the current owner" action available on the property's own Ownership box. Clicking it creates one real, explicit `property_ownership_interests` row (via the existing `replace_property_ownership_interests`, with its required reason) naming that same entity — a human decision, every time, never automatic, never bulk. |
| One owner, allocation incomplete | One row, `allocation_status = 'incomplete'` | **No** — one entry with incomplete status is not proof of sole ownership (the exact case the handoff named: 48% incomplete could mean more owners are still being entered) | The one known owner, plus "additional owners may exist — allocation not yet marked complete" |
| Owner kind unresolved | One or more rows reference an `llcs` row with `owner_kind is null` | No (kind is unresolved, not just count) | "Owner type unresolved" — shown plainly, never guessed as individual or entity |
| 2+ current owners | 2+ rows | No | Every consumer shows/handles multiple owners explicitly — e.g. `FinancialAccountsSection` presents an owner/entity picker instead of silently scoping to one |
| Transition back to exactly one | Was 2+, now exactly 1 row remains, `allocation_status = 'complete'` | **Yes** — this is the only case `llc_id` may be set/updated, and it's driven by real interest data, not a legacy pointer | The one confirmed owner |

This table is the actual implementation contract for the four consumers — none of them may fall back to trusting `llc_id` in any row of this table except the last one. No consumer needs a fifth case invented; every property is in exactly one of these six states at read time.

**What this replaces from v2:** the earlier "one-time backfill: create a matching single ownership-interest row from the existing pointer" proposal is withdrawn. That was an automatic conversion of an unverified legacy association into confirmed ownership — precisely what's now ruled out. The Legacy-only row above is the corrected replacement: preserved, labeled, inspectable, and only ever promoted to real ownership by an explicit, individually-reasoned human action.

## 3. Contacts — unchanged from v2, still not owner identities

No schema change. `contacts`/`contact_methods`/`contact_links` are reusable communication records; ownership interests reference `llcs` (which already models both entities and people — `llcs.owner_kind: 'individual' | 'entity' | null`, `llcsQueries.ts:24`). The legacy-contact reconciliation flow (select/create a contact, explicit role and link, explicit confirmation of exactly what transfers, retained-not-cleared original value, idempotent retry, now-real audit coverage per §1) is unchanged from v2 and uses only existing, standard patterns already established for this system — no new product question is being re-asked here.

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
2. `20260925100000_audit_trail_contacts.sql` — applied, verified; also fixes the pre-existing `financial_transactions`/`financial_periods` constraint regression (§1). **Not yet applied to production.**

New migrations still to be written (not yet applied anywhere):
3. `create_property_with_ownership` function + `property_creation_requests` table (§5).
4. `properties.legacy_contact_reconciled_at` nullable timestamp column (§3, unchanged from v2).

No migration in this package touches `property_ownership_interests`, `contacts`, `contact_methods`, `contact_links` schema, or any Insurance/Financials/Tax table. Release gate unchanged: Practice verification against §9, the separate S3 visual-approval gate for any layout change, then a scoped production release proposal — no production deploy or migration is authorized by this document, and the two already-applied Practice migrations above have deliberately not been pushed to production.

## 11. Dependency-ordered packages after this one (unchanged from v2)

Package 2 (Insurance O2–O7), Package 3 (Financial accounts N), Package 4 (Property tax P), Package 5 (Market/rent Q), Package 6 (Capture/History J–M) — boundaries only, unchanged.

## 12. Concise readiness checklist

| Item | State | Evidence |
|---|---|---|
| Name nullable, all consumers updated | Done, verified | Migration applied + build/lint/test clean; live insert with `name = null` verified on Practice |
| Contacts/methods/links INSERT audit coverage | Done, verified | Migration applied; live test insert produced real audit rows on Practice |
| Pre-existing `financial_transactions`/`financial_periods` audit-constraint regression | Found and fixed in Practice; **not yet in production** | Live constraint read before/after; live void-transaction test failed before the fix, succeeded after |
| `llc_id` ambiguity | Resolved to one plain rule (§2), no auto-backfill | — |
| Idempotency mechanism | Corrected, account-scoped, handles concurrent/changed-payload cases | Design only — not yet implemented (needs the function + table in §10 item 3) |
| Upload/Storage recovery | Concrete, testable design against real failure boundaries | Design only — not yet implemented |
| Scope honesty (Acquisition contacts, closing docs, Overview grouping) | Explicitly stated as out of scope | §8 |
| S3 visual-approval gate | Still open | Separate from this contract |
| Production changes | None made | Both applied migrations are Practice-only |

**Genuinely unresolved product choices (only these remain):**
1. Approve/revise the "Ownership not yet confirmed" wording and the "Confirm this as the current owner" action's exact placement (§2) — a labeling/UX choice, not a data-model question; the data-model rule itself (the six-case table) is not optional.
2. Approve/revise the legacy-contact reconciliation flow's exact copy/placement (§3) — the mechanism itself follows existing patterns and is not being re-asked.
3. Whether to apply the `financial_transactions`/`financial_periods` audit-constraint fix to production now, given it may be actively blocking real transaction edits/period locks today (§1) — this is a production decision this document is explicitly not authorized to make.
