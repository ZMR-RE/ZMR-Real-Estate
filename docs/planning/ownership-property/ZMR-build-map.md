# ZMR dashboard — build map and approval process

> Current approval status — September 23, 2026: OWN-01 direction, OWN-02 labels, Batch A (2A–2E, 3A–3B, 5A, 7A), and Batch B (4A–4G) are approved product requirements. These do not approve all parent-item details or live deployment. No live changes are authorized by this planning packet. The approval register controls scope.

Version 0.3 · September 23, 2026 · Planning only

## Purpose and authority

Replace broad phases with small, reviewable implementation batches. Each batch must specify the screen, fields, relationships, interactions, migration, permissions, acceptance tests, and evidence required before it can be considered complete.

The eight-stage order below is approved by the user. New numbered designs and implementation details are proposals. No code change, production migration, or deployment is authorized by this document. Absence of an audit finding never means approval.

The project is located at `/Users/janki/Projects/ZMR-Real-Estate`. An initial read-only rules/source reconciliation is complete; see `ZMR-project-reconciliation.md`, which supersedes conflicting v0.1 assumptions. Actual production schema, migrations applied, permissions and recovery remain unverified. Do not overwrite the existing roadmap; map approved changes into explicit amendments.

Companion files:
- `ZMR-approval-register.md`: approved requirements and numbered proposals.
- `ZMR-ownership-specification.md`: first proposed feature contract.
- `ZMR-builder-handoff.md`: execution gates, prompt template, and audit checklist.

## Confirmed context

- The application contains real property, unit, tenant-related, document, and other records. Treat all existing data as valuable, including records outside the current focus.
- The user is currently entering property and lease/tenant information. Bookkeeping is not the current implementation priority.
- The user's portfolio is the initial customer workspace. A customer workspace is not the same thing as a user account; multiple users may eventually belong to one workspace.
- Future operator console, customer administration, sales CRM, and AI-agent management remain later work. Do not give the first customer's account implicit cross-customer administrator privileges.
- The conceptual layers workspace → ownership entity → property → unit → lease/tenant are accepted. Detailed cardinalities and historical relationships are still to be specified.
- Entity tax classification and elections need to be recorded; bookkeeping and tax reporting are distinct.
- Every finalized document must link to a property or ownership entity so it is discoverable through Documents.
- Quick capture feeds Action queue. Captured items have a record type and an operational category; they need not become financial transactions.
- Valuation sources remain separate time series. Public tax history is distinct from payments actually made by the user.

## Navigation vocabulary

The menu on the left is **primary navigation** or **sidebar navigation**. It selects an application-wide area.

The menu across the top of a profile is **profile tabs**, a form of **secondary navigation**. It changes the view of the currently selected entity/property.

Proposed future entity tabs: Overview, Properties, Bookkeeping, Tax, Documents, Activity. Build only the approved subset; do not add nonfunctional tabs merely to match a mockup.

Proposed property tabs remain contextual: Overview, Financials, Mortgage, Activity, Documents, KPIs. Final labels/order will be approved with their batches. Property Financials reads the property's allocations from entity books; it does not create a second ledger.

## How approval becomes a build

1. Record a numbered proposal with a version and screenshots/mockup.
2. Discuss one bounded group. A comment is a revision request, not approval.
3. Record the user's exact decision, date, item/version, and any conditions.
4. Convert only approved items into a batch manifest. If an item changes materially, issue a revision requiring renewed approval for the changed part.
5. Reconcile project rules and current implementation; identify dependencies and conflicts.
6. Produce the exact builder prompt with approved scope, files to inspect, data contract, visual contract, exclusions, tests, migration, and rollback.
7. Implement in an isolated branch and nonproduction environment, using safe fixtures.
8. Audit against every requirement ID. Mark each pass, fail, or not tested; supply evidence.
9. Review the concrete diff/preview and deployment plan before any production release authorized later by the user.
10. Verify live data preservation after release, then mark the batch verified. Carry unresolved items forward explicitly.

Statuses: Proposed → Discussing → Approved for specification → Ready for build → In progress → Ready for review → Released → Verified. Also available: Deferred, Rejected, Blocked. Approval of design is not proof of implementation or an authorization for unrelated work.

Every requirement has: ID, revision, user problem, approval evidence, UI location, fields, relationships, validation, states, permissions, migration, tests, evidence, and remaining questions. Every build batch has an explicit list of included IDs and excluded/deferred IDs.

