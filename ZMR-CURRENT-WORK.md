# ZMR — Current work and next handoff

Updated September 23, 2026. This checkpoint records the ownership/property planning conversation. It does not mark application features implemented.

## Start here in any new conversation or terminal

Read CLAUDE.md, DESIGN-SYSTEM.md, the main roadmap, this page, and the linked approval register. Inspect current git status before edits; this is a shared, changing project. Do not use dated source-review notes as current deployed-schema evidence.

## Current status

- User approved batches A, B, C and D and the Add property v0.2 layout. Exact decisions are in [the approval register](docs/planning/ownership-property/ZMR-approval-register.md).
- User now says “Awesome lets build” and explicitly requests that this work be recorded in the local project. Proceed with build preparation and approved work; this is not blanket authorization for production data migrations, release, or unapproved product scope.
- Next concrete deliverable: finish the owner/entity profile visual and O1-A technical implementation contract, then present them together for the previously agreed final review before application implementation. Do not ask again about settled A–D decisions.
- First implementation scope: ownership foundation and owner/entity profiles. Follow with Add property and acquisition against the verified foundation, then audit before moving on.
- No application source, live records, hosted storage settings or production schema were changed by this planning session. No build/test verification is claimed.
- The older packet contains historical proposed statuses and source snapshots. The latest explicit A–D entries in the approval register control product scope; this page controls current handoff status. Dates and source findings must be refreshed before implementation.

## Documents

- [Approval register](docs/planning/ownership-property/ZMR-approval-register.md): approved requirements, pending proposals and evidence.
- [Ownership specification](docs/planning/ownership-property/ZMR-ownership-specification.md): field/behavior contract and acceptance cases, including latest addenda.
- [First scoped build package](docs/planning/ownership-property/ZMR-O1-A-build-package.md): currently a preparation/assessment prompt, not the final implementation prompt.
- [Build map](docs/planning/ownership-property/ZMR-build-map.md): overall sequence and dependencies.
- [Builder handoff](docs/planning/ownership-property/ZMR-builder-handoff.md): earlier general handoff context; read latest approval register and scoped package first.
- [Project reconciliation](docs/planning/ownership-property/ZMR-project-reconciliation.md): dated initial code/rule findings, not live-state proof — see the newer implementation contract's own "Evidence refresh" section for what has since changed.
- [Approved Add property preview source](docs/planning/ownership-property/zmr-add-property-v02.html): interactive fragment, illustrative only; Save does not persist records.
- **[O1-A implementation contract](docs/planning/ownership-property/O1-A-implementation-contract.md)** — **now v2.0**, revised for Batch G (multiple owners with percentage interests, entity membership interests, reusable multi-method contacts, generalized/unified ownership correction, phased upload). Read its "Revision history" section first — it states exactly what changed from the superseded v1.0 design and why. This is the primary spec for implementation.
- **[Owner/entity profile preview](docs/planning/ownership-property/O1-A-entity-profile-preview.html)** — **revised for v2.0**: Contacts is now reusable people with multiple labeled phone/email methods and explicit property-and/or-entity attachment; Linked properties shows percentage interests; a new property-side "Ownership" demo card shows a two-owner (48%/52%) property; the correction dialog is shown as one shared mechanism triggered from every add/remove/percentage-change control on both the entity and property sides. Open directly in a browser, no build step. Fictional data only; no live writes.
- **[O1-A terminal build prompt](docs/planning/ownership-property/O1-A-terminal-build-prompt.md)** — **revised**, still marked "AWAITING REVISED REVIEW" — do not execute. Ordered tasks, exclusions, and the ten open decisions now match contract v2.0.
- [Terminal revision prompt](docs/planning/ownership-property/ZMR-terminal-revision-prompt.txt): the instruction this v2.0 revision was produced from; kept for traceability.

## Approved scope summary

A: reusable person/entity ownership profiles; legal identity and tax classification separated; optional contacts/documents; preserve legacy individual ownership without guessing identity.

B: Ownership → Property basics → Documents → Review → Save; required owner/address; optional acquisition/documents; no required nickname; creation only at final Save; preserve input and avoid duplicate retries.

C: acquisition method/date/price, reusable acquisition contacts, closing documents, editable later; bookkeeping closing-cost posting deferred.

D: distinguish ownership entry correction from legal transfer; record correction audit details and preserve dependent records; 25 files per upload batch, further batches allowed; target 50 MiB/file pending hosted verification; per-file metadata/linking/progress/retry; track workspace storage, no invented subscription quota or promise of unlimited storage.

