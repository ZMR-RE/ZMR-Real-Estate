# O1-A — ownership foundation and entity profile

Draft 0.1 · September 23, 2026

Product requirements approved; technical contract and profile visual still to finalize. Add property preview v0.2 is a review reference. No live migration/deployment is authorized by this document. Do not execute the whole master roadmap.

## Why this batch comes first

The approved creation flow depends on a reusable record for the person/entity owning a property. Existing LLCs must remain intact while individual ownership and tax metadata gain defined representations. Build this foundation and its owner-profile surface before replacing the existing Add property flow. The following O1-B batch will implement 4A–4G against the verified foundation.

The smallest safe batch can be adjusted if current schema evidence proves a prerequisite is inseparable, but that adjustment must be reported. Do not hide adjacent feature development inside it.

## Product contract

Included: approved OWN-01 relationship direction, OWN-02 labels, 2A–2E, 3A–3B, 5A and 7A. Scope is one customer's portfolio containing multiple actual ownership entities. An entity can own several properties. Creating an entity never invites a user or creates another customer workspace.

Preserve the existing LLC's ID, EIN, formation state/date, registered agent, annual-report due date, holding-company relationship, archive state, property references and shared financial accounts. Preserve direct ownership and all existing property contacts without guesses.

Profile sections: Identity, Contacts, Linked properties, Documents, Tax classification. Reuse existing shared-financial-account access. Read-only by default, Edit at top right, Save/Cancel, blank fields omitted outside edit mode. Labels: Owned by; Owners & entities; actual legal/display name as profile title; Legal structure. Address remains the property identifier.

Required creation fields: owner kind and legal name. Unknown legal structure/tax classification is valid. Preserve existing optional fields; approved additions are display name, mailing address and notes. Contact reuse must be explicit. Tax metadata includes LLC membership, separate federal tax treatment, election type/status/dates, evidence, and retained election history. Do not infer classification from membership.

Documents reuse the shared registry/storage with property/entity/both associations; no required uploads to create a record. Labels preserve original filename. Entity-only documents must be representable without inventing a property.

## Excluded

Bookkeeping posting/report redesign, legal property transfers, fractional/co-owner UI, lease redesign, mortgage scenarios, full document-center replacement, operator console/CRM, team invitations/role administration, unrelated primary navigation and production remapping. Full effective-dated property-ownership transfer history (OWN-08) is still proposed; retained tax-election history (3B) is approved. Do not confuse them.

## Start here — copyable assessment prompt

Assess O1-A in `/Users/janki/Projects/ZMR-Real-Estate`. Read CLAUDE.md and DESIGN-SYSTEM.md, the current roadmap and these planning documents. Start from the existing reconciliation; refresh facts that may have changed. Do read-only source/schema assessment and produce the O1-A technical contract, roadmap amendment draft, and entity-profile visual. Do not change application code, run migrations or deployment, enter real records through scripts, or treat this prompt as permission to modify another session's work.

Approved product decisions are settled. Resolve ordinary implementation choices using the repository's existing patterns; ask only if a choice changes approved behavior, data safety, access, or material scope. Do not ask the user to select database table names or technical transaction mechanisms.

Inspect the relevant sources below. Produce a precise mapping from each approved field to existing or proposed storage and each UI section to its query/hook/component. Specify validation, read/write authorization, errors, concurrency, document linking, migration compatibility and rollback. Routine physical choices may be proposed by the builder; do not leave a vague “build ownership” instruction for another session.

Return a concrete, reviewable technical contract and diff-ready roadmap amendment with no placeholders in the chosen batch. Mark unavailable environment evidence explicitly. Do not mark implementation complete.

## Source map to refresh

| Concern | Existing source |
|---|---|
| Rules and tokens | CLAUDE.md, DESIGN-SYSTEM.md, src/index.css |
| Roadmap authority | zmr-real-estate-roadmap.md; 8.2–8.2c, 8.6–8.9, 7.40 and later amendments |
| Entity fields/CRUD | src/modules/llcs/llcsQueries.ts, LlcForm.tsx, useLlcs.ts |
| Entity management | OrganizationTypesSection.tsx, OrganizationTypeList.tsx, useOrganizationTypes.ts |
| Property links | useOrganizationTypeProperties.ts, OrganizationTypePropertiesPanel.tsx; propertiesQueries.ts |
| Property creation | PropertyForm.tsx, usePropertyRegistry.ts, PropertyRegistry.tsx |
| Shared accounts | src/modules/financialAccounts/financialAccountsQueries.ts; LlcFinancialAccountsPanel.tsx |
| Holding company | src/modules/holdingCompanies/ |
| Documents | src/modules/documents/documentsQueries.ts; existing upload/attachment consumers |
| Authentication/scoping | src/shared/auth/AuthContext.tsx; accounts/account_members/is_account_member migrations |
| Routes/pickers | src/App.tsx; SearchableSelect; shared pick-list system |
| Schema history | supabase/migrations; do not use schema.sql alone as deployed truth |

## Technical decisions the contract must resolve

