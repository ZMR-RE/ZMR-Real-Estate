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
- [x] 1.5 Revert nav label and screen heading from "Log it" back to
      "Quick capture" (sentence case)
- [x] 1.6 Make capture-type selection mandatory before other fields
      appear; add Mileage as a 4th type alongside Receipt/Visit/
      Communication, each showing only its relevant fields — consolidated
      into the existing Mileage Log mechanism (roadmap 9.10) rather than
      running two parallel mileage entry points; standalone Mileage Log
      form retired, Financials' mileage rollup repointed at capture_log
- [x] 1.7 All type-relevant fields available and fillable at capture
      time. Attachment is optional. Only type, property, and date are
      required to save. CORRECTED — originally checked off without the
      actual per-type fields existing (every type but Mileage rendered
      the same generic Property/Date/Notes/Attachments set). Now built:
      Receipt gets vendor (text), amount (currency), category (reuses
      the existing 'subcategory' pick list from Financials/8.1); Visit
      gets an optional "who was met with" (text) alongside its existing
      notes; Communication gets contact name (text), method (new
      'contact_method' pick list, seeded phone/email/text/in-person),
      and subject (text). All new fields optional per this item's own
      rule — live-verified saving with only type/property/date still
      works and shows "Needs details."
- [x] 1.8 Support up to 25 attachments per capture entry — cap enforced
      in code (useCaptureForm.ts, captureActions.ts); live-tested with
      1-2 files, not literally 25, so re-verify under real load if issues
      surface
- [x] 1.9 Add delete/void action for a staged (not-yet-reconciled)
      capture entry
- [x] 1.10 Quick Capture's "Recently logged" view and Reconciliation
      (Action Queue) read from one shared underlying data source — no
      duplicate storage, per the new Single source of truth rule
- [x] 1.11 Two independent status indicators per entry: Complete/Needs
      details (green highlight when complete, filterable) and
      Reconciled/Not reconciled — displayed separately. "Mark complete"
      manual override and any remaining-field completion happens in
      Recently logged/Reconciliation, never in Quick Capture itself.
      An item cannot be marked Reconciled while still Needs details,
      except via the explicit manual-complete override.
- [x] 1.12 Add an in-app light/dark mode toggle (in Settings) so the
      user isn't dependent on OS-level preference to preview both modes
      — Settings > Appearance (Match device/Light/Dark), applied before
      first paint, persisted to localStorage. Surfaced a real bug while
      verifying live: the sidebar's "Settings" link was invisible in
      light mode (navy text on matching navy background) since it had
      never been reachable without an OS-level change before — fixed
      alongside this item
- [x] 1.13 Fix type-selector button shape inconsistency: selected state
      must change color/fill only, never change from rounded-square to
      circular
