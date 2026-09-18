# ZMR Real Estate — Architecture Map

Generated from what actually exists in the codebase as of commit `68d4722`
(2026-09-17), not an idealized target. This document describes structure
only — see the audit report delivered alongside it for findings,
duplication, and recommended fixes. Re-generate this file (or at least
re-check it) after any large structural change; it will drift otherwise.

## How the app is built

- **Stack:** React 19 + react-router-dom 7, Vite, TypeScript, Supabase
  (Postgres + Auth + Storage). No server of its own — `src/` is the
  entire deployed app; Supabase is the backend.
- **No path aliases.** Every import is a relative path (`../../shared/...`).
- **Module shape** (per CLAUDE.md's Code organization rule): each folder
  under `src/modules/` keeps its Supabase calls in `<module>Queries.ts`,
  its state/business logic in `use<Module>.ts` hooks, and presentational
  UI in `<Entity>List.tsx` / `<Entity>Form.tsx` / `<Entity>Section.tsx`
  components. Almost every module below follows this; deviations are
  noted.
- **`server/`** — `driveClient.ts` + `verifyConnection.ts`. Not imported
  anywhere in `src/`, no build/run script references it. Early Phase 3 /
  12.3 (Google Drive) scaffolding that was never wired in. See the audit
  report's Orphaned Code section.

## Routing (`src/App.tsx`)

| Path | Component | Nav label |
|---|---|---|
| `/properties` | `properties/PropertyRegistry.tsx` | Properties |
| `/properties/:id` | `properties/PropertyProfile.tsx` | *(linked from Properties)* |
| `/capture` | `capture/CaptureInbox.tsx` | Quick capture |
| `/reconciliation` | `reconciliation/ReconciliationQueue.tsx` | Action queue |
| `/rent-ops` | `rentOps/RentOps.tsx` | Rent ops |
| `/tasks` | `tasks/TaskEngine.tsx` | Tasks |
| `/financials` | `financials/Financials.tsx` | Financials & tax |
| `/command-center` | `commandCenter/CommandCenter.tsx` | Command center |
| `/automations` | `automations/Automations.tsx` | Automations |
| `/mortgage-portfolio` | `mortgagePayoff/MortgagePortfolio.tsx` | Portfolio KPIs |
| `/settings` | `settings/Settings.tsx` | Settings |
| `/reports` | `reports/Reports.tsx` | *(linked from Financials & Tax)* |

`/reconciliation` is the one route carrying two unrelated features under
one URL — see the audit report.

Account & Security (2FA, password reset) is **not a route** — it's a
popover (`account/AccountSecurityMenu.tsx`) rendered directly in
`AppShell.tsx`'s sidebar, separate from `/settings`. See the audit report.

## `src/shared/` — cross-module code

| File/folder | Purpose |
|---|---|
| `AppShell.tsx` | Sidebar nav + outlet; owns `NAV_ITEMS`, mounts `AccountSecurityMenu` |
| `SearchableSelect.tsx` | Generic type-ahead picker used by every "select a property/vendor/LLC" field |
| `CollapsibleSection.tsx` | `<details>`-based collapsible card, used across Property Profile/KPI tabs |
| `propertyLabel.ts` | Single helper resolving a property's display label to its address (roadmap 8.6) |
| `installPrompt.ts` | PWA install-prompt capture (roadmap 12.5) |
| `supabaseClient.ts` | The one Supabase client instance |
| `auth/AuthContext.tsx` | Session + `accountId` context, wraps the whole app |
| `exporting/tableExport.ts` | Shared CSV/PDF table export (jsPDF), used by Financials/Chart of Accounts exports |
| `pickLists/` | The generic account-scoped pick-list system (roadmap 8.1): `pickListsQueries.ts`, `usePickListOptions.ts`, `PickListSelect.tsx` (dropdown), `ManageOptionsPanel.tsx` (add/archive UI) |

## Module map (`src/modules/*`)

Each entry: purpose, roadmap origin, files. "Queries / Hook / UI" follows
the standard shape unless noted.

### properties (15 files) — the core entity
Property CRUD, registry list, and the tabbed Property Profile (Overview /
Financials / Mortgage / KPI / Activity & Documents) that hosts most other
per-property modules as embedded sections.
`propertiesQueries.ts`, `usePropertyRegistry.ts`, `usePropertyProfile.ts`,
`PropertyRegistry.tsx`, `PropertyList.tsx`, `PropertyForm.tsx`,
`PropertySummary.tsx` (read-only view, roadmap 7.7), `PropertyProfile.tsx`
(tab shell) + one `PropertyProfile*Tab.tsx` per tab: Overview,
Transactions (labeled "Financials"), Mortgage, and
`PropertyProfileActivityDocumentsTab.tsx` (the roadmap 7.9/7.14 merged
tab, which composes the older `ActivityTab`/`DocumentsTab`/`HistoryTab`
components internally rather than duplicating their content — correctly
reused, not orphaned).

### units (4 files)
Units as a real per-property entity (roadmap 7.2), embedded inside the
Overview tab's collapsible "Units" box. `unitsQueries.ts`, `useUnits.ts`,
`UnitsSection.tsx` (also composes PropertySpecs/LeasingListings/Tenants/
Utilities per-unit), `UnitForm.tsx`.

### propertySpecs (5 files)
Free-form key/value specs log (roadmap 7.4), usable at property level or
scoped to one unit via `unitId`.

### leasingListings (5 files)
Per-unit listing history — platform, date posted, days-live, notes
(roadmap 7.3).

### tenants (9 files)
Tenant as a real linked entity + lease terms folded into `tenant_units`
(roadmap 8.4/8.5). `tenantsQueries.ts` (tenant CRUD), `propertyTenantsQueries.ts`
+ `useTenantAssignments.ts` (assignment/lease-term CRUD),
`TenantAssignmentsSection.tsx` (per-unit, nested in UnitsSection),
`PropertyTenantsOverview.tsx` (property-wide rollup).

### utilities (5 files)
Utility records per property/unit — type, responsibility, notes
(roadmap 7.12).

### llcs / holdingCompanies (3 files each)
LLC and Holding Company as real linked entities (roadmap 8.2/8.7).
`useLlcs.ts` is shared by every LLC picker (Property Registry, Overview
tab); its label folds in the holding company name automatically.

### vendors (5 files)
Vendor as a real linked entity (roadmap 8.3), plus Split Rules (roadmap
8.8) — saved reimbursement percentages, never auto-applied.

### documents (1 file)
`documentsQueries.ts` only — no dedicated UI module. Backs the Documents
tab, Reconciliation's reconcile-to-Documents move, and
`financials/TransactionDocuments.tsx`'s per-transaction attachments.
Everything else in this module lives inside the modules that use it.

### capture (9 files)
Quick Capture Inbox (roadmap 1.3, redesigned 1.5–1.11) — mobile-first
receipt/visit/communication logging, staged in its own storage bucket
until reconciled.

### reconciliation (4 files)
Mounts at the "Action queue" nav destination. Two unrelated sections on
one page: `ActionQueueBoard` (from `actionQueue/`, roadmap 10.2) and the
original Reconciliation Queue (roadmap 1.4/2.6, unreconciled Capture
entries). See audit report.

### actionQueue (7 files)
The unified action-item data model (roadmap 10.2) — property/unit/type/
assignee/due date/recurring, its own `action_items` table. Does **not**
replace Tasks (2.2) — see audit report's Duplication section.

### tasks (6 files)
The original Task Engine (roadmap 2.2) — per-property to-dos, its own
`tasks` table. Structurally near-identical to `actionQueue`. Deliberately
not consolidated (see audit report).

### financials (11 files) — largest module
Income/expense ledger, tax-ready CSV export, per-transaction document
attachments (9.6) and audit history (9.17), PDF/CSV list export (9.11).
`useFinancials.ts` also owns the property-filter dropdown and pulls in
`useVendors`/pick lists for the transaction form.

### bankReconciliation (6 files)
Real statement-matching tool (roadmap 9.16) — starting balance +
transactions vs. an ending statement balance. Distinct from
`reconciliation/` (Action Queue's Reconciliation Queue) despite the
similar name — see audit report's naming-clarity note.

### financialPeriods (3 files)
Year-end lock/reopen (roadmap 9.19), enforced at the DB layer
(`financial_transactions_lock_guard` trigger) so no application code path
can bypass it.

### chartOfAccounts (7 files)
Chart of Accounts (roadmap 9.1) — the Asset/Liability/Income/Expense
bucket list + category mappings. Lives at `/settings` now, moved out of
Financials.

### reports (7 files)
Balance Sheet / P&L / Cash Flow (roadmap 9.2–9.4), each its own report
component sharing `reportsCalculations.ts` and `reportsQueries.ts`.

### depreciation (4 files)
Cost basis + straight-line depreciation calc (roadmap 9.15), embedded on
the Mortgage tab (`CostBasisSection`).

### mortgagePayoff (14 files) — second-largest module
Per-property mortgage details, payment ledger, escrow ledger (9.14),
payoff scenario calculator, voiding (9.20), plus the portfolio-wide
rollup screen (`MortgagePortfolio.tsx`/`MortgagePortfolioTable.tsx`,
roadmap 7.6). `useMortgageForProperty.ts` is the one file over the
~300-line size threshold — see audit report for a proposed split.

### propertyTax (5 files)
Property Tax Installment ledger (roadmap 9.5), embedded on the Overview
tab.

### propertyKpi (6 files)
The Property Profile's KPI tab (roadmap 7.13) — Market & Financial
Snapshot, Occupancy Snapshot, Follow-ups (reads from `actionQueue`).

### securityDeposits (6 files)
Security deposit tracking as a Liability (roadmap 9.13) — deposit
received/applied/returned as explicit transactions, never a silent
balance adjustment.

### rentOps (6 files)
Invoicing, receipts, on-time payment tracking (roadmap 2.1).

### mileage (6 files)
Quick-entry mileage log tied to a property, with a Financials rollup
(roadmap 9.10).

### auditLog (4 files)
The generic audit trail (roadmap 7.8, extended to Financials by 9.17 and
to Financial Periods by 9.19) — one `audit_log` table, one Postgres
trigger function (`log_audit_changes()`) attached to every audited table.
`auditLogQueries.ts`/`auditLogFormatting.ts` are the reusable pieces;
each consumer (Property History tab, `financials/TransactionAuditHistory.tsx`)
builds its own thin display on top.

### auth (3 files)
Login form only. Session state itself lives in `shared/auth/AuthContext.tsx`.

### account (6 files)
2FA enrollment + password reset (roadmap 12.2), rendered as a sidebar
popover, not a route. See audit report re: overlap with `/settings`.

### settings (4 files)
`/settings` page (roadmap 12.1) — houses Chart of Accounts and the
centralized pick-list manager. Does not yet include security (still in
`account/`) or billing (Phase 5, not built).

### commandCenter / automations (1 file each)
Nav placeholders (roadmap 10.1) for Phase 3 (Command Center — per-property
email) and Phase 11 (Automations — agent roster). No functionality yet
beyond the page shell.

## Database (`supabase/migrations/`)

One migration file per feature, applied sequentially, never edited after
the fact. Every table is `account_id`-scoped with RLS via the shared
`is_account_member(account_id)` function (defined in the first migration).
Soft-delete/void columns (`voided`, `voided_at`) are used throughout in
place of hard deletes, per CLAUDE.md's Data safety rule.
