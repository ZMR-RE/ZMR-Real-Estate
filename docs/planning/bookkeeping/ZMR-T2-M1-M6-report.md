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
| M6 closed-period protection | Implemented; **verified on local disposable Postgres only** | Not applied to hosted Practice: needs the coordinated window. See dependency. |

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