## Approved sequence, with proposed small batches

The order is approved; the following decomposition is proposed. Later stages deliberately remain design backlogs until their detailed feature contracts have been reviewed. They must not be handed to a builder as broad instructions to implement an entire stage.

| Order | Proposed batch | Concrete deliverable | Exit gate |
|---|---|---|---|
| Preflight | P0.1 Project reconciliation | Initial rules/source review done; finish deployed-schema, storage-policy and deployment verification | Evidence-backed reconciliation report; all conflicts named |
| Preflight | P0.2 Preservation baseline | Inventory records/relationships/files, migration rehearsal and recovery approach | Recoverable baseline and counts; no live writes |
| 1 Ownership | O1.1 Ownership model | Workspace-scoped ownership entity and property relationships; legacy mapping preview | Existing record IDs and relationships preserved; ambiguous ownership remains unresolved |
| 1 Ownership | O1.2 Owner profile | Identity, legal form, tax metadata, contact roles, property list | Read/edit states verified; no duplicate ownership records |
| 1 Ownership | O1.3 Add property | Guided owner selection, minimum property details, optional evidence, review | Cancel/error/retry/accessibility/mobile cases pass |
| 1 Ownership | O1.4 Ownership audit | Existing records, new flow, authorization, history, rollback rehearsal | Approved O1 criteria all passed; user review complete |
| 2 Overview | O2.1 Identity and acquisition | Name/address, parcel identifiers, purchase details, ownership display, source dates | Field dictionary and legacy mapping approved and verified |
| 2 Overview | O2.2 Building and units | Building vs unit facts, measurements, parking, specifications, unit identity | Units/tenants preserved; explicit whole-building vs unit scope |
| 2 Overview | O2.3 Insurance and accounts | Policies, terms, related contacts, account references | Sensitive-field rules and document links verified; no ledger postings |
| 2 Overview | O2.4 Valuations | Independently dated Redfin/Zillow/other value and rent observations | Same-source duplicate handling and chart gaps approved; no silent averaging |
| 2 Overview | O2.5 Property taxes | Tax year, installments, bills, payments, appeals, historical public records | Billed vs paid vs public-history separation; partial-year handling |
| 2 Overview | O2.6 Remaining overview records | Utilities, deposits, vendor estimates and remaining existing sections | Each section inventoried; no existing fields disappear |
| 3 Documents | D3.1 Registry and links | One document record, multiple contextual links, metadata and permissions | Existing file links preserved; workspace-scoped search |
| 3 Documents | D3.2 Presentation | Filename fallback, document labels, categories, dates, previews | Missing/failed/access-denied preview cases pass |
| 3 Documents | D3.3 Provenance and migration | Source pointers, attachment association review, duplicate review | No invented ownership or source dates; links verified |
| 4 Financials | B4.1 Accounting design | Entity ledger, account model, reporting basis, property allocation, period rules | Accounting specification reviewed; no inferred opening balances |
| 4 Financials | B4.2 Starting point | Migration cutoff, verified balances and historical import procedure | Reviewed import reconciliation; repeat import is safe |
| 4 Financials | B4.3 Transactions | Posting/reversal, receipt linkage, splits, transfers, owner funds | Balanced entries and cross-view agreement tested |
| 4 Financials | B4.4 Reconciliation | Actual financial account, statement period, balances, matches | Completeness independent of a manually checked flag |
| 4 Financials | B4.5 Views and tax handoff | Property Financials, entity Bookkeeping and Tax profiles | Views reconcile to one ledger; readiness scope explicit |
| 5 Mortgage | M5.1 Terms and statements | Loan identity, terms, refinance history, balances and statements | Multiple/refinanced loan history supported or explicitly scoped |
| 5 Mortgage | M5.2 Payment actuals | Principal, interest, escrow, fees, extra principal and linked payments | No duplicated expenses or payments |
| 5 Mortgage | M5.3 Projections | Extra-payment scenarios, assumptions, payoff/interest estimates | Scenarios cannot modify actuals |
| 6 Activity | A6.1 Rental relationships | Tenant profiles, co-tenants, leases, unit associations and history | Existing lease/tenant data preserved |
| 6 Activity | A6.2 Activity and follow-ups | Visits, communications, maintenance references, tasks | Clear event versus task versus financial entry distinction |
| 6 Activity | A6.3 Inbox links | Link reviewed captures to profiles and source documents | Review actions are traceable and safe to retry |
| 7 KPIs | K7.1 Metric definitions | Formula, source, scope, period, missing-data rule for every metric | Definitions approved before chart implementation |
| 7 KPIs | K7.2 Property presentation | Source-separated charts, data coverage, freshness and drill-down | No unknown-to-zero coercion or partial/full comparisons |
| 8 Portfolio | X8.1 Capture and Action queue | Phone capture → typed review item → linked destination(s) | End-to-end evidence for each capture type |
| 8 Portfolio | X8.2 Leasing and occupancy | Vacancies, upcoming availability, listings and tenant links | Vacancy definition approved; no status guesses |
| 8 Portfolio | X8.3 Portfolio reporting | Entity/property filters, source basis, coverage, exports | Aggregations reconcile; not labeled statutory consolidation |
| 8 Portfolio | X8.4 Command center | Per-property email, review and tenant association | Separate email-access and sending requirements approved |
| Later | L9 Operator console / CRM | Customers, workspace administration, subscription/sales workflows | Separate access model; initial portfolio remains a customer workspace |
| Later | L10 AI-agent management | Agent profiles, runs, permissions, cost and failures | Separate product decision and explicit action boundaries |

