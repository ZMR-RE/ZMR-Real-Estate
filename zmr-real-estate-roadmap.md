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
- [x] 1.2 Property Registry — property record, LLC, unit config, lease terms, utilities, insurance (5336 W Foster Ave, 2169 Ash St)
- [x] 1.3 Quick Capture Inbox — mobile entry flow: Receipt / Visit / Communication (button selector — fixed set of 3), property (searchable/type-ahead dropdown — scales past 10+ properties), date (defaults today, editable), photo AND PDF attachment. Files stage in Supabase Storage on capture so it always works, even before Drive integration exists.
- [x] 1.4 Reconciliation Queue — unreconciled items view, manual triage

## 2. Phase 2 — Parallelized Build (5 terminals, once Phase 1 schema is locked and stable)
- [x] 2.1 Rent Ops — invoicing, receipts, on-time payment tracking
- [ ] 2.2 Task Engine — per-property to-do lists, recurring items, "coming up" view across the portfolio
- [ ] 2.3 Financials & Tax Readiness — income/expense by property and category, tax-ready export
- [ ] 2.4 Historical Data Backfill — import past bookkeeping/purchase dates for both properties
- [ ] 2.5 Document Storage Architecture — Drive folder structure per property, linked from dashboard records
- [ ] 2.6 Reconcile-to-Drive move action — on reconciliation, move the staged file from Supabase Storage into the correct property's Drive folder (tied to that property's email), then clear it from Supabase. Depends on 2.5 and the per-property email mapping from Phase 3. Superseded in practice by 3.4's general routing rules once that lands — this becomes "apply the account's routing rule" rather than hardcoded logic.

## 3. Phase 3 — Reuse & Integrations
- [ ] 3.1 Port Communication Hub from My Earth Market dashboard — adapt existing Gmail management code for per-property email accounts
- [ ] 3.2 Connect each property's dedicated email account into the hub
- [ ] 3.3 Command Center — property-scoped email management: add multiple email accounts, tag each to a property, foundation for an AI agent to eventually handle that property's tenant invoicing, receipts, and notifications through its own email
- [ ] 3.4 Configurable Document Routing Rules — account-level settings: define "this document type → this Drive folder → this naming pattern" (naming pattern supports placeholders like property/date/vendor/doc type). User-configurable per account, not hardcoded, so it works identically for future resale customers as it does for ZMR

## 4. Phase 4 — Intelligence Layer
- [ ] 4.1 AI reconciliation agent — auto-match captured items to the right property/expense/task
- [ ] 4.2 Performance Benchmarking — property income/ROI vs. market or national averages, keep-vs-sell signal

## 5. Phase 5 — Productization (deferred until Phases 1–4 are proven on your own two properties)
- [ ] 5.1 Signup/onboarding flow for new customer accounts
- [ ] 5.2 Billing/subscription integration
- [ ] 5.3 "Blank template" account creation flow for new customers
- [ ] 5.4 Finalize platform branding + marketing site

## 6. Phase 6 — Analysis & Growth Tools
- [ ] 6.1 Research/prospecting tool — analyze properties not yet owned
- [x] 6.2 Mortgage payoff scenario calculator — model paying off a specific property's loan faster

## 7. Phase 7 — Entity Depth (Property & Mortgage Profiles)
- [ ] 7.1 Property Profile page — tabbed detail view per property: Overview, Transactions, Activity Log, Documents
- [ ] 7.2 Units as a real entity — a property can have multiple units, each with its own record (replaces the current free-text unit field)
- [ ] 7.3 Leasing/Listing Tracker — per unit: platform posted to, date posted, days live, prospective tenant notes
- [ ] 7.4 Property Specs/Measurements Log — key-value specs per unit (e.g. door dimensions) with last-updated timestamp
- [ ] 7.5 Move the existing per-property mortgage details, payment logging, and scenario calculator out of the standalone Mortgage Payoff screen and into a new "Mortgage" tab on the Property Profile (alongside Overview, Transactions, Activity Log, Documents) — reuse the existing mortgage_details/mortgage_payments logic and components rather than rebuilding them, same as how the Transactions tab reused Financials' query
- [ ] 7.6 Repurpose the now-former standalone Mortgage Payoff nav item into a portfolio-wide view: total mortgage balance, total equity, and overall loan-to-value across all properties combined — a rollup, not a per-property editor