1. Generalized person/entity representation that preserves existing llcs.id and every referencing consumer; no parallel duplicate source of truth. Explicitly map direct ownership without identifying a person from account login.
2. Compatibility for properties.llc_id and property_financial_accounts.llc_id; preserve property-specific accounts as well as LLC-shared accounts. Model user-facing legal structure separately from actual organization identity.
3. Tax classifications and pick-list-first conventions: determine which values require fixed semantics and why; never permit a display rename to silently change tax meaning. Store unknown distinctly.
4. Election history structure and links: add/change/supersede, actor/time, known dates, evidence; no “accepted” inference from upload/submission.
5. Existing EIN access/display safeguards. Preserve data; neither claim encryption/masking without evidence nor expand sensitive data scope implicitly.
6. Entity-only document paths and contextual links; reuse storage and keep old paths valid. Require same-account relationships and authorized file access. Apply approved D2–D5 upload policy after verifying hosted capacity: 25 files per batch, target 50 MiB per file, no lifetime property/entity count cap, and no invented subscription quota.
7. Label change coverage: list all picker/header/management/history/export consumers. Identify exactly which labels are superseded; preserve old audit records while formatting them intelligibly.
8. Save/cancel/conflict/duplicate handling for the entity profile, distinct from the future Add property draft flow. Current inline LLC creation persists early; O1-B must replace that behavior without deleting legitimate saved entities as compensation.
9. Existing legacy property name column is required by current form/schema paths. New Add property must use address identity without a required nickname; propose an explicit compatibility contract rather than dropping historical values or silently guessing a name.
10. Export and empty-account behavior for new records; implementation is not complete only because it works on the user's portfolio.

## Preservation and test contract

Baseline: current property/entity/unit/lease/document/account IDs, key relationships, representative values, and storage references. Use protected fixtures for isolated testing; no credentials or private record dumps in reports. Never use the user's real property as disposable test data.

Required cases for O1-A:
- One entity links to several properties without duplication.
- A directly owned property remains intact with unconfirmed identity.
- Existing LLC fields, holding company and financial accounts remain readable/editable through their established paths.
- Unknown membership/tax treatment can be saved without invented classification.
- Election correction preserves prior history and does not certify acceptance.
- Owner contact changes do not overwrite property contacts.
- Entity-only document and entity-plus-property document retain one source file and correct discovery links.
- Foreign-workspace entity/property/document references are rejected at the database/API boundary; inspect actual role enforcement rather than assuming viewer roles work.
- Cancel and failed save preserve existing data; retries do not duplicate mutations.
- Existing sparse financial and mortgage records still resolve their property/entity relationships.
- New account with no entities/properties has usable empty states and creation paths.
- Account export includes the new data under appropriate permissions.
- Profile is keyboard usable and readable on phone/tablet/desktop and light/dark themes.

Run applicable lint/build checks. This repo's package scripts at last inspection include `npm run lint` and `npm run build` (`tsc -b && vite build`); bare `tsc --noEmit` does not suffice. Determine the appropriate meaningful automated test harness rather than assuming an npm test script exists.

Project rules also require live UI verification with the reserved test actor and exact before/after cleanup checks. Define this concrete scope before execution. Current task remains planning only. Do not sign the owner out, test credentials, seed real data or delete anything under this assessment prompt.

## Current coordination evidence

The latest read-only status check differs from the earlier reconciliation: changes now involve shared CSS, lease history/list components, UnitsSection/useUnits, staged deletion of older tenant-assignment components, and an untracked UnitCard. Do not infer the earlier default-unit migration remains untracked or that a Lease entity is still entirely missing. Refresh the worktree, current roadmap, migration state and active ownership before editing. Leave other-session changes untouched.

## Following batch — O1-B, approved product scope 4A–4G

O1-B replaces creation with Ownership → Property basics → Documents → Review. Require Owned by/street/city/state/ZIP only for new creation. Optional purchase date/price and documents. No nickname prerequisite. Preserve Back/Continue input. New entity/property records are persisted only at final Save. Cancel leaves neither created; required upload staging must not create finalized orphan records. Save opens new Property Overview. Duplicate warnings never auto-merge; error/retry cannot duplicate records.

Before O1-B, specify one reliable save boundary and retry key covering the approved multi-record flow; do not claim independent frontend requests are atomic. Preserve old edit behavior. Add attachments with an explicit staged/finalized/error lifecycle, never remove pre-existing files during recovery. Reconcile default-unit behavior with the settled unit implementation.

## Completion evidence and release

The implementation handoff will include approved scope, exact technical contract, current source/migration map, concrete tests and review visuals. After implementation, return each criterion as pass/fail/not tested, preservation comparisons, visual evidence, checks run, exact remaining work and a rollback plan that does not erase newer customer writes. Update roadmap completion only when its full criteria pass. No production release is included in this draft.


## Latest scope clarification

Batch C acquisition requirements are approved and belong to the subsequent property/acquisition implementation scope. Ownership foundation must support correction of an erroneous owner selection, distinct from a legal transfer. Detailed correction safeguards (D1) and upload policy (D2–D5) are approved in the approval register. Do not treat local 50 MiB storage configuration as verified hosted settings; verify before specifying enforcement. Add property v0.2 layout is approved, while the owner-profile visual remains pending.


## Remaining handoff review

One consolidated user review remains for the first implementation package: owner/entity profile visual plus exact O1-A scope and preservation/completion criteria. Resolve ordinary technical details from repository evidence before presenting that review. Do not create further approval questionnaires for settled A–D requirements. Later product phases and the full legal-transfer workflow do not block this package.
