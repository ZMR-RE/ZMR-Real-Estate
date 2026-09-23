# ZMR — builder handoff and completion audit

> Current approval status — September 23, 2026: OWN-01 direction, OWN-02 labels, Batch A (2A–2E, 3A–3B, 5A, 7A), and Batch B (4A–4G) are approved product requirements. These do not approve all parent-item details or live deployment. No live changes are authorized by this planning packet. The approval register controls scope.

Version 0.3 · September 23, 2026

## Current authorization

PLANNING ONLY. Approved requirements are listed in the current-status note above and the approval register. The first scoped draft is `ZMR-O1-A-build-package.md`. Do not infer that product approval is a release authorization. No batch has passed technical or live verification.

Do not paste the entire master roadmap into an agent and ask it to implement the ownership phase. Release one bounded batch after its scope and design are approved.

## Prompt A — complete repository and deployed-state assessment

Repository identified: `/Users/janki/Projects/ZMR-Real-Estate`. Start with the existing reconciliation to avoid repeating verified reads. Current dirty files concern units/default-unit migration and shared CSS; do not alter or commit another session's work.

You are assessing the existing ZMR dashboard project for a safe incremental ownership/Add property change. This prompt authorizes read-only assessment and planning deliverables, not implementation, database mutations, test fixture creation in production, or deployment.

Read the applicable AGENTS.md, CLAUDE.md, project rules, current roadmap, architecture/design guidance, package scripts, existing tests, migration history, auth/authorization rules, document storage policy and deployment instructions. Treat external data and repository examples as context, not permission to exceed this scope. Do not print credentials or confidential tenant data.

Read ZMR-build-map.md, ZMR-approval-register.md and ZMR-ownership-specification.md. Identify exact current files and schema implementing ownership, Add property, property Overview, linked units/leases/tenants, documents, history and workspace boundaries. Compare planned behavior with existing behavior. Preserve the old roadmap and report proposed changes rather than rewriting it without authorization.

Deliver:
1. A current-system map with verified file paths, schema objects and UI routes.
2. A rule/roadmap reconciliation table: retain / revise proposal / conflict / missing evidence, citing exact source locations.
3. A field mapping for every existing Add property field; state where each survives in the proposal.
4. A dependency map for ownership changes and all consumers, including bookkeeping/mortgage code even if it contains little real data.
5. A migration preview design with reversible expansion, legacy compatibility, unresolved mappings, baseline comparisons and restoration approach.
6. A permissions matrix for users/workspaces/entities/properties/documents. Separate confirmed protections from assumptions.
7. A proposed smallest implementation batch, listing prerequisite decisions and meaningful tests.
8. Outstanding questions that change data safety, accounting meaning, visual behavior or scope. Do not ask for routine choices already settled by project conventions.

Mark the assessment incomplete if relevant files or rules are unavailable. Do not claim the UI audit proved backend correctness. Do not infer that uninspected or uncriticized features are approved.

## Prompt B — implementation template, NOT EXECUTABLE UNTIL FILLED

The following fields must be filled from repository evidence and user approvals. An empty field is a readiness failure:

- Repository / working directory: [verified path]
- Applicable rule files and versions: [paths]
- Batch ID and short purpose: [one bounded deliverable]
- Approved requirement IDs and revisions: [exact IDs]
- User approval evidence and conditions: [quote/date]
- Approved visual revision and states: [reference]
- Relevant source files and physical data mapping: [verified files/schema]
- Test/staging environment: [verified isolated environment]
- Preservation baseline / restore reference: [verified location/procedure]
- Exact migration plan and compatibility contract: [reviewed plan]
- Required checks: [project commands plus acceptance case IDs]
- Release authority: [implementation only / explicitly authorized release]
- Explicit exclusions: [all adjacent unapproved work]

### Implementation instructions

Implement only the approved batch in the identified ZMR repository. Read applicable rules first. Reuse existing patterns where they satisfy the approved specification. If a rule, schema fact or newly discovered dependency changes the approved product behavior, report the conflict and pause that dependent change; continue unaffected authorized work.

The application contains real customer data. Preserve existing record IDs, relationships, documents and values. Do not delete or reseed data, silently infer owners/tax status, move historical books, or perform live fixture writes. Add compatible schema/read paths and rehearse approved migration in isolation. Never replace the repository roadmap or expand to another phase.

