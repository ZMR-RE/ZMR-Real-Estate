# T2 — Manual bookkeeping package M1–M6: report

**Terminal:** T2. **Branch:** `t2/manual-bookkeeping-m1-m6` (isolated worktree
`/Users/janki/Projects/ZMR-Real-Estate-T2`). **Base:** `a25377b` (main; no
source/migration changes since `6eacdb0`). **Deferred CSV branch:**
`t2/historical-import-dedup` at `e280ad9`, untouched and excluded.
**Date:** September 28, 2026.

Status vocabulary: *implemented locally* · *verified in Practice (live UI)* ·
*verified on local disposable Postgres only* · *not released*. Nothing here
is released; no production change, migration or real business entry was
made.

## Status by item

| Item | Status | Live Practice evidence (fictional ZMR-TEST-T2 records, account A, port 5191) |
|---|---|---|
| M1 first-entry setup | Implemented, verified in Practice | Empty payment-method list showed explanation + "Add payment method"; Done without adding created nothing; adding "ZMR-TEST-T2 Checking" selected it and kept the draft (property, amount); prompt disappears once a choice exists. Same for document types ("ZMR-TEST-T2 Invoice"). |
| M2 historical entry | Implemented, verified in Practice | Default date = local calendar (Sep 28 evening; UTC slice gave Sep 29). Save and add another kept only property + date, cleared payer/amount/category/payment/flag/description, focused Type. Confirmation names the saved entry and moves filters ("showing 2018"). Year filter now spans 2018–2026 from saved data. Network failure → "couldn't confirm whether this was saved", draft kept, filters unchanged, nothing written. |
| M3 edit/void/mobile/docs | Implemented, verified in Practice | Edit scrolls the form into view below the banner, focuses a heading naming the transaction, loads stored values; Save/Cancel return focus to that row's Edit button (new entry → "Add transaction"). Void shows inline details + retained-history explanation; "Keep it" wrote nothing; confirm voided. Show voided lists voided rows marked "Voided" (Documents/History only), totals and exports unchanged. Missing fields named in a summary and per field. Attachments show original filename + type + size + local date; opened via the existing signed link. Layout measured at 1400/900/390 px (below). |
| M4 tenant payer | Implemented, verified in Practice; DB guard local only | Income offers Tenant / Vendor or other. Tenants listed per property from current **and past** leases with unit + lease dates (2018 lease listed). Switching property cleared the tenant with a visible explanation. Tenant income (2018 Rivera, 2025 Okafor) and vendor income saved, reloaded and reopened with the correct payer; stored as exactly one of vendor/tenant. Cross-account reference guard is a migration (see M6 dependency). |
| M5 improvement consistency | Implemented, verified in Practice | One ledger definition (income / operating expense / capital improvement) used by Financials summary, tax CSV, P&L, Cash Flow and the property KPI. Screens and the downloaded CSV matched hand-computed figures (below). |
| M6 closed-period protection | Implemented; applied to hosted Practice Sept 29, 2026; verified on hosted Supabase and local Postgres | See "Acceptance addendum" below. |

## Hand-computed fictional ledger vs. what the app showed

Entered through the dashboard on two T2 properties. Expected values were written before entry.

| Scope | Expected | Shown (Financials / Reports / CSV) |
|---|---|---|
| 2018 Maple | income 1,200.00; operating 912.40 (repair 312.40 + insurance 600.00); net 287.60; cash flow 287.60 | P&L 1,200.00 / 912.40; Cash Flow 287.60 ✓ |
| 2019 (Jan 1 boundary) | −450.00 | ✓ (Dec 31, 2018 row stayed in 2018) |
| 2021 | −75.25 | ✓ |
| 2025 both | income 1,100.00; operating 3,047.11; improvements 4,800.00; net operating −1,947.11; cash flow −6,747.11 | P&L and Cash Flow ✓; Maple −610.25 / −5,410.25 after all spending; Cedar −1,336.86 ✓ |
| 2025 edit | 88.19 → 91.19 | ✓, audit row `amount 88.19 → 91.19` |
| 2025 void | 99.99 excluded everywhere | ✓ with Show voided on |
| Balance Sheet cash (assumes $0 opening) | Maple −5,647.90; Cedar −236.86 | ✓ (screen states cash starts from $0 and is not a bank balance) |
| Tax CSV 2025 (downloaded `~/Downloads/zmr-financials-2025.csv`) | 5 detail rows with Treatment/Payer/Payment method; no Maple Repairs summary line; separate improvements section Maple 1 / 4,800.00; voided row absent | ✓ exact |

