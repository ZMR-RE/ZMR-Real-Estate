# ZMR Real Estate — Build Roadmap

**ZMR Real Estate** = your account name inside the platform (account #1 of what will eventually be a multi-tenant SaaS).
**Platform/SaaS name** = TBD — not a blocker, resolve before Phase 5.

Numbering: phases are whole numbers (0, 1, 2...). Items within a phase are decimals (1.1, 1.2...). New items get appended as the next decimal in their phase, or as a new sub-item (e.g., 2.6) if discovered mid-phase — never renumber existing items. Check items off, don't delete them, so the count reflects real progress.

---

## 0. Foundation (prerequisites — nothing else starts until these are done)
- [ ] 0.1 Confirm platform/SaaS name + verify domain and trademark availability (non-blocking for engineering — can run in parallel/background)
- [x] 0.2 Provision GitHub repo + Supabase project + Netlify site — separate from the My Earth Market stack
- [x] 0.3 Design multi-tenant schema: `accounts`, `users`, `properties` tables + row-level security scoping every table to `account_id`
- [x] 0.4 Write CLAUDE.md build rules for this repo (session management, inspect-first methodology — adapted from the My Earth Market pattern)

## 1. Phase 1 — Core Foundation (single-threaded build; schema not stable enough yet for parallel terminals)
- [x] 1.1 Auth + account scaffolding — ZMR Real Estate created as the first account
- [ ] 1.2 Property Registry — property record, LLC, unit config, lease terms, utilities, insurance (5336 W Foster Ave, 2169 Ash St) — PARTIAL: property record/LLC/unit config/insurance are live and editable (verified); lease_terms and utilities exist only as unused jsonb columns with no UI anywhere, not started
- [x] 1.3 Quick Capture Inbox — mobile entry flow: Receipt / Visit / Communication (button selector — fixed set of 3), property (searchable/type-ahead dropdown — scales past 10+ properties), date (defaults today, editable), photo AND PDF attachment. Files stage in Supabase Storage on capture so it always works, even before Drive integration exists.
- [x] 1.4 Reconciliation Queue — unreconciled items view, manual triage

## 2. Phase 2 — Parallelized Build (5 terminals, once Phase 1 schema is locked and stable)
- [x] 2.1 Rent Ops — invoicing, receipts, on-time payment tracking
- [x] 2.2 Task Engine — per-property to-do lists, recurring items, "coming up" view across the portfolio
- [x] 2.3 Financials & Tax Readiness — income/expense by property and category, tax-ready export
- [ ] 2.4 Historical Data Backfill — import past bookkeeping/purchase dates for both properties — PARTIAL: purchase_date column added and backfilled via migration only, no UI ever displays or edits it; bookkeeping backfill not started
- [x] 2.5 Document Storage Architecture — native Supabase Storage: a `documents` table plus a private `documents` bucket, path convention `{account_id}/{property_id}/{category}/{filename}`, linked from each property's Documents tab
- [x] 2.6 Reconcile-to-Documents move action — on reconciliation, move the staged file from Quick Capture's staging bucket into its permanent Documents path above, and create its documents table record at that point — not before

## 3. Phase 3 — Reuse & Integrations
- [ ] 3.1 Port Communication Hub from My Earth Market dashboard — adapt existing Gmail management code for per-property email accounts
- [ ] 3.2 Connect each property's dedicated email account into the hub
- [ ] 3.3 Command Center — property-scoped email management: add multiple email accounts, tag each to a property, foundation for an AI agent to eventually handle that property's tenant invoicing, receipts, and notifications through its own email
- [ ] 3.4 Configurable Document Routing Rules — account-level settings: define "this document type → this Drive folder → this naming pattern" (naming pattern supports placeholders like property/date/vendor/doc type). User-configurable per account, not hardcoded, so it works identically for future resale customers as it does for ZMR

## 4. Phase 4 — Intelligence Layer
- [ ] 4.1 AI reconciliation agent — auto-match captured items to the right property/expense/task
- [ ] 4.2 Performance Benchmarking — property income/ROI vs. market or national averages, keep-vs-sell signal
- [ ] 4.3 AI agent: automated invoice generation
- [ ] 4.4 AI agent: automated receipt generation and payment tracking
- [ ] 4.5 AI agent: bookkeeping automation (categorization, reconciliation matching)

## 5. Phase 5 — Productization (deferred until Phases 1–4 are proven on your own two properties)
- [ ] 5.1 Signup/onboarding flow for new customer accounts
- [ ] 5.2 Billing/subscription integration
- [ ] 5.3 "Blank template" account creation flow for new customers
- [ ] 5.4 Finalize platform branding + marketing site
- [ ] 5.5 Billing/subscription integration (Stripe or equivalent), enforcing the tier architecture reserved in 8.10
- [ ] 5.6 Terms of Service / Privacy Policy (legal requirement before handling other customers' financial and personal data)
- [ ] 5.7 Guided onboarding flow for a new blank-dashboard account (e.g. "add your first property" walkthrough)
- [ ] 5.8 Basic uptime/error monitoring

## 6. Phase 6 — Analysis & Growth Tools
- [ ] 6.1 Research/prospecting tool — analyze properties not yet owned
- [x] 6.2 Mortgage payoff scenario calculator — model paying off a specific property's loan faster

## 7. Phase 7 — Entity Depth (Property & Mortgage Profiles)
- [x] 7.1 Property Profile page — tabbed detail view per property: Overview, Transactions, Activity Log, Documents
- [ ] 7.2 Units as a real entity — a property can have multiple units, each with its own record (replaces the current free-text unit field)
- [ ] 7.3 Leasing/Listing Tracker — per unit: platform posted to, date posted, days live, prospective tenant notes
- [x] 7.4 Property Specs/Measurements Log — key-value specs per unit (e.g. door dimensions) with last-updated timestamp — property-level scope built and verified live (per task scope, since 7.2 units don't exist yet); schema has a ready-but-unused unit_id column for per-unit scoping once 7.2 lands
- [x] 7.5 Move the existing per-property mortgage details, payment logging, and scenario calculator out of the standalone Mortgage Payoff screen and into a new "Mortgage" tab on the Property Profile (alongside Overview, Transactions, Activity Log, Documents) — reuse the existing mortgage_details/mortgage_payments logic and components rather than rebuilding them, same as how the Transactions tab reused Financials' query
- [x] 7.6 Repurpose the now-former standalone Mortgage Payoff nav item into a portfolio-wide view: total mortgage balance, total equity, and overall loan-to-value across all properties combined — a rollup, not a per-property editor
- [ ] 7.7 Convert Property Profile's Overview tab (and the Mortgage tab's terms section) from always-editable to view-by-default with an explicit Edit action, per the new Data integrity rule — PARTIAL: Mortgage tab's terms section is done (view-by-default + "Edit mortgage details" button, verified live); Overview tab is still always-editable, not started
- [x] 7.8 Basic audit trail — track who changed a field and when, on Property, LLC, and Mortgage records. Directly useful once other people (or your future customers) are editing shared data, not just you
- [ ] 7.9 Revise Property Profile tabs to: Overview, Financials, Mortgage, KPI, Activity & Documents (merged)
- [ ] 7.10 Overview tab: core fields always visible (address, LLC, status, market value, property facts, insurance section with coverage dates + attached document, contact email with "+ Add email" for multiple), plus collapsible boxes below: Tenants, Units (near bottom, reference-only). SEQUENCING NOTE: build the Units box first — it only depends on existing 7.2. Do NOT build the Tenants box until 8.4 (Tenant as a real linked entity) exists; building it against a placeholder first means rebuilding it once 8.4 lands. Interleave Phase 7 and Phase 8 execution accordingly even though item numbering stays as written.
- [ ] 7.11 Units: building-level exterior specs (year built, roof, foundation, construction, # units) shown once; per-unit specs (floor, rooms, bed/bath, appliances) and per-unit status (rented/vacant-ready/renovating/listed); unit field labeled "Unit #"
- [ ] 7.12 Utility records: linked to Property (building-level) or Unit (unit-level), each with type + responsibility (Owner/Tenant/Split) + notes
- [ ] 7.13 KPI tab: collapsible cards — Market & Financial Snapshot (Redfin/Zillow value + date, current loan balance, net equity, LTV, annual rent, YTD net cash flow, cash-on-cash ROI), Occupancy Snapshot, Follow-ups (pulls from Action Queue)
- [ ] 7.14 Activity & Documents tab: merged, collapsible boxes per category
- [ ] 7.15 Action Queue priority color system: red = overdue OR property status = Sold; yellow = due soon; default = normal. When a property's status changes to Sold, all of its open Action Queue items automatically turn red rather than requiring per-transaction-type logic.

## 8. Phase 8 — Pick-Lists & Linked Records
- [x] 8.1 Generic configurable pick-list system (account-level add/archive options) — apply to expense category/subcategory, payment method, document type, task type
- [ ] 8.2 LLC / Ownership Entity as a real linked-record table, linked to Property (replaces current field)
- [ ] 8.3 Vendor as a real linked-record table, linked to Transactions and Tasks
- [ ] 8.4 Tenant as a real linked-record table, linked to Lease/Unit
- [ ] 8.5 Lease as a real linked-record entity, linked to Unit + Tenant (term dates, rent amount)
- [ ] 8.6 Property address as the canonical identifier across the app (search, dropdowns, headers) — supersedes any name-based identification; 7.2's Unit display convention follows this ({address} — {unit label})
- [ ] 8.7 Holding Company as a real linked entity: Holding Company → owns → LLC → owns → Property (not required data until formed)
- [ ] 8.8 Vendor-level Split Rule: saved reimbursement percentage per vendor (e.g. pest control, 50/50); user must manually apply it per transaction every time — never auto-applied, no setting to change this
- [x] 8.9 Multi-user role-based access per account: architecture (users-to-account many-to-many with a role field) reserved now; permission UI and enforcement built later — satisfied by the existing `account_members` table (account_id/user_id/role, from Phase 0's initial schema); no new schema needed, role isn't read by any permission check yet
- [x] 8.10 Account `tier` field + per-feature tier-requirement flag reserved now on all accounts/modules; tier enforcement and tier definitions built in Phase 5

## 9. Phase 9 — Bookkeeping Depth
- [x] 9.1 Chart of Accounts screen: preloaded with a standard rental real-estate chart of accounts, user-editable (add/remap accounts)
- [ ] 9.2 Balance Sheet report (property value + cash − mortgage balance = equity), portfolio-wide or per-property
- [ ] 9.3 Profit & Loss report (Schedule E format), portfolio-wide or per-property
- [ ] 9.4 Cash Flow report
- [x] 9.5 Property Tax Installment ledger (year, 1st/2nd installment + date paid, attached document per bill) — feeds KPI tax-trend card
- [ ] 9.6 Per-transaction document attachment field — upload, stored via the 2.5 document architecture
- [ ] 9.7 Monthly reconciliation checklist (recurring template in Action Queue): bank/CC statement reconciliation, rent received vs. invoiced, invoices sent, mortgage payment posted, security deposits reconciled, lease renewals approaching, insurance renewal approaching, tax installment due, year-end 1099 prep
- [ ] 9.8 Manual bank/credit card statement import (CSV upload + parsing + categorization) as the near-term alternative to live bank-feed sync
- [ ] 9.9 Receipt-to-transaction attachment: a Log It capture can be linked to an existing transaction (imported or manual) in Reconciliation
- [x] 9.10 Mileage log: quick-entry in Log It, tied to a specific property; rollup summary surfaced in Financials for tax purposes
- [ ] 9.11 Export function (PDF/CSV) for any report, for sending to an accountant
- [ ] 9.12 QuickBooks/Xero-compatible export format, in addition to Schedule E native reporting (9.3)
- [x] 9.13 Security deposit tracking: dedicated Liability account (not Income); explicit transactions for deposit received, deposit returned, and deposit applied to damages, each clearing the liability correctly
- [x] 9.14 Mortgage escrow tracking: where a mortgage escrows property tax/insurance, track that escrow balance separately from principal/interest so it isn't double-counted or missing from the property tax ledger (9.5) or loan-balance KPI
- [ ] 9.15 Depreciation / cost basis tracking: track each property's cost basis (purchase price + capital improvements, distinct from repairs per the existing repair-vs-improvement field) and calculate annual depreciation (standard 27.5-year straight-line for residential) for Schedule E accuracy
- [x] 9.16 Real bank reconciliation tool: match a starting balance + transactions to an ending statement balance and surface discrepancies — not just a checklist reminder (9.7), an actual matching mechanism
- [ ] 9.17 Extend the audit trail (7.8) to financial transactions: who edited or voided a booked transaction and when
- [ ] 9.18 Historical Data Backfill (2.4) must establish real opening balances per Chart of Accounts account as of the backfill date, so the Balance Sheet (9.2) is accurate for periods before backfill
- [ ] 9.19 Year-end closing/lock: ability to lock a financial period after it's been handed to an accountant; reopening a locked period is an explicit action, logged in the audit trail (9.17)

## 10. Phase 10 — Navigation & Action Consolidation
- [x] 10.1 Rename left nav to: Properties, Log It, Action Queue, Financials & Tax, Command Center, Automations, Portfolio KPIs
- [ ] 10.2 Action Queue: single task/action data model (property/unit/type/assignee/due date/recurring), collapsible boxes by type; same records surface filtered on each property's own Overview — no duplicate entry between portfolio-wide and per-property views
- [ ] 10.3 Portfolio KPIs (nav item): portfolio-wide rollup — mortgage/equity/LTV (existing 7.6), performance vs. market (existing 4.2) — collapsible cards
- [ ] 10.4 Command Center: implement existing Phase 3 (3.1–3.4); elevate to a visible nav item as soon as Phase 3 is built, rather than remaining a designed-but-invisible phase

## 11. Phase 11 — Automations / Agent Roster
- [ ] 11.1 Automations nav section: agent-roster pattern adapted from My Earth Market's Operations Hub (named agent profiles, health-state, training/active/paused status, dependency on which module, audit log) — adapted for ZMR's multi-tenant/RLS model, not a direct copy-paste

## 12. Phase 12 — Settings & Account Administration
- [ ] 12.1 Settings area (account-level, separate from main nav flow): houses Chart of Accounts management, pick-list management (8.1), security (2FA, password reset), and future billing/tier management
- [ ] 12.2 Two-factor authentication + password reset flow
- [ ] 12.3 Optional Drive-backed document storage: account-level Settings toggle (default: platform storage) letting a customer choose to store a given property's documents in their own connected Google Drive instead — only available once that property's email/Drive is OAuth-connected via Command Center (3.2)

## 13. Phase 13 — External AI Connector
- [ ] 13.1 Build a remote MCP server exposing scoped, read/write ZMR tools (e.g. get action queue, get portfolio KPIs, log a transaction) — each connecting user authenticated via OAuth 2.0, mapped to their own account_id, so they can only ever access their own data
- [ ] 13.2 Reuse the OAuth infrastructure built for Command Center (3.2) rather than building a separate auth layer — sequence this phase after Command Center is complete
- [ ] 13.3 Support both Claude (Claude.ai, Cowork, Claude Desktop) and ChatGPT as connecting clients, since both support the open MCP standard; note ChatGPT's write-access support varies by the customer's own ChatGPT plan tier, which is outside our control
- [ ] 13.4 Submit to Anthropic's MCP Connector Directory once stable, for discoverability (optional — the server works as a custom connector even before/without directory approval)

## Future Considerations (not yet phased — logged so they aren't lost)
- Online rent collection (actual ACH/card payment processing) — deferred; meaningful compliance/integration lift, revisit once there's a revenue model to absorb per-connection costs. Current payment methods: cash, check, Zelle.
- Live automated bank-feed sync (e.g. via Plaid) — deferred to a future paid tier once subscription revenue can absorb per-connection cost; manual CSV import (9.8) is the interim solution
- Tenant self-service portal (view lease, pay rent, submit maintenance requests) — real resale differentiator once Tenant/Lease entities (8.4/8.5) exist, but new UI surface, not a small add
