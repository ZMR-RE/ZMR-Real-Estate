# ZMR project reconciliation — ownership planning

Version 0.2 · September 23, 2026 · Read-only repository review

Repository: `/Users/janki/Projects/ZMR-Real-Estate`.

## Scope and authority

Reviewed CLAUDE.md, DESIGN-SYSTEM.md, ARCHITECTURE.md, relevant roadmap sections, package scripts, current routing/authentication context, LLC/property/document/financial-account queries, creation/management components, and relevant migration sources. This is not a full code/security audit or confirmation that local migrations are applied in production. No builds, migrations, credential reads, database mutations or application edits were performed. No numbered ownership proposals were approved by providing the project files.

This reconciliation supersedes conflicting assumptions in planning version 0.1. It preserves the user's approved build order. The existing repository roadmap remains unchanged and continues to govern implementation alongside subsequent explicit user decisions.

## Executive result

The ownership foundation is partly built already. Extend it rather than create a second entity system. The immediate planning work is to define the additional owner identity/tax/history/document requirements and approve how they extend existing `llcs`, `properties.llc_id`, account boundaries and holding-company relationships.

The earlier visual is an exploratory v0.1 wireframe, not a build-ready design. Its free-text property identity, optional-field labels and creation action wording conflict with current rules and must be revised before visual approval.

## Existing implementation versus proposed work

| Area | Repository evidence | Planning consequence |
|---|---|---|
| Customer workspace | `accounts` and `account_members`; AuthContext exposes accountId | Map our word “workspace” onto existing account_id boundaries. Do not create duplicate workspace infrastructure |
| LLC entity | `src/modules/llcs/llcsQueries.ts`, migration `20260904193000_llcs_entity.sql` | Reuse actual LLC records and stable IDs; they are not just pick-list text |
| Existing LLC fields | Name, EIN, formation state/date, registered agent, annual report due date, holding company, archive state | Preserve these. My original owner dictionary omitted registered agent/report deadline and incorrectly treated EIN as entirely new |
| Property ownership | `properties.llc_id` nullable; `owner_name`/contact fields also exist | Extend compatibly; distinguish direct ownership from unresolved owner identity |
| Direct ownership | `useLlcs.ts`: “Individual ownership” selection maps to null llc_id | This is not yet a reusable person-owner record. Do not infer one from the signed-in user |
| Multiple properties per LLC | `listPropertiesByLlc`, management panel and roadmap 8.2c | Already supported. Approval #1 improves the flow; it does not require inventing this relationship |
| Holding companies | Existing table/module and llcs.holding_company_id | Preserve this additional layer in the target model; do not flatten or discard it |
| Entity management | OrganizationTypesSection/List, LlcForm, View properties, Archive/Restore | Evolve this surface into a fuller profile if approved; avoid a parallel duplicate manager |
| LLC-shared financial accounts | `financialAccountsQueries.ts`, migration `20260923010000_financial_accounts_llc_scope.sql` | Already supports either property-scoped or LLC-scoped account records. Preserve both and their consumers |
| Payment account picker | `listFinancialAccountsForEntry` combines a property's accounts with LLC accounts | Ownership changes can change payment options: add a cross-module regression test |
| Documents | Shared `documents` records, private storage, contextual foreign keys; property-oriented listing queries | Extend existing architecture for LLC-only/property-plus-LLC anchors, not a separate file library |
| Multiple tax attachments | Roadmap 9.5 explicitly widened to multiple documents per installment | User's bill-plus-receipt need is at least partly built already; validate usability before rebuilding |
| Existing blank document labels | Roadmap 2.7 says older labels intentionally left untouched; new tax labels generated | Treat legacy labels as a reviewed enrichment task, not proof all new labeling is absent |
| Financials | Financial transactions, chart of accounts, periods and simplified reports exist | “Bookkeeping not ready for the user's needs” is distinct from “no code exists.” Redesign must preserve existing records and integration paths |
| Tenant/lease model | `tenant_units` holds assignment dates and rent; roadmap Future Considerations names co-tenant ambiguity | Do not promise safe aggregate rent before lease/grouping redesign. Preserve the dependency in stages 2, 6 and 7 |
| Tax classifications | No membership/election/tax-treatment fields found in the inspected LLC interface/migrations search | New metadata is proposed scope, not an existing capability |
| Owner profile route | Current App.tsx has no LLC/person profile route | Any contextual route needs explicit scoped wiring; does not justify a new sidebar item |

## Rules that change the draft

### 1. Naming is an explicit decision

Roadmap 8.2b deliberately chose “Organization type,” superseding an earlier “Ownership entity” label. A rename may be clearer, but it is not a routine cleanup or authorization implied by this audit. Keep OWN-02 as a proposal and record the exact approved replacement in a new roadmap amendment rather than rewriting history.

### 2. Property identity is the address

CLAUDE.md Identifiers and roadmap 8.6 require address-based identity. The first mockup's required “Property name”/nickname should not become the canonical identifier. Preserve the existing database `name` field and stored values, but resolve its compatibility behavior in the approved creation contract. Do not silently drop it, invent its contents, or add a nickname feature without approval.

### 3. “Save” is the persistence action

Use “Save” at the end of creation, not “Create property.” “Continue” and “Back” can remain non-saving navigation. Required fields use the existing red asterisk. Remove repeated “(optional)” wording from field labels.