### Document dependency during stages 1–2

Basic safe attachment storage and linking are prerequisites for ownership/overview evidence. Inspect and reuse existing capabilities first. A minimal shared linking change may be included in an approved ownership batch if necessary. Full document search/presentation remains stage 3. Do not build parallel attachment systems or postpone link integrity until stage 3.

## Requirements to settle per later section

Before scheduling any later batch, fill these gaps rather than allowing an agent to invent behavior:

- Overview: which fields are property-level versus unit-level; units and rounding; missing/zero/not-applicable states; acquisition vs first rental date; source and verification dates; contact roles.
- Taxes: bill year vs payment year, installment completeness, paid-by identity, evidence for public history, appeal status/dates/decision/refund, multiple attachments, ledger links only for actual qualifying posted payments.
- Valuations: date granularity, per-source series, corrections vs extra observations, duplicate handling, gaps, preferred scenario basis, source link and rent period.
- Bookkeeping: entity boundaries, tax filer mapping, accounting basis, account types, bank accounts, owner contributions/distributions, inter-entity transactions, allocations, corrections, lock/reopen permissions, opening balances, import identity, exports.
- Mortgage: loan lifecycle, rate changes, escrow movement, lender vs bank posting dates, statement vs calculated balances, rounding, refinance, scenario assumptions and disclaimers.
- Leasing: tenants vs contacts vs occupants, co-tenants, lease dates/amendments, unit assignments, rent schedule, deposits, renewal and move-out transitions, communication permissions.
- Documents: owning workspace, property/entity anchor, many contextual links, legal retention needs, file validation/limits, duplicates, versions, access/preview/download, labeling, archive and recovery.
- KPIs: equation, included records, time basis, valuation source, unknown treatment, partial data coverage, rounding, freshness, drill-through and fixture expectations.

## Shared quality standards

- Preserve all existing IDs, files, dates, historical values and relationships unless a specific approved migration explains the change.
- Do not use an account's sign-in email as proof of legal ownership, LLC membership, tax status, or authority.
- Missing data is not zero. In read-only profile boxes, omit blank fields per current rules; specify any completeness/status exceptions explicitly. System modification date is not the date a fact was true or last verified.
- Display labels belong in one maintained dictionary so forms, history, exports and document metadata use consistent language.
- Mutations must be workspace-authorized server-side; a hidden button is not authorization.
- Use source record links for traceability. Do not duplicate accounting amounts across independent systems.
- Preserve work through recoverable validation/network failures. Guard against double submits and stale overwrites.
- Match the established ZMR design: restrained navy navigation, clear type hierarchy, compact opaque surfaces, obvious primary action, responsive layouts, visible focus, labeled inputs, helpful empty states.
- Verify narrow, tablet and desktop layouts. Never trade smaller text for fitting more fields.
- No change is complete merely because it compiles or a screenshot looks correct.

## Current next action

OWN-01 direction and OWN-02 labels are approved. Use Owned by on property selection, Owners & entities for management, the actual name for profile titles, and Legal structure for classification. Batches A and B are approved. Review preview v0.2 and finalize the O1-A technical contract before implementation. Do not reopen approved product decisions. Then finalize approved roadmap amendments and a project-compatible visual before choosing an implementation batch. Coordinate the existing uncommitted unit work. No production data modifications are part of this planning deliverable.