## Remaining before first implementation handoff

- [x] Complete owner/entity profile visual using approved sections and existing design system. — `O1-A-entity-profile-preview.html`, Sept 23, 2026.
- [x] Finalize field-to-storage mapping, compatibility, permissions, document links, correction handling, errors and retry behavior using current source/schema evidence. — `O1-A-implementation-contract.md`, Sept 23, 2026; built from a fresh read of current migrations/components (see the contract's "Evidence refresh" section), not the dated reconciliation alone.
- [ ] Verify hosted upload size/capacity without changing settings; report unavailable evidence explicitly. — **Not verifiable from this session** (no Supabase dashboard/CLI access to hosted config was available). Recorded as a release blocker in the contract §8 and flagged in the terminal prompt's "before you write a line of code" list. Local `supabase/config.toml` (50 MiB) is confirmed but explicitly documented as not evidence of the hosted value.
- [x] Define preservation baseline, isolated verification, export/empty-account checks and rollback; no real-data guessing or destructive remapping. — contract §9 (migration plan/verification/rollback) and §11 (acceptance tests, including O1A-01 empty-account and O1A-05 export cases).
- [ ] Present one consolidated final visual/scope review; record the user's decision. — package is prepared and cross-referenced (contract v2.0 + revised preview + revised terminal prompt); **the owner's actual review and decision have not yet happened.** Ten specific items need the owner's input first — see the contract's §10 (expanded from four to ten items in the v2.0 revision) and the terminal prompt's "before you write a line of application code" section.
- [x] Produce final terminal implementation prompt referencing project-local documents. — `O1-A-terminal-build-prompt.md`, marked "Awaiting final visual/scope review," Sept 23, 2026.
- [ ] Implement first scope, run required checks, audit result and report precise completion/remaining work before release. — not started; this preparation task did not implement, migrate, or deploy anything, per its own instructions.

## Future work — retained, not approved by implication

The approved build order remains ownership → Property Overview → documents/provenance → entity-backed financials → mortgage actuals then projections → activity/tenants → verified KPIs → portfolio workflows/reporting. Existing implemented financial/lease features must be preserved.

Full legal ownership transfer workflow, fractional ownership, broad freshness rollout, registry filter changes, tax reports and bookkeeping details need future scoped decisions. Operator console, customer administration and CRM are later. Do not make them prerequisites for the first ownership build.

## Rules requested by the user

New or materially changed operating/build rules must be presented with proposed wording and approved by the user before being added as rules or included as mandatory terminal instructions. Existing approved rules continue to apply. This requirement was explicitly requested in this conversation; it is recorded in CLAUDE.md rather than invented by the assistant.

## Session checkpoint

The project had unrelated work in PropertySpecsSection.tsx and an untracked unit-status migration at this checkpoint. That is a dated observation, not a file lock or authorization to edit either. Refresh git status and coordinate before integration.

Planning files are saved locally in this repository but have not been committed or pushed by this session. A new conversation must have access to this folder or a later committed/shared copy to read them.


## Batch E approval checkpoint — September 23, 2026

User approved E1–E7 for the subsequent Property Overview build. See the approval register for exact layout, acquisition grouping, contextual documents, occupancy reuse, timestamps and section-editing requirements. This supplements earlier A–D status notes. Exact Building details fields are the next planning topic. The terminal is preparing O1-A in parallel; Batch E does not expand its current scope or mark features implemented. No new operating rules were added.


## Batch F approval and visual clarification

F1–F8 approved (“Approve Batch f.”). User asks to retain/see existing dashboard typography, colors, hover effects and boxes. Existing DESIGN-SYSTEM.md and shared section components remain the visual baseline; no new overall visual redesign is proposed. The illustrative zmr-existing-style-preview.html demonstrates regrouping inside Property information while retaining separate Financial accounts and Specs boxes. It is a partial style demonstration, not a complete approved page layout or live implementation. O1-A terminal scope unchanged.

## O1-A preparation session — September 23, 2026

Completed a read-only assessment/specification/visual-preparation pass for O1-A, per the build package's own assessment-prompt authorization. No application source, migration, live record, or hosted setting was changed. Ran alongside the Batch E/F planning conversation above without touching any file it owns.

**Refreshed since the dated reconciliation:** the default-unit migration (`20260923070000_default_unit_per_property.sql`) is committed (`d72a341`), not in-flight. The Lease/Tenant rebuild has four migrations landed since the reconciliation was written (`leases`/`tenants` are now real tables; `documents.lease_id`/`tenant_id` are real FKs). `git status` at the start of this session showed no dirty files under `src/modules/units`, `src/modules/leases`, `src/modules/tenants`, or `PropertySpecsSection.tsx` — the "Session checkpoint" note above about unrelated in-flight work in those files is stale as of this pass.

**Files created:**
- `docs/planning/ownership-property/O1-A-implementation-contract.md` — the technical contract: field/storage mapping, schema decisions (extends `llcs` in place rather than a new table; new `llc_tax_elections` and `property_ownership_corrections` tables; `documents.llc_id`/`llc_tax_election_id` follow the existing per-parent-FK pattern), interaction contract, migration/rollback plan, and acceptance tests.
- `docs/planning/ownership-property/O1-A-entity-profile-preview.html` — open directly in a browser, no build step. Approved sections (Identity, Contacts, Linked properties, Documents, Tax classification, Financial accounts) in view/Edit states, required markers, empty-field omission, a new-empty-account toggle, and the D1 correction-vs-transfer distinction shown separately with the transfer option visibly non-functional.
- `docs/planning/ownership-property/O1-A-terminal-build-prompt.md` — final implementation prompt, marked "Awaiting final visual/scope review," referencing the contract and approval register. Not executed.

**What remains unresolved (see the contract's §10 for full detail):**
1. Whether concurrent-edit conflict detection should be added to the new profile alone, given no other form in the app has it (recommendation: no, leave consistent with current app-wide behavior).
2. Whether the existing entity-side reassignment control (Settings → Organization types → View properties) should also start capturing a reason, to match the new property-side correction flow, or stay as-is.
3. The hosted Supabase Storage per-file/account size limit — genuinely unverifiable from this session; needed before the upload feature can ship with a real, non-guessed number.
4. A small cross-account-integrity trigger the contract recommends adding to two **pre-existing** relationships (`properties.llc_id`, `llcs.holding_company_id`) as a data-safety fix, not a new product decision — flagged for visibility since it touches already-shipped tables.

**Next:** the owner reviews the contract and the preview together, decides items 1–4 above (or confirms the stated recommendations), and records that decision here or in the approval register. Only after that should the terminal build prompt be handed to an implementation session.


## New owner clarification — review before implementation

User states multiple property owners and multiple contact methods are needed. This materially revises the earlier deferral of multiple direct owners. Batch G proposals and research are in the approval register; G remains pending. Reconcile multiple legal owners vs entity members/contacts in O1-A before implementation. Do not assume the spouse is a direct title owner or infer percentages. The partial no-hero style preview is insufficient and is not approved as the target page. Preserve the actual property hero and existing visual identity. This checkpoint appends to, and does not erase, the terminal's preparation report.


## G decisions — O1-A revision required before implementation

G1/G2(with attachment choice)/G4/G6/G7/G8 approved; G3 visual pending; G5 property Quick capture rejected. Percentage property interests AND entity membership now requested, superseding earlier deferral. Read latest register amendment and ZMR-terminal-revision-prompt.txt. O1-A v1.0 single-owner/flat-contact model must be revised. Owner enters all ordinary business data through dashboard and receives a numbered test script when ready; no terminal-created live records.


## Hero feedback / H proposals

User endorses visual look/feel but rejects omission of Portfolio KPIs as regression. Full layout/navigation not approved. H1–H7 in register propose preservation of portfolio KPI access, Action Queue automation tab, separate mailbox Command Center, operational rent access and hero-adjacent occupancy/rent/action summary. No nav edits approved. User requests independent reasoned recommendations, including disagreement.

## O1-A revision session — Batch G (multiple owners, percentages, reusable contacts) — September 23, 2026

Completed the requested revision of the O1-A preparation package per `ZMR-terminal-revision-prompt.txt` and the two Batch G approval-register sections. Read-only/planning only — no application source, migration, or live record was changed. Ran alongside the parallel Batch E/F/G/H Property-Overview-layout planning track without touching any file it owns.

**Revised relationship model:**
- `properties.llc_id` (single-owner pointer) is no longer the source of truth for property title. A new `property_ownership_interests` table (property × owner, optional percentage, optional effective date) holds 1..N current owners per property; `llc_id` becomes a derived convenience pointer for the few consumers that still need exactly one entity (e.g. financial-account scoping) — **how it's kept in sync once a property has 2+ owners is an open decision (contract §10 item 3), not resolved unilaterally.**
- A new `llc_membership_interests` table holds entity membership percentages (e.g. "Entity C: 50% Owner A / 50% Owner C"), kept deliberately separate from property title per the revision instruction.
- A new `contacts`/`contact_methods`/`contact_links` system replaces the flat entity-only contact fields v1.0 proposed: reusable people, multiple labeled phones/emails, explicit attachment to a property and/or entity with a role. Linking a contact never creates login access.
- `documents.llc_id` (a single FK, v1.0's plan) is replaced by a `document_owner_links` join table so one document can be linked to multiple owning entities — a real case now that properties can have multiple owners.
- Ownership correction (D1) is generalized to add/remove/percentage-change and **unified across every route that can change ownership** — the existing Settings → Organization types reassign control is replaced, not left running alongside the new reason-requiring path, per the revision prompt's explicit "no bypass" instruction.

**Preservation plan:** every new table is additive; `owner_kind`'s backfill was corrected from an inferred `'entity'` default (v1.0's mistake, named directly in the revision prompt) to `null`/unresolved, requiring explicit owner confirmation per existing record. A read-only pre-migration check for existing cross-account-inconsistent data is now required before any new integrity constraint is installed — see contract §7.7/§9.2. "Zero risk"/"automatic audit for free" claims were removed and replaced with a precise account of what the existing audit trigger does and does not cover (§2.7).

**Preview:** `docs/planning/ownership-property/O1-A-entity-profile-preview.html`, revised in place (same file/link as before). Open directly in a browser — see its own footer for what's new to click through.

**Remaining numbered decisions:** ten items in the contract's §10 (percentage completeness/total validation; effective-dated history depth; how `llc_id` is kept in sync with 2+ owners; whether entity membership needs the same correction rigor as property title; whether the pre-existing Property Information box's save should also get the new stale-edit guard; whether contacts need field-level audit history; whether ownership-interest writes need DB-level protection beyond one query file; the still-unverified hosted upload limit; the outcome of the cross-account pre-check, if anything is found; and the reassign-control replacement, flagged for visibility though already resolved). None of Batch A–D or G1/G2/G4/G6–G8 is reopened.

**Diff summary:** `O1-A-implementation-contract.md` bumped 1.0 → 2.0 (full rewrite of the information model, correction mechanism, interaction contract, decisions, and acceptance tests; identity/tax-classification/election-history/migration-methodology sections carried forward largely unchanged). `O1-A-terminal-build-prompt.md` rewritten to match, still marked AWAITING REVISED REVIEW, not executed. `O1-A-entity-profile-preview.html` edited in place: Contacts section replaced, Linked properties revised to show percentages, a new property-side Ownership demo card added, the correction dialog made scenario-aware and shown as one shared mechanism.

**Next:** owner review of the ten items above; no implementation until that review and the hosted-storage check are both resolved.


## H approvals / terminal v2 review

H1–H5 approved; unnumbered yes treated as H6 by sequence and disclosed. H7 pending revision: Overview must not duplicate specialist tabs. Property rent operations -> property Financials; portfolio rent/cash-flow analytics -> Portfolio KPIs, with current Rent ops access preserved pending a migration map. Batch I proposes the five product decisions needed for v2's percentages/history/account context/membership corrections/conflict-audit scope. Technical safety and environment verification are builder responsibilities, not ten user policy questions. No implementation authorization yet.


## CURRENT AUTHORIZATION — H7 revision and I1–I5 approved

User requests continuing approved terminal work while future decisions are planned. Follow docs/planning/ownership-property/ZMR-approved-work-terminal-prompt.txt. Incorporate approved I requirements, then implement the local ownership foundation and approved profile functionality; do not stop at another planning-only report. Preserve pending visual/navigation decisions and user-only live data entry. No live migration/deployment authorized. This supersedes older blanket “no implementation yet” checkpoint text for the scoped local work. Terminal progress is not automatically monitored by this chat; owner shares checkpoint reports.


## Current checkpoint — 7b615e5 / Batch J approved

Ownership implementation is partial: foundation/services and property Ownership increment committed; entity/membership screens, old Settings bypass and actual Supabase/browser verification remain. No live changes authorized. Follow ZMR-ownership-next-increment.txt to complete independent approved work and establish an isolated test environment. J approved for later, except J2 button placement needs clarification against prior profile-Capture exclusion; shared in-place form and contextual preselection are requested. Do not leap to J while O1-A remains incomplete.


## Latest J2 clarification / next workflow planning

User approves a property-profile Capture BUTTON opening the shared in-place form, not a Capture TAB. Property preselected visibly/editably; no automatic owner links. Prior button-exclusion notes are superseded. Batch K capture/review transitions proposed in register; not approved and not added to running ownership implementation.


## Latest decision — Batch K approved

K1–K6 approved by “batch k approved.” Capture/review workflow requirements are settled at this level. Next preparation for that queued scope: reconcile existing fields, specify transitions and prepare a realistic visual/handoff. Current ownership implementation remains first; do not switch the running terminal to capture work before finishing its approved increment.


## Capture preparation complete — Batch L pending

Prepared docs/planning/capture-review/ZMR-capture-review-specification.md and ZMR-capture-review-preview.html from inspected existing Capture/Action Queue code. J/K remain approved; L1–L4 and preview layout await owner review. Current receipt reconciliation posts a transaction; planned separation must preserve historical transactions and evidence. No application source, migrations or live data changed by this preparation. Ownership terminal continues its existing approved increment; capture remains queued after ownership. Demo browser checks passed; not a production feature or owner acceptance test.


## Latest approval — Batch L approved

User: “approve batch L. One thing I noticed missing was history and how it will be presented in our dashboard.” L1–L4 are approved, superseding all pending-L wording above. This does not approve the preview layout or the newly proposed history presentation. J/K/L are approved for the queued capture scope; ownership remains first. History retention was already required, but its display needs an explicit specification.

Next review: docs/planning/capture-review/ZMR-history-presentation-proposal.md, proposed M1–M4. Existing capture History and Property Activity/History inspected; no application changes or live records touched.


## Batch M approved — history presentation

Evidence: owner said “approve Batch M.” M1–M4 are approved: preserve existing history destinations and add scoped capture/work/entity history access; newest-first expandable actor/action/time/record entries; operational event coverage with filters and discoverable completed/archived records; read-only history with new correction events, permission controls and honest legacy gaps. See docs/planning/capture-review/ZMR-history-presentation-proposal.md (filename retained, status updated) and specification v0.2. Supersedes earlier pending-M status.

J/K/L/M are approved for the queued capture scope. Ownership remains first. Capture preview layout remains pending; next preparation is the history visual and implementation handoff reconciliation. No application implementation, live records or deployment changed by this approval-recording step.


## Capture/history handoff prepared

Approved J–M consolidated in docs/planning/capture-review/ZMR-capture-history-terminal-handoff.md with C1–C5 implementation slices and verification gates. New ZMR-history-preview.html illustrates approved M behavior using fictional records; exact visual styling remains pending owner feedback, not a blocker to approved work using existing design components. Demo browser checks verified expanded field changes, event-type filtering and linked record preview; not live application testing. Ownership increment remains first. No application source, migrations, live records or deployment changed by this preparation. Owner will paste the handoff to terminal; this chat has not dispatched or monitored it.


## Owner steering — hold handoff; return to Property Overview

Owner explicitly will not send capture/history handoff while terminal is running and will report completion. Do not dispatch it or presume terminal progress. The consolidated handoff is a reference backlog, not the next all-at-once assignment. After checkpoint review, prepare one cohesive bounded implementation prompt at a time with clear dependencies, preservation checks and owner UI acceptance.

Owner says recent workflow previews lack the existing Property Overview personality. Preserve hero/photo, actual typography/navy palette, hover feedback, box hierarchy and established view/Edit interaction. Recent previews do not approve replacement styling. Return planning to unfinished Overview boxes, then review each property-profile tab, supporting Excel-to-dashboard entry with explicit field mapping. Acquisition C, Overview E, Building F and revised H7 have approved requirements but must not be represented as completed screens or comprehensive visual approval. J–M remain approved queued requirements, not immediate work ahead of Property Overview.


## Batch N approved — Financial accounts

Evidence: owner said “batch N approved.” N1–N5 approved in ZMR-property-overview-continuation.md: compact Overview account reference; preserve existing identification and add optional institution/purpose/notes; distinguish property-specific/entity-shared associations without inferred account access; explicit supporting-document links without automatic posting; archive/restore, historical references, Updated on and scoped history.

Queued requirements only. Reconcile multi-owner account context with the current ownership implementation before building. Existing personality/design patterns remain the visual baseline. Terminal handoff remains on hold until owner shares its completion report; do not send the whole backlog. Next Overview planning topic: Insurance. No application source, live records, migration or deployment changed by this approval update.


## Insurance review prepared — O pending

See docs/planning/ownership-property/ZMR-insurance-batch-O.md for existing-field inventory, numbered proposals and acceptance checks. Preserve current Insurance cards and property-page personality. N remains approved; O awaits owner feedback. Terminal handoff remains on hold; no source/migration/live-data changes.

## O1-A ownership terminal — increment 2 (entity/membership UI, bypass closure, I1 fix) — September 24, 2026

Continued the ownership implementation from commit `7b615e5`, per `docs/planning/ownership-property/ZMR-ownership-next-increment.txt`. This is the ownership-scoped terminal's own work, separate from the Capture/History/Property-Overview/Insurance planning above — no overlap, no files shared.

**Implemented and verified locally (not deployed):**
- **Full owner/entity profile page** (`/entities/:id`): Identity, Contacts (reusable people/methods), Linked properties, Tax classification + Election history, Membership (entity roster with percentages), Documents (Phase 1 — link only), Financial accounts (reused unchanged).
- **Settings ownership-reassignment bypass closed.** `OrganizationTypePropertiesPanel.tsx`/`useOrganizationTypeProperties.ts` deleted; `updatePropertyLlc`/`listPropertiesByLlc` removed from `propertiesQueries.ts`; the Settings "View properties" row now embeds the same `EntityLinkedPropertiesPanel` the entity profile uses. There is exactly one write path for a property's ownership interest now, from either side.
- **A real correctness bug found and fixed**, per the checkpoint review: the ownership-completeness logic previously inferred "complete" whenever every entered owner had a known percentage — which wrongly rejected the legitimate case of "one owner at 48%, the rest not yet entered." Fixed with an explicit `allocation_status` ('incomplete'/'complete') the user asserts via a checkbox on every save; never inferred. Regression-tested at the database layer and confirmed working in a real browser.
- **The migration-idempotency claim from the prior checkpoint was corrected.** It previously claimed idempotency from two fresh-database applications, which only shows repeatable clean setup. Actually tested: reapplying an already-applied migration fails immediately and loudly, identical to how every pre-existing migration in this repo behaves — Supabase's own migration ledger, not idempotent SQL, is what prevents double-application in real operation.
- **Fixture identities corrected to be obviously fictional** (`ZMR-TEST-FIXTURE`-prefixed) for the new verification work, distinct from the prior checkpoint's schema-level tests, which incidentally reused the repo's real seed-migration property/entity names — both are now clearly labeled for what they do and don't prove.
- **New: an isolated mock-data browser-test harness** (`npm run dev:harness`, `http://localhost:5180/harness.html`) — a separate Vite entry/port with the real Supabase client and auth context replaced by in-memory mocks for that bundle only, never touching the real `npm run dev`/`.env`. Used to actually click through the new UI in a real browser: the property Ownership box's full add-owner/mark-complete/save flow, and every section of the entity profile page, all confirmed rendering and behaving correctly. This is real evidence the UI works, explicitly **not** Supabase-integration or owner-acceptance evidence — the harness cannot reach any real backend by construction (no URL, no key).
- `npm run build`/`lint`/`test` all clean (20/20 tests, up from 16).

**Genuinely blocked, not attempted:** real Supabase integration testing. This Supabase org has exactly one project (the live one) and this environment has no Docker/Colima for a local stack. Two concrete options exist, both requiring the owner's own action — see the numbered decisions below.

**Files:** see `docs/planning/ownership-property/O1-A-implementation-contract.md` v3.1 §6 for the exact list (2 migrations revised in place, ~13 new application files, ~7 modified, 2 deleted, plus the new `src/devHarness/` harness).

**Owner decisions needed:**
1. How to get real Supabase integration testing running: install Docker/Colima (free, one-time software install) so `supabase start` works, or create a second dedicated nonproduction Supabase project through the dashboard. Either unblocks re-running all of this session's database-level verification against the real platform instead of a hand-built approximation.
2. Whether the pre-existing Property information box's own save should get the same stale-write protection now built for ownership interests.
3. Hosted upload per-file size limit — still needed from whoever has Supabase dashboard access, to unblock Phase 2 (actual file upload) only.

**Next:** once a real Supabase target exists, re-verify against it and write the numbered owner UI test script (deliberately not written yet — a script tested only against the mock harness would describe mock behavior, not the owner's real app).