### 4. View-only boxes and empty fields

Existing profile sections default to read-only with one Edit action at top right. Add/archive/export placement must follow the existing box standard. Blank fields in read-only boxes are omitted; edit mode shows all fields. Therefore do not scatter “Not recorded” placeholders across the owner profile by default.

Unknown-versus-zero remains essential for calculations, reviewed data status and creation/review decisions. Specify those contexts narrowly. If a read-only missing-information checklist or placeholder is desired, explicitly approve an exception rather than treating it as already compatible.

### 5. Reuse existing design components

Use `SearchableSelect`, `CollapsibleSection`, account-scoped pick lists, the shared field hierarchy and index.css tokens. The preview's native select is a wireframe shortcut, not a direction to replace the application picker. New categorical fields follow the pick-list-first rule unless a specific fixed-enum rationale is agreed. Tax treatment/member-count validation needs that explicit decision.

No new top-level navigation entry is permitted by default. Ownership profile links can sit within existing Properties/Settings scope if approved. Creation form stepper width/layout is a proposed pattern; reconcile it with existing form sizing before building.

### 6. Real data editing must use the UI

CLAUDE.md states: “All data entry, edits, and feature verification must go through the live dashboard UI as the end user would use it.” This means the initial plan must not assume a backend script may create real owners, change assignments, or fill missing identity fields.

Separate schema evolution from real-data remapping. Additive schema migrations can be designed; any populated-record transformation needs an explicit approved migration scope or a reviewed UI flow. Historical migrations that performed data changes are not blanket permission for another one.

### 7. Verification has two distinct layers

Automated and isolated fixture tests are useful, but the rules also require end-user UI verification, a reserved test actor for live test mutations, exact pre/post-state checks, new-empty-account behavior, and a functioning export path. My earlier nonproduction-only completion plan was incomplete under these rules.

The final batch must specify the live verification scope and test identity. This planning review performs no live mutations and does not change the user's session. Do not mark a batch complete if required UI verification is missing. Do not interpret test cleanup rules as authorization to delete real data.

### 8. Tests and integration requirements

`package.json` provides `build` (`tsc -b && vite build`) and `lint` (`oxlint`); no test script is configured there. Select/add a meaningful test approach in the scoped implementation plan instead of inventing an npm test command. Bare `tsc --noEmit` is explicitly insufficient. Multi-terminal integration requires a clean-clone build and tracked imports before push. Roadmap checkbox updates belong in the same completion commit, only after the full requirement is satisfied.

## Sources that are stale or incomplete

ARCHITECTURE.md is explicitly dated September 17 and describes earlier structure. Current App.tsx imports `captureTriage/ReconciliationQueue`, no longer mounts the old Tasks route, and settings security placement has evolved. Do not use that architecture file as the only source of truth.

The roadmap has completed items with later corrections or partial-gap notes. Examples: 7.10 describes partial gaps; 8.5 calls tenant_units the lease record, while Future Considerations acknowledges it cannot distinguish shared lease rent from per-tenant rent. Preserve historical completion records but add explicit follow-up acceptance criteria; a checkbox is not present-day proof of completeness.

`schema.sql` alone is not proof of the deployed schema. Reconcile sequential migrations and, when authorized and available, read-only live schema metadata. No production schema inspection occurred here.

## Permission findings — evidence limit

The inspected migrations enforce membership-scoped RLS using `is_account_member(account_id)`. The initial membership table includes owner/manager/viewer role values, but roadmap 8.9 explicitly reserves enforcement for later and the inspected AuthContext loads account_id without a role. Do not promise that a viewer cannot write until role enforcement is actually verified/built.

The property/LLC relationship uses a single-ID foreign key. Same-workspace relationships need explicit verification; membership RLS on the changed row alone does not establish that every referenced record shares its account. Include negative relationship tests in the ownership batch. This is a source-level verification requirement, not a claimed exploit or proof of a live vulnerability.

## Work already in progress

At inspection, git status reported:
- Modified `src/index.css`.
- Modified `src/modules/units/UnitsSection.tsx`.
- Modified `src/modules/units/useUnits.ts`.
- Untracked `supabase/migrations/20260923070000_default_unit_per_property.sql`.

The untracked migration proposes a default-unit trigger for new properties and a targeted backfill. Its comments refer to prior direction, but this review does not treat those comments as fresh approval or evidence the migration is deployed. Coordinate with the active work before editing overlapping files. The Add property batch must account for the settled default-unit behavior and verify it does not create duplicates. Do not amend, commit, remove, run or overwrite these changes as part of this planning task.

## Revised smallest next group

Still review OWN-01–OWN-03 first, now with these corrections:

1. Keep Add property and existing multiple-properties-per-LLC support; improve owner selection and decide direct-owner identity behavior.
2. Extend the existing LLC manager with approved profile fields; preserve EIN, registered agent, annual-report deadline, holding-company links and shared financial accounts. Decide whether to rename Organization type.
3. Add approved membership/tax metadata with unknown states, effective dates and evidence. Resolve fixed versus configurable choices. Preserve existing EIN storage; do not remove or expand sensitive-data collection implicitly.

Before implementation: approve the product details, add a proposed amendment to the existing roadmap with traceable new IDs, revise the visual to match project standards, verify schema/security assumptions, and coordinate the in-flight unit work. No production code or roadmap amendment has been made by this review.