- [x] 1.14 Convert Quick Capture into two tabs at the top of the screen:
      "Capture" (the entry form) and "History" (the current "Recently
      logged" section) — remove the long vertical scroll-to-reach pattern
- [x] 1.15 Rebuild "History" (formerly Recently logged) as a real table:
      columns for type, property, date, and both status indicators
      (Complete/Needs details, Reconciled/Not reconciled), filterable by
      type — not the current unstructured list
- [ ] 1.16 Receipt: add Unit (optional, shown only if property has
      units), Payment method (optional, reuse existing Financials
      pick-list), Repair vs. Improvement (optional dropdown). Reorder
      Receipt's fields to: Property, Unit, Date, Vendor, Amount,
      Category, Payment method, Repair/Improvement, Notes, Attachments.
- [ ] 1.17 Vendor field must link to the real Vendors entity (8.3),
      not remain free text — dropdown with inline "+ Add vendor",
      matching the same pattern already used for Organization type.
      Add a Vendor management view in Settings (list, add, archive,
      restore) alongside the existing Organization types view.
- [ ] 1.18 Amount field: format/round to 2 decimal places (currency),
      reject more than 2 decimal digits of input.
- [ ] 1.19 Fix Category/Subcategory UI: replace the separate "Manage
      subcategories" button with the standard "Manage options" pattern
      used everywhere else in the app — same component, same
      interaction, no bespoke model for this one field.
- [ ] 1.20 Add Visit type (pick-list): seed with Maintenance/Repair,
      Estimate/Quote, Inspection, Tenant meeting, Showing, Move-in/
      Move-out, Other.
- [ ] 1.21 Mileage: add optional Start destination and End destination
      fields. When both are filled and miles are recorded, save this as
      a reusable named trip. Selecting a previously-used trip auto-fills
      its recorded mileage. Miles + description alone (no start/end)
      still counts as a complete, valid entry.
- [ ] 1.22 Verify Property field never shows an "add new" option inside
      Quick Capture — properties must only be addable via Property
      Registry, then appear automatically in every property picker.
- [ ] 1.23 Verify Date field defaults to today's date on every new
      capture, remains freely editable.
- [x] 1.24 Redesign History's filter bar: consolidate the current two
      dropdowns ("Type" and "Show") into one clear, non-overlapping
      filter. Show real column headers (Type / Property / Date /
      Complete / Reconciled) at all times, including the empty state
      ("Nothing logged yet") — so the screen's structure is visible
      before any data exists.

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
- [x] 7.2 Units as a real entity — a property can have multiple units, each with its own record (replaces the current free-text unit field)
- [x] 7.3 Leasing/Listing Tracker — per unit: platform posted to, date posted, days live, prospective tenant notes
- [x] 7.4 Property Specs/Measurements Log — key-value specs per unit (e.g. door dimensions) with last-updated timestamp — property-level scope built and verified live (per task scope, since 7.2 units don't exist yet); schema has a ready-but-unused unit_id column for per-unit scoping once 7.2 lands
- [x] 7.5 Move the existing per-property mortgage details, payment logging, and scenario calculator out of the standalone Mortgage Payoff screen and into a new "Mortgage" tab on the Property Profile (alongside Overview, Transactions, Activity Log, Documents) — reuse the existing mortgage_details/mortgage_payments logic and components rather than rebuilding them, same as how the Transactions tab reused Financials' query
- [x] 7.6 Repurpose the now-former standalone Mortgage Payoff nav item into a portfolio-wide view: total mortgage balance, total equity, and overall loan-to-value across all properties combined — a rollup, not a per-property editor
- [x] 7.7 Convert Property Profile's Overview tab (and the Mortgage tab's terms section) from always-editable to view-by-default with an explicit Edit action, per the new Data integrity rule
- [x] 7.8 Basic audit trail — track who changed a field and when, on Property, LLC, and Mortgage records. Directly useful once other people (or your future customers) are editing shared data, not just you
- [x] 7.9 Revise Property Profile tabs to: Overview, Financials, Mortgage, KPI, Activity & Documents (merged)
- [x] 7.10 Overview tab: core fields always visible (address, LLC, status, market value, property facts, insurance section with coverage dates + attached document, contact email with "+ Add email" for multiple), plus collapsible boxes below: Tenants, Units (near bottom, reference-only). SEQUENCING NOTE: build the Units box first — it only depends on existing 7.2. Do NOT build the Tenants box until 8.4 (Tenant as a real linked entity) exists; building it against a placeholder first means rebuilding it once 8.4 lands. Interleave Phase 7 and Phase 8 execution accordingly even though item numbering stays as written. — PARTIAL GAPS: insurance is document-linked only (no coverage-date fields — not an existing schema field, not guessed at); contact email stays the single existing property field (no multi-email "+ Add email" array yet). Also relocated Property tax installments (9.5), Specs & measurements (7.4), and Security deposits into their own collapsible boxes on this tab, beyond the two boxes named in this item, since they were previously flat on Overview and had nowhere else to live.
- [x] 7.11 Units: building-level exterior specs (year built, roof, foundation, construction, # units) shown once; per-unit specs (floor, rooms, bed/bath, appliances) and per-unit status (rented/vacant-ready/renovating/listed); unit field labeled "Unit #" — verified existing 7.2/7.4 structure and adjusted (label wording) rather than rebuilding; now nested inside Overview's Units collapsible box per 7.10.
- [x] 7.12 Utility records: linked to Property (building-level) or Unit (unit-level), each with type + responsibility (Owner/Tenant/Split) + notes — net-new module (utility_records table + utilities module); available at property level on Overview and per-unit inside each unit card.
- [x] 7.13 KPI tab: collapsible cards — Market & Financial Snapshot (Redfin/Zillow value + date, current loan balance, net equity, LTV, annual rent, YTD net cash flow, cash-on-cash ROI), Occupancy Snapshot, Follow-ups (pulls from Action Queue) — cash-on-cash ROI and market-value-as-of-date not shown (no field tracks total cash invested or a value-as-of date; card states "Not enough data yet" rather than guessing). Follow-ups is an explicit placeholder pending 10.2 (Action Queue unified data model), per this item's own "pulls from Action Queue" dependency.
- [x] 7.14 Activity & Documents tab: merged, collapsible boxes per category
- [x] 7.15 Action Queue priority color system: red = overdue OR property status = Sold; yellow = due soon; default = normal. When a property's status changes to Sold, all of its open Action Queue items automatically turn red rather than requiring per-transaction-type logic. — built now that 10.2 (Action Queue unified data model) and 89e32bf ('sold' as a valid properties.status) are both live. Pure `actionItemPriority()` helper reads `item.property.status` straight off the item's live-joined property on every render — a real-time check, not a snapshot — so flipping a property to Sold turns all its open items red immediately, no per-item write or special-case trigger. "Due soon" = within 7 days (inclusive), a threshold chosen for this item since none was specified. Coloring applied once in the shared `ActionItemList` component, so both surfaces that render it (portfolio-wide Action Queue board and each property's KPI → Follow-ups card) pick it up automatically. Verified live: overdue item red, 10+ day-out item default, property flipped to Sold turned its open item red on both surfaces with no additional edit. This closes out Phase 7 (7.1–7.15), all complete.
- [x] 7.16 Move "Edit" action to the upper-right of the screen header,
      standard placement (was bottom of form)
- [x] 7.17 Freeform upload-or-link entry, not tied to any specific
      transaction or tax installment — extends the existing documents
      table (nullable storage_path/file_size, link_url/label columns,
      one-or-other check constraint). Originally built as its own
      "Documents & links" section on Property Overview, but that
      duplicated the Activity & Documents tab (7.14) and violated
      Single Source of Truth — corrected to remove the standalone
      Overview section and move the add-form directly into Activity &
      Documents' "Documents" box, which already showed the full,
      unfiltered list read-only; it now both displays and creates from
      one place. Also adds a third entry type, Google Drive folder
      (nullable link_type column, 'drive_folder' or null): same
      open-in-new-tab link mechanic as a plain reference link, but
      rendered as "Open in Drive" instead of "Open link" to keep it
      visibly distinct from a plain link or a file upload
- [x] 7.18 Financial accounts reference: bank account(s)/credit card(s)
      associated with a property — nickname + last 4 digits only, NEVER
      a full account/card number (hard rule, no exceptions) — enforced
      both in the form and by a DB check constraint on last_four; no
      column exists anywhere capable of holding a full number
- [x] 7.19 Property value & rent value history: dated log entries per
      property (source, value, date) for market value — sources like
      Zillow/Redfin/other — replacing the single static market_value
      field. Same pattern for rent value (a market/asking-rent estimate,
      distinct from tenant_units.rent_amount's actual lease rent),
      tracked over time even while occupied. Manual entry only in this
      phase. New property_value_logs table (metric discriminator column
      rather than two near-identical tables) + property_latest_values
      view (latest non-voided entry per property/metric) feeding every
      former consumer of the dropped market_value column: Mortgage tab
      equity/LTV, Portfolio KPI rollup, Balance Sheet report. Surfaced on
      the Overview tab as an add-entry ledger (void, not edit/delete) and
      on the KPI tab's Market & Financial Snapshot card, which now also
      shows an as-of-date + source and a trend table — resolving 7.13's
      original "no value-as-of-date field" gap. Verified live: logged 2
      dated market-value entries, confirmed correct order/display on
      both the Overview ledger and KPI trend table, then voided both
      (test data, not real).
- [x] 7.20 Property Facts fields (structured): property type, purchase
      date, purchase method, property tax ID/PIN, county/township,
      square footage, lot size, zoning/use code — also finally gives
      purchase_date (added back in 2.4, never had a UI) its first field
- [x] 7.21 Structured fields for bedroom count, bathroom count, basement
      (yes/no or description), garage/parking spaces — building-level
      totals; per-unit bed/bath already covered by 7.11, this is the
      whole-building figure only
- [x] 7.22 Property information declutter: identity header (address
      large/prominent, city/state/zip subline, organization type, status
      badge) pulled out of the flat field grid; remaining fields grouped
      into labeled sub-sections (Insurance, Purchase & valuation,
      Physical facts); within each group, fields without a value collapse
      into a single "+ Add …" prompt instead of each showing "—",
      clicking it opens the edit form focused on that group's fields.
      Two fields the task didn't assign to a group were resolved with
      the user directly rather than guessed at: the legacy free-text
      "name" field (superseded by address, per shared/propertyLabel.ts)
      is dropped from this view entirely — still editable via the edit
      form, since its DB column is required — and contact email rides
      in the identity header as a minor secondary line rather than
      getting its own group. Insurance documents (not a PropertyForm
      field) stays a special case within the Insurance group: shown only
      when present, never contributing to that group's "+ Add" prompt.
      PropertyForm's field order was reshuffled to match the three new
      groups (pure reordering, no logic change) so a group's "+ Add"
      prompt lands the user on a contiguous run of that group's inputs,
      not scattered ones. Verified live: an existing mostly-empty
      property (5336 W Foster Ave) shows only its populated fields plus
      one "+ Add …" prompt per group, no wall of dashes; clicking a
      prompt enters edit mode with that exact field scrolled into view
      and focused (confirmed via document.activeElement); saving a value
      moved it out of the prompt into the real display (tested on
      Insurance policy number, then reverted — pre-existing record, only
      the one field edited back to blank, nothing deleted); the generic
      top-right "Edit property" button was confirmed to carry no stale
      focus target left over from an earlier "+ Add" click. Checked in
      both light and dark mode and at a simulated ~420px mobile width
      (iframe-based, since this session's resize_window tool doesn't
      affect this environment's viewport) — header wraps to a stacked
      layout, fields go single-column, no horizontal overflow.

## 8. Phase 8 — Pick-Lists & Linked Records
- [x] 8.1 Generic configurable pick-list system (account-level add/archive options) — apply to expense category/subcategory, payment method, document type, task type
- [x] 8.2 LLC / Ownership Entity as a real linked-record table, linked to Property (replaces current field) — the llcs table, properties.llc_id, and the real-list-plus-"+ Add new LLC" picker already existed (Phase 1); this pass added the missing formation_date field
- [x] 8.2a Rename "LLC" field to "Ownership entity"; rename
      "Individually owned / No LLC" to "Individual ownership"; rename
      "+ Add new LLC" to "+ Add ownership entity"; add edit and
      archive/delete actions for existing ownership-entity records
      (currently add-only) — the "Ownership entity" naming itself was
      superseded before ever shipping (8.2b landed the same session with
      the final "Organization type" name instead); the edit/archive/
      Individual-ownership-rename substance is built and live-verified
      (archive is soft, no hard delete — matches this app's archive
      pattern elsewhere; nothing else here hard-deletes either)
- [x] 8.2b Rename "LLC" field to "Organization type" (supersedes 8.2a's
      earlier naming — use this final name); "Individually owned / No
      LLC" becomes "Individual ownership"; add a "Holding company" view
      showing which LLCs a given Holding Company owns (data model
      already exists per 8.7, this adds the missing display)
- [x] 8.2c Organization type management view: from an Organization type
      (LLC) record, see all properties currently assigned to it, and
      reassign a property to a different Organization type directly from
      that view (not only via each property's own edit form). Multiple
      properties may share one Organization type.
- [x] 8.3 Vendor as a real linked-record table, linked to Transactions and Tasks
- [x] 8.4 Tenant as a real linked-record table, linked to Lease/Unit — built and live-verified by commit 2cf5aea (tenants/tenant_units tables, TenantAssignmentsSection, PropertyTenantsOverview); checkbox was left unchecked in that commit itself, caught by the 2026-09-16 structural audit
- [x] 8.5 Lease as a real linked-record entity, linked to Unit + Tenant (term dates, rent amount) — extended 8.4's tenant_units table (rent_amount, late_fee columns) rather than building a second table: 8.4's own migration comment already called out that tenant_units (one row per tenancy period, start/end dates) was built specifically to become the Lease record once rent/term fields were added, so a separate leases table would only have duplicated that linking
- [x] 8.6 Property address as the canonical identifier across the app (search, dropdowns, headers) — supersedes any name-based identification; 7.2's Unit display convention follows this ({address} — {unit label}) — PropertyProfile.tsx's `<h1>` now uses propertyLabel() (matches every other display site); the Reports module (reportsCalculations.ts's computeBalanceSheet, useReports.ts's propertyOptions) also converted and verified live — Balance Sheet rows and the Property filter dropdown show addresses. Both deferred items from the earlier partial pass are now resolved. Unit display: no cross-property unit listing exists yet to apply the {address} — {unit label} convention to; UnitsSection.tsx shows unit label alone since it's always nested under that property's own page already.
- [x] 8.7 Holding Company as a real linked entity: Holding Company → owns → LLC → owns → Property (not required data until formed)
- [x] 8.8 Vendor-level Split Rule: saved reimbursement percentage per vendor (e.g. pest control, 50/50); user must manually apply it per transaction every time — never auto-applied, no setting to change this
- [x] 8.9 Multi-user role-based access per account: architecture (users-to-account many-to-many with a role field) reserved now; permission UI and enforcement built later — satisfied by the existing `account_members` table (account_id/user_id/role, from Phase 0's initial schema); no new schema needed, role isn't read by any permission check yet
- [x] 8.10 Account `tier` field + per-feature tier-requirement flag reserved now on all accounts/modules; tier enforcement and tier definitions built in Phase 5
- [ ] 8.11 Contacts (extends Vendor, 8.3): notes and a reliability
      score/rating per vendor. Also brainstormed, to be finalized in
      full when this is actually built: (a) a comparison/estimate-
      tracking workflow — log multiple quotes for one job (e.g. 3 roof
      estimates), which one was chosen and why, tracked by date/job; (b)
      a future paid vendor-verification tier (e.g. a one-time $20-25 fee
      for a vendor to be listed as verified/trusted on the platform,
      for resale customers to draw from) — noted as a speculative future
      revenue idea, not yet scoped for build

## 9. Phase 9 — Bookkeeping Depth
- [x] 9.1 Chart of Accounts screen: preloaded with a standard rental real-estate chart of accounts, user-editable (add/remap accounts)
- [x] 9.2 Balance Sheet report (property value + cash − mortgage balance = equity), portfolio-wide or per-property — cash is a cash-basis running balance since inception (all-time income − expense − mortgage principal paid); no opening-balance data exists yet (see 9.18), so this assumes $0 at time zero, same simplification the rest of today's reporting makes
- [x] 9.3 Profit & Loss report (Schedule E format), portfolio-wide or per-property — every standard line shown even at $0; line labels come from each category's Chart of Accounts (9.1) mapping
- [x] 9.4 Cash Flow report — net income adjusted for non-cash depreciation (added back) and mortgage principal paid (a real cash outflow that isn't a P&L expense)
- [x] 9.5 Property Tax Installment ledger (year, 1st/2nd installment + date paid, attached document per bill) — feeds KPI tax-trend card
- [x] 9.6 Per-transaction document attachment field — upload, stored via the 2.5 document architecture
- [ ] 9.7 Monthly reconciliation checklist (recurring template in Action Queue): bank/CC statement reconciliation, rent received vs. invoiced, invoices sent, mortgage payment posted, security deposits reconciled, lease renewals approaching, insurance renewal approaching, tax installment due, year-end 1099 prep
- [ ] 9.8 Manual bank/credit card statement import (CSV upload + parsing + categorization) as the near-term alternative to live bank-feed sync
- [ ] 9.9 Receipt-to-transaction attachment: a Log It capture can be linked to an existing transaction (imported or manual) in Reconciliation
- [x] 9.10 Mileage log: quick-entry in Log It, tied to a specific property; rollup summary surfaced in Financials for tax purposes
- [x] 9.11 Export function (PDF/CSV) for any report, for sending to an accountant — PARTIAL scope per approval: Financials' transaction list and Chart of Accounts covered; other report/list views can adopt the same shared exporter (src/shared/exporting/tableExport.ts) as they come up
- [ ] 9.12 QuickBooks/Xero-compatible export format, in addition to Schedule E native reporting (9.3)
- [x] 9.13 Security deposit tracking: dedicated Liability account (not Income); explicit transactions for deposit received, deposit returned, and deposit applied to damages, each clearing the liability correctly
- [x] 9.14 Mortgage escrow tracking: where a mortgage escrows property tax/insurance, track that escrow balance separately from principal/interest so it isn't double-counted or missing from the property tax ledger (9.5) or loan-balance KPI
- [x] 9.15 Depreciation / cost basis tracking: track each property's cost basis (purchase price + capital improvements, distinct from repairs per the existing repair-vs-improvement field) and calculate annual depreciation (standard 27.5-year straight-line for residential) for Schedule E accuracy
- [x] 9.16 Real bank reconciliation tool: match a starting balance + transactions to an ending statement balance and surface discrepancies — not just a checklist reminder (9.7), an actual matching mechanism
- [x] 9.17 Extend the audit trail (7.8) to financial transactions: who edited or voided a booked transaction and when
- [ ] 9.18 Historical Data Backfill (2.4) must establish real opening balances per Chart of Accounts account as of the backfill date, so the Balance Sheet (9.2) is accurate for periods before backfill
- [x] 9.19 Year-end closing/lock: ability to lock a financial period after it's been handed to an accountant; reopening a locked period is an explicit action, logged in the audit trail (9.17)
- [x] 9.20 Add soft-delete/void support to Mortgage records, matching the existing pattern used for financial transactions and Chart of Accounts entries — currently mortgage records can only be hard-deleted, which conflicts with CLAUDE.md's data-safety rule

## 10. Phase 10 — Navigation & Action Consolidation
- [x] 10.1 Rename left nav to: Properties, Log It, Action Queue, Financials & Tax, Command Center, Automations, Portfolio KPIs
- [x] 10.2 Action Queue: single task/action data model (property/unit/type/assignee/due date/recurring), collapsible boxes by type; same records surface filtered on each property's own Overview — no duplicate entry between portfolio-wide and per-property views — new `action_items` table (property_id/unit_id nullable, type reuses 8.1's task_type pick list, assignee is a plain user FK for now). Surfaces on the KPI tab's Follow-ups card (7.13's named candidate), not Overview — 7.13 built Follow-ups there specifically as this item's landing spot, and Overview has no equivalent placeholder; verified live, one row read by both the portfolio Action Queue and the property's own Follow-ups, no duplication. Mounted at the existing "Action Queue" nav destination (/reconciliation, ReconciliationQueue.tsx) rather than a new route, since wiring a new one would've required touching App.tsx/AppShell.tsx (both out of scope here) — that page now carries two distinct sections (Action Queue, Reconciliation) under one URL as a result. Existing Tasks (2.2) is NOT consolidated into this table: doing so would mean migrating live task rows, rewriting Task Engine's 6 files, and dropping the old `tasks` table afterward (a destructive step needing its own explicit sign-off per CLAUDE.md) — deferred rather than guessed at; Tasks (2.2) continues to run entirely unchanged on its own table.
- [ ] 10.3 Portfolio KPIs (nav item): portfolio-wide rollup — mortgage/equity/LTV (existing 7.6), performance vs. market (existing 4.2) — collapsible cards
- [ ] 10.4 Command Center: implement existing Phase 3 (3.1–3.4); elevate to a visible nav item as soon as Phase 3 is built, rather than remaining a designed-but-invisible phase

## 11. Phase 11 — Automations / Agent Roster
- [ ] 11.1 Automations nav section: agent-roster pattern adapted from My Earth Market's Operations Hub (named agent profiles, health-state, training/active/paused status, dependency on which module, audit log) — adapted for ZMR's multi-tenant/RLS model, not a direct copy-paste

## 12. Phase 12 — Settings & Account Administration
- [x] 12.1 Settings area (account-level, separate from main nav flow): houses Chart of Accounts management, pick-list management (8.1), security (2FA, password reset), and future billing/tier management — FOUNDATIONAL PASS per scope: `/settings` page built, linked from the account/profile menu, housing Chart of Accounts (moved out of Financials & Tax) and centralized pick-list management (8.1), verified live. Security (2FA, password reset) still lives in T4's separate "Account & Security" profile-menu panel (12.2) built before this page existed — T4 may want to move that panel's content into Settings now that it has a real home; billing/tier management still future work (Phase 5)
- [x] 12.2 Two-factor authentication + password reset flow
- [ ] 12.3 Optional Drive-backed document storage: account-level Settings toggle (default: platform storage) letting a customer choose to store a given property's documents in their own connected Google Drive instead — only available once that property's email/Drive is OAuth-connected via Command Center (3.2)
- [ ] 12.4 Consider consolidating Account & Security (12.2) into the Settings area (12.1) now that Settings has a real home — currently two separate menu entries; low priority, not urgent
- [x] 12.5 Installable web app — web app manifest (name, icons, theme color, start URL) plus an "Install app" section in Settings: a real button on Android/Chrome wired to the native `beforeinstallprompt` flow, and written step-by-step instructions for iPhone/Safari (Apple doesn't allow a triggered prompt). Icons are a plain "ZMR" monogram built from the existing design tokens only (--accent background, --bg glyph) — no new colors invented, and no prior app icon existed to coordinate with (the old public/favicon.svg is an unrelated leftover placeholder, untouched by this or the design-system pass). Verified live: Chrome recognized the manifest as installable (real `beforeinstallprompt` event captured, distinct from the generic-browser fallback message) and the Install app button correctly invoked the native prompt; the final accept/decline step is native OS browser chrome outside the reach of page automation, so that last sub-step relies on the API being correctly wired rather than an observed click-through. iOS instructions verified accurate against current Safari behavior and confirmed to render correctly by simulating an iPhone user agent.
- [ ] 12.6 Settings reorganization: convert from one long scrolling page
      into tabs — Bookkeeping (Chart of Accounts, Category mapping),
      Pick lists (grouped by domain: Financial — subcategories/payment
      methods; Property — property types/zoning/purchase methods/unit
      statuses; Operations — task types/document types/contact methods/
      listing platforms — not one flat list of 9+ buttons), Organizations
      (Organization types, Holding companies), Account & Security
      (Password, 2FA), Appearance & App (theme, Install app). Use
      responsive multi-column layout within each tab so wide screens
      aren't left with large empty gray space (same fix pattern as
      Property Overview's 7.22 grouping/space-utilization work).

## 13. Phase 13 — External AI Connector
- [ ] 13.1 Build a remote MCP server exposing scoped, read/write ZMR tools (e.g. get action queue, get portfolio KPIs, log a transaction) — each connecting user authenticated via OAuth 2.0, mapped to their own account_id, so they can only ever access their own data
- [ ] 13.2 Reuse the OAuth infrastructure built for Command Center (3.2) rather than building a separate auth layer — sequence this phase after Command Center is complete
- [ ] 13.3 Support both Claude (Claude.ai, Cowork, Claude Desktop) and ChatGPT as connecting clients, since both support the open MCP standard; note ChatGPT's write-access support varies by the customer's own ChatGPT plan tier, which is outside our control
- [ ] 13.4 Submit to Anthropic's MCP Connector Directory once stable, for discoverability (optional — the server works as a custom connector even before/without directory approval)

## Future Considerations (not yet phased — logged so they aren't lost)
- Online rent collection (actual ACH/card payment processing) — deferred; meaningful compliance/integration lift, revisit once there's a revenue model to absorb per-connection costs. Current payment methods: cash, check, Zelle.
- Live automated bank-feed sync (e.g. via Plaid) — deferred to a future paid tier once subscription revenue can absorb per-connection cost; manual CSV import (9.8) is the interim solution
- Tenant self-service portal (view lease, pay rent, submit maintenance requests) — real resale differentiator once Tenant/Lease entities (8.4/8.5) exist, but new UI surface, not a small add
- AI agent to automatically pull property market value and rent value from external sources (Zillow, Redfin, etc.) instead of manual entry — depends on 7.19 (the value history log) existing first

## Ongoing — Q&A / SOP Log
- [ ] A living reference section (in-app or a maintained doc) answering recurring "how do I do X" questions as they come up during real use (e.g. "how do I add past mortgage information"). Updated whenever a new section is built out or a real question arises — not a one-time deliverable, an evolving document.
