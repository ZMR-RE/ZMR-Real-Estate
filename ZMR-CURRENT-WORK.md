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