Regression case from the assessment (+640.49 vs −4,159.51) is a unit test.

## Responsive measurements (real app in AppShell, same session, fixed-width frame)

| Width | Page sideways scroll | List controls off-screen | List layout |
|---|---|---|---|
| 1400 | none | 0 | table, wrapping actions |
| 900 (sidebar open, ~570 px content) | none | 0 | stacked cards (container query) |
| 390 | none | 0 | stacked cards with labels; form buttons 358×45 |

At 390 px the two small summary tables scroll inside their own box (the
app's existing approved phone behavior for tables); the transaction list
and form do not.

## Tests run

- `npx vitest run`: 114/114 (includes `m5Ledger.test.ts` against the
  hand-computed fixture, `transactionEntry.test.ts`: local date in a US
  evening, add-another draft, validation, 2018+ year options, payer
  mapping, save-outcome classification, attachment names).
- `npm run build` (tsc -b + vite): pass. oxlint on touched modules: no errors.
- `supabase/tests/closed_period_protection/`: 35/35 rule checks, 4/4
  concurrency cases, plus a control run proving the race without the
  advisory locks. Local Postgres 17 replaying all 106 migrations; not
  hosted Supabase.

## M6 / M4 migration dependency (needs coordination)

Two forward migrations, not applied anywhere shared:

- `20260930100000_financial_period_closed_protection.sql` — locked periods
  enforced on INSERT/UPDATE/DELETE with OLD and NEW scope (move in/out,
  edits, voids, API deletes); locked period rows can't be deleted or
  re-yeared (reopen remains the audited path); lock vs write serialized
  per account+year with transaction advisory locks; guard functions not
  callable as RPCs; a caller outside the account is left to RLS so another
  account's lock state is never revealed.
- `20260930110000_financial_transactions_same_account_refs.sql` — property,
  vendor, tenant and prospective-tenant references must belong to the
  transaction's account (fires only when those columns are written; no
  existing row changed).

Proposed application: when T1 confirms it is not using shared Practice,
record the window, run a read-only preflight (any transaction whose
property/vendor/tenant is in another account; any locked period — expect
none), apply both to Practice, re-run the rule list against real Supabase
with fictional T2 rows (never lock a year other terminals use; reopen and
void afterwards), and label that evidence separately. Production only
through a later approved release.

## Defects found and fixed (cause → fix → prevention → evidence)

1. **Saved 2018 row not shown** — two list loads raced after the year
   changed; the stale 2026 response landed last (implementation). Fix:
   only the latest load may update state. Prevention: guard in
   `useFinancials`; live re-check passed. No DOM unit-test environment
   exists, so it is live evidence only.
2. **Year filters stopped at 2021** — hard-coded six-year list in
   Financials and Reports (specification gap for 2018 history). Fix:
   `buildYearOptions` spans every year with records. Prevention: unit test.
3. **Default date was UTC** (tomorrow in US evenings) — implementation.
   Fix: `todayLocalIsoDate`. Prevention: unit test pinned to America/Chicago.
4. **Improvements in Repairs (Financials, CSV) but not P&L; Cash Flow
   omitted them** — duplicated calculation logic. Fix: one
   `ledgerTreatment` definition. Prevention: hand-computed ledger tests.
5. **KPI "YTD net cash flow" counted Jan 1 rows in the prior year** —
   `new Date('YYYY-MM-DD')` parsed as UTC. Fix: compare date text; shared
   ledger. Prevention: the same pattern remains elsewhere (below).
6. **Pickers and prompts squeezed** — global `[role=group]` flex rule on
   field wrappers (implementation). Fix: roles removed from wrappers.
   Evidence: live layout.