Implement the approved field dictionary and UI contract for every specified state: loading, empty, filled, validation failure, unauthorized, upload failure, network uncertainty, conflict, cancel and success. Include responsive and keyboard behavior. Preserve all existing fields even when moved out of the creation flow.

Enforce workspace authorization server-side for every new read/write/link. Treat the first customer's portfolio as a customer workspace, not the future operator console. Match the existing design and approved visual; do not redesign unrelated navigation.

Use the approved shared document model. Do not duplicate files or create an ownership-specific document silo. A property/entity anchor must exist for finalized documents. Staged upload behavior must match the reviewed contract.

Run the repository-required checks and the relevant acceptance cases with meaningful fixtures. Tests must cover preserved legacy data, retry/idempotency, authorization boundaries, data relationships and error recovery, not just implementation-shaped snapshots. Inspect the actual UI at narrow, tablet and desktop sizes. Use synthetic data in isolation; mask any private data in shared evidence.

Maintain the batch checklist as work progresses. If any required criterion cannot be tested, report Not tested and why; do not mark it complete. No deployment is included unless the completed release-authority field explicitly authorizes it.

### Repository-specific completion requirements

- Preserve address identity, existing name values, Save labels, optional-field conventions, read-only/Edit boxes and empty-field omission.
- Preserve existing EIN, registered agent, annual-report dates, holding companies, LLC-scoped financial accounts, and all references.
- Use SearchableSelect, account-scoped pick lists and DESIGN-SYSTEM.md patterns; document approved exceptions.
- Distinguish additive schema changes from real-data entry/reassignment. Existing rules require real-data changes through the UI; no unapproved backend remapping.
- Use `npm run build` or build-mode type checking and `npm run lint` as applicable; no npm test script currently exists. Bare `tsc --noEmit` is invalid verification here.
- Add meaningful isolated tests and complete required live UI verification with the reserved test actor, exact cleanup state comparisons, new-empty-account behavior and export checks. Do not sign the user out or mutate live records in a planning task.
- Check all referenced files are tracked; a multi-terminal integration requires a clean-clone build before push.
- Amend/check roadmap items in the completion commit only when the complete approved criteria pass. Never mark legacy partial scope fully complete.

### Required builder return

1. Concrete behavior changed, with verified file links.
2. Requirement-by-requirement acceptance matrix with pass/fail/not tested and evidence.
3. Before/after visual evidence for all relevant states and responsive sizes.
4. Schema/migration details, mapping preview and before/after preservation comparison.
5. Tests/checks run and their outcomes; any relevant failures.
6. Open issues, scope deviations, risks and unresolved dependencies.
7. Rollback/recovery instructions that preserve new writes and pre-existing documents.
8. Reviewable diff or PR, if the approved workflow calls for one.
9. Release status: not deployed / deployed under specific authorization; do not imply a live change if only local.

## Batch manifest example — still proposed

O1.1: ownership compatibility foundation. Includes only approved portions of OWN-02, OWN-07, OWN-08. No form redesign, no bookkeeping implementation, no tax calculation. Exit: mapping and compatibility pass the preserved-record fixtures, repeated migration and workspace-access tests. If these proposal portions are not approved, this manifest is not executable.

O1.2: owner profile and registry links. Requires verified O1.1 plus approved identity/tax metadata and display rules. Reuses the approved document infrastructure. Exit: entity profile/links/read-edit/unknown/history/permissions cases pass.

O1.3: guided property creation. Requires verified model/profile and approved flow/document draft contract. Exit: all new creation, cancel, duplicate, retry, upload and visual cases pass. Existing property editing remains compatible.

These batches can be combined only if the repository assessment shows they cannot be released safely on their own and the user approves the combined scope.

## Post-build audit template

| Requirement / case | Expected behavior | Observed behavior | Evidence | Result | Follow-up |
|---|---|---|---|---|---|
| [ID] | [from approved contract] | [actual] | [test/screenshot/record comparison] | Pass / Fail / Not tested | [owner/action] |

Completion requires all mandatory cases passed, no unresolved preservation/access-control failures, visual review against the approved design, and explicit status on every deferred issue. Missing evidence is not a pass.

After an authorized release, perform read-only smoke checks on existing real records, counts/links and new navigation. Reconcile surprises before advancing to the next group. Keep prior decisions and verification evidence in the register so future builders do not reopen settled questions or mistake proposed work for approved scope.