7. **Tables overflowed at 900 px** — global `nowrap` with scrolling only
   below 600 px (verification gap: intermediate width). Fix: container
   query + wrapping summary tables. Prevention: 1400/900/390 measurement
   in acceptance.
8. **Existing: editing a Quick-Capture tenant-paid transaction could set
   two payers** — update wrote only vendor_id. Fix: every save writes all
   three payer columns. Prevention: unit test.

## Shared-file overlap (reported, additive)

`src/shared/pickLists/*` (opt-in `emptySetup`; `add()` returns success),
`src/shared/dateFormat.ts` (new `todayLocalIsoDate`), `src/index.css`
(scoped `.transaction-*`, `.field-error`, `.financials-summary-table`,
`.pick-list-setup` rules), `DESIGN-SYSTEM.md` (documented),
`src/modules/reports/*`, `src/modules/propertyKpi/useMarketFinancialSnapshot.ts`
(year-boundary fix). No app shell, navigation or other terminal's files.
`financialsQueries.ts` is 372 lines (341 before) — over the ~300 guideline
already; flagged for a later split of the bulk/bridge queries.

## Historical entry from 2018 onward

- Any date is accepted; no earliest-year cutoff; 2018, 2019, 2021, 2025 and
  both sides of each year boundary were entered and reported.
- Transaction date is independent of acquisition date; nothing in code or
  schema rejects or redates pre-purchase costs.
- Closed-period protection is per year, identical for 2018 and 2025 (local tests).
- The owner does not need to enter everything since purchase before 2025:
  P&L, Cash Flow, the tax CSV, the transaction list and Financials totals
  for a year use only that year's transactions (plus that year's mortgage
  principal).
- Depend on earlier history / opening balances: **Balance Sheet cash and
  equity** (all-time, $0 start; wrong until real opening balances exist,
  roadmap 9.18); **depreciation and cost basis** (need purchase price/date
  and all improvements since purchase; the P&L depreciation line stays $0
  unless entered); **portfolio KPIs such as equity/ROI** (need market value
  and loan data). None were invented.

## Known gaps / not done

- M6 and the M4 guard are not applied to hosted Practice (coordination).
- "Export list (CSV)" download could not be triggered a second time by
  automation (browser multiple-download permission); its code is unchanged
  and reads only non-voided rows. Minimal manual check: click it once for
  2025 and confirm 5 rows.
- Browser tooling glitch: page viewport stayed 2100 px, so screenshots and
  some coordinate clicks failed; widths were measured by loading the real
  app in fixed-width frames, and actions used the page's own controls.
  Owner visual review at real device widths is still needed.
- `SearchableSelect` (shared picker) still cannot choose an option with
  the keyboard (Enter) — shared, not changed.
- 26 other places derive "today" from UTC (lease form default showed Sep 29
  in the live pass); not changed outside this package.
- Creating a transaction still writes no audit row (audit trigger is
  update-only); first lock insert is unaudited (existing).
- Mortgage-module interest is not in the P&L (deferred integration).

## Cleanup (positively re-verified)

- **Voided, retained with audit history:** all 13 T2 transactions from this
  session (plus 11 from the earlier assessment); account A has 0 active
  transactions, same as the baseline.
- **Archived:** pick-list options `ZMR-TEST-T2 Checking` (payment) and
  `ZMR-TEST-T2 Invoice` (document type); leases `992e6667…` (Maple 2018)
  and `d555828a…` (Cedar 2025). Active payment/document lists are empty
  again (baseline).
- **Remain:** tenants ZMR-TEST-T2 Rivera `4d08443a…` and Okafor `a9451dff…`
  (no archive action exists); document `2532d781…` and its stored file on
  the voided water-heater transaction; T2 properties, owner entity and
  vendors from the earlier assessment. Pre-existing records (two T1
  properties, three Insurance documents, account B) untouched. No financial
  period exists. Browser signed out; 5191 stopped.

## Release contents (when approved)

Commits on `t2/manual-bookkeeping-m1-m6` after `a25377b`; application code
plus the two migrations above (which must be applied before or with the
frontend for M6/M4 database protection; the UI works without them). Not
included: the CSV branch.

## Learning summary

- Recalculating the same money rules in several places produced three
  different answers → one shared definition with hand-computed tests.
- "Today" and year tests built from UTC strings broke year boundaries
  twice → local-date helper and date-text comparison; remaining instances
  listed rather than silently changed.
- Intermediate widths were not in the checklist → measure 1400/900/390.

No new global rule is proposed.


## Acceptance addendum — September 29, 2026

### Practice integration record

- **Conflict check (read-only, 05:10 UTC):** no other active client sessions; the only writes
  in the prior hour were T2's own cleanup voids; T1 assigned to the production backup, not
  Practice. The main checkout's Supabase CLI link points at **production** and was not used; the
  T2 worktree was separately linked to Practice (`gxgvrktzpxhtqklupvif`) through the CLI's
  Keychain token (no database password handled). Every query went through a wrapper that
  refuses to run unless that link is Practice.
- **Preflight (read-only):** ledger 104 migrations (latest `20260929010000`); 0 cross-account
  property/vendor/tenant/prospective-tenant references; 0 financial periods; 0 rows in locked
  periods. Nothing incompatible — no repair needed.
- **Window opened 05:11:26Z. Applied to Practice only:** `20260930100000_financial_period_closed_protection`
  and `20260930110000_financial_transactions_same_account_refs`, each in one transaction with
  its ledger row (ledger now 106). SQL stored as one statement block per version (a difference
  from `supabase db push`, which splits statements). Production untouched.

### Hosted Supabase evidence (Practice)

- **Rules, 24/24 PASS**, run as the real `authenticated` role with Practice's own `auth.uid()`,
  inside one transaction that ends by raising its results, so nothing persisted: closed-year
  inserts (Jan 1 and Dec 31), neighbours in open years, edits, voids, date moves in and out,
  API delete, deleting or re-yearing a locked period, reopen then edit, reopen by another
  account (0 rows), insert into another account (RLS 42501), other-account tenant/vendor/property
  references (ZM002), guard not callable as RPC. Account B fixtures existed only inside that
  rolled-back transaction.
- **Concurrency, 4/4**, two separate hosted sessions: lock waits for an in-flight write; a
  write during an in-flight lock waits then is rejected; a write during a rolled-back reopen
  is rejected; moving an existing row into a year being locked is rejected. Test periods
  2013–2015 were reopened (audited) and removed; no test rows persisted.
- **Residue check:** 0 periods, 0 test rows, Account B unchanged (0 properties/tenants/vendors/
  transactions), moved row still dated 2025-05-05.

### Browser acceptance on the migrated Practice database

Review URL: **http://127.0.0.1:5191** (see "Review environment"). Real AppShell; viewport
dimensions read from the page itself.

| Viewport (full window, measured) | Result |
|---|---|
| 1440 × 723 (desktop) | No sideways scroll; list as table with wrapping actions |
| 1024 × 723 (intermediate) | No sideways scroll, no overflowing table; list switches to stacked cards (content column ≈ 700 px, under the 760 px switch) |
| 500 × 723 (Chrome's minimum window) | No sideways scroll; cards; all amounts and actions on screen; form fits, full-width buttons |
| 390 px — **iframe reflow only**, not a full window | No sideways scroll; list controls all on screen |

Workflow re-run after the migrations (fictional records, account A):
M1 empty-list prompts for payment method and document type → created and selected. M2 Save and
add another across 2018-02-01, 2018-12-31, 2019-01-01, 2025-06-30, 2025-04-20 (property + date
carried, rest cleared). M4 tenant payer (Rivera, 2018 lease). M3 edit (focus, description change,
audit row), void confirm, Show voided, attachment filename. M6 in the UI: with 2019 locked,
edit → "Not saved: … locked financial period (2019)…" (draft kept), void → "Not voided: …",
new 2019 entry → "Not saved: The 2019 financial period is locked…"; reopened through the UI.

Reports vs. expected: 2018 P&L income 1,200.00, expenses 600.00, net 600.00; 2025 operating
2,345.67, improvements 4,800.00, Cash Flow −7,145.67; Balance Sheet cash Maple −4,650.00,
Cedar −2,345.67 ($0-start caveat shown). All matched.

Exports: **downloaded** `~/Downloads/zmr-transactions-2025.csv` (list export, 2025, all
properties, "Show voided" on): 2 rows, total 7,145.67, voided row absent. Generated-file contents
captured in page (Chrome allows one automatic download per site without a prompt the tools
can't answer): 2025 tax CSV (improvement in its own section, Cedar Taxes 2,345.67 only), 2018
list (2 rows) and 2018 tax CSV (income 1,200.00, insurance 600.00), 2025 list filtered to Cedar
(1 row, 2,345.67; voided Cedar row absent).

Screenshots: `docs/planning/bookkeeping/m1-m6-screenshots/` (01–07 desktop 1440, 08–09
intermediate 1024, 10–11 phone 500).

Defect found in this pass: none in the application. Tooling causes found and documented: Chrome
page zoom ≈67% on `localhost` (moved to 127.0.0.1); the test tab was a background tab in a shared
window, so resizes only applied once it was brought forward (restored afterwards).

### Review environment (reproducible, no committed credentials)

`vite.review.config.ts` (committed) — real app, Practice only, `127.0.0.1:5191`. From any
checkout of this branch:

```
ZMR_PRACTICE_ENV_DIR=/Users/janki/Projects/ZMR-Real-Estate/envs/practice \
  npx vite --config vite.review.config.ts
```

`ZMR_PRACTICE_ENV_DIR` points at the existing, git-ignored `envs/practice/.env` (read in place,
never copied). In a checkout that has no such file, create `envs/practice/.env` from
`envs/practice/.env.example` yourself in your own terminal/editor (never pasted into chat):
`VITE_PRACTICE_TARGET=true` plus the Practice project's URL and anon key; `supabaseClient.ts`
refuses to start if the URL is production. Sign in at `http://127.0.0.1:5191` as the Practice
test user (password kept outside the repo). The earlier untracked `vite.t2practice.config.ts`
is removed.

### Cleanup (re-verified)

This pass: 6 acceptance transactions voided (retained with audit history); payment method
"ZMR-TEST-T2 Checking (acceptance)" and document type "ZMR-TEST-T2 Invoice (acceptance)"
archived; Maple 2018 lease restored for the test and re-archived; open 2019 period row created
by the UI lock/reopen test removed (lock and reopen remain in the audit log). Account A: 0
active transactions (30 voided across T2 sessions), 0 periods, 0 active pick-list test options,
0 active leases; pre-existing records and Account B untouched. Browser left signed in to
Practice at 127.0.0.1:5191 for owner review; the owner's own Chrome window was restored to its
original size and active tab.

### Remaining limitations

- Transaction-list CSV has no payer/payment-method/treatment columns (the tax CSV does); list
  export unchanged in this package.
- Owner visual review of design at real device widths (including the 1024 px card layout) is
  still an owner decision.
- Earlier-listed limitations stand (keyboard selection in shared pickers, 26 other UTC "today"
  instances, no audit row on create, Mortgage-module interest not in P&L, financialsQueries.ts
  size).

## Proposed release scope (excluding deferred CSV work)

For a later owner-approved release — not deployed:

1. Commits on `t2/manual-bookkeeping-m1-m6` from `a25377b` through the acceptance commit
   (application code, `vite.review.config.ts`, tests, docs/evidence).
2. Production migrations, in order, **before or with** the frontend:
   `20260930100000_financial_period_closed_protection.sql`,
   `20260930110000_financial_transactions_same_account_refs.sql`. Both forward-only; run the same
   read-only preflight against production first (cross-account references, rows in locked
   periods) and stop on any finding.
3. Dependency: this branch's base includes T1's Package 1 code but not T1's unreleased
   Practice-only migrations' production application — T1's release must land first or be
   combined deliberately; do not release this over an unaligned production schema.
4. Excluded: `t2/historical-import-dedup` (`e280ad9`) and any CSV import changes.
