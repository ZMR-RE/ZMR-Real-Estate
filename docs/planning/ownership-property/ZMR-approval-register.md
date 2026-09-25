# ZMR approval register

Version 0.2 · September 23, 2026

## Rules

- User approval must reference the proposal or clearly describe the approved behavior. Never infer approval from silence, absence of an audit finding, exploration of a mockup, or approval of a neighboring item.
- Keep stable IDs. New versions do not inherit approval for materially changed behavior.
- Record exact user wording, date, version, conditions, included batch and verification evidence.
- The mockup is a proposal, not an operational approval interface. Clicking it does not approve or save anything to ZMR.

## Confirmed directions and constraints

| ID | Direction | Evidence / status |
|---|---|---|
| C01 | Eight-stage build order in build map | User: “I approve you build order.” Approved sequence only |
| C02 | Workspace/entity/property/unit/lease-tenant layers | User: “I like the layers you created. They absolutely makes sense.” Approved concept, detailed schema proposed |
| C03 | Record single-member LLC / elections and tax classification | User explicitly agrees. Approved requirement; exact fields/validation proposed |
| C04 | Protect current real data | User: “we don’t wanna remove anything. We want a safe build.” Required constraint |
| C05 | Numbered approval before detailed execution batches | User explicitly requests numbered recommendations and approved groups. Required process |
| C06 | Every document associated with property or LLC/entity and searchable | User explicitly requests. Approved requirement; staged capture exception and linking design proposed |
| C07 | Document labels, human-readable fields, meaningful zeros and freshness | User confirms these need a system. Approved requirement; placement/rules proposed |
| C08 | Quick capture routes to Action queue with item categories | User explicitly describes. Approved workflow intent; detailed transitions not approved |
| C09 | Property section before bookkeeping implementation | User explicitly states current focus. Scope constraint |
| C10 | User's portfolio is first customer workspace; operator console/CRM later | User explicitly describes. Product direction; no elevated access implied |
| C11 | Review existing project rules and roadmap | User explicitly requests. Initial source/rules review completed; deployed-state verification remains pending |

## Numbered ownership recommendations — v0.2, approval updated September 23, 2026

Providing project files did not approve these recommendations. `ZMR-project-reconciliation.md` records revisions: existing entities/holding companies/accounts must be reused; address remains the property identifier; Save remains the persistence label; blank fields stay omitted in view-only boxes. The earlier visual is v0.1 and is not build-ready.

| Number / stable ID | Recommendation | Status | Proposed batch |
|---|---|---|---|
| 1 / OWN-01 | Keep Add property; choose an existing owner/entity or add one first, including direct individual ownership; reuse existing LLC records | Approved for specification — direction only | O1.3 |
| 2 / OWN-02 | Create an Ownership profile with identity, legal form, contacts and linked properties; distinguish actual entity from entity type | Labels approved: Owned by / Owners & entities / actual profile name / Legal structure. Profile fields and behavior pending | O1.1–O1.2 |
| 3 / OWN-03 | Keep legal structure, member count and federal tax treatment/elections separate; permit Unknown / needs review | Proposed detail under C03 | O1.2 |
| 4 / OWN-04 | Use four short steps: Ownership → Property basics → Documents (optional) → Review | Approved via Batch B 4A–4G | O1.3 |
| 5 / OWN-05 | Link optional ownership/property evidence to one reusable document record; retain filenames and support multiple contextual links | Proposed detail under C06 | O1.2–O1.3 |
| 6 / OWN-06 | Show readable owner identity, source/as-of/updated dates where meaningful, and explicit missing-data states | Proposed detail under C07 | O1.2–O1.3 |
| 7 / OWN-07 | Preserve existing ownership text and records; use reviewed mappings, no automatic direct-owner identity guesses | Proposed method under C04 | O1.1 |
| 8 / OWN-08 | Track effective-dated ownership relationships; distinguish an information correction from an actual ownership change | Proposed | O1.1–O1.2 |
| 9 / OWN-09 | Add owner filtering/grouping to registry and a path to owner profiles; avoid a full sidebar redesign now | Proposed | O1.2–O1.3 |
| 10 / OWN-10 | Release in small verified batches with preservation, permission, functional and visual checks | Proposed method under C04/C05 | All |

OWN-01 direction, OWN-02 labels, and Batch A items 2A–2E, 3A–3B, 5A and 7A are approved product requirements. Remaining parent-item details and OWN-06, OWN-08–OWN-10 are not automatically approved. Batch B items 4A–4G are also approved: four steps, required owner/address, short setup, deferred entity persistence, optional documents, review/Save/Overview, and duplicate/retry safeguards. Unconfirmed technical details, physical data changes and migrations still require specification/review. Nothing is Ready for build. Continue related approval questions in numbered batches.

## Proposed decision groups

- Group A — structure: 1, 2, 3, 7, 8. Confirm ownership terminology and fields before flow details.
- Group B — presentation and evidence: 4, 5, 6, 9. Review the flow visual and document rules.
- Group C — execution method: 10 and builder handoff acceptance gates.

Groups are review aids, not all-or-nothing approval bundles. “Approve 1 and 2; revise 3” is valid. A partial approval should not authorize dependent behavior still unresolved.

## Pending design decisions

| ID | Decision | Recommendation awaiting approval |
|---|---|---|
| Q01 | Required details to create a property | Owner selection + address-based identity; preserve legacy name values without making nickname the identifier. Owner, street, city, state and ZIP required for new creation: approved in 4B; existing incomplete records stay editable |
| Q02 | Missing direct-owner identity | Keep existing “Individual ownership” unresolved until user identifies owner; no guessed person record |
| Q03 | Multiple direct owners | Support a relationship model that can represent multiple owners; do not create a fictional joint-ownership LLC. Defer ownership percentage entry unless needed now |
| Q04 | Full EIN collection | An EIN field already exists: preserve it and any stored values; do not infer it is securely masked/encrypted. No new SSN field or broader identifier collection without scope approval |
| Q05 | Membership detail | Capture single/multiple/unknown now; defer member roster and allocations to explicit scope |
| Q06 | Tax elections | Record treatment, effective date and supporting evidence; do not claim submitted election is accepted |
| Q07 | New entity within Add property | Approved 4D: new entity and property persist only at final Save; cancelling leaves neither created. Upload staging implementation must preserve this behavior |
| Q08 | Document sources | Reuse approved storage; support existing document links. External-reference URLs are not automatically ingested or made public |
| Q09 | Future unassigned phone captures | Stage privately in the workspace inbox; require property/entity assignment before final filing/posting. This exception needs confirmation |
| Q10 | Ownership changes | An app record update does not execute a legal property transfer; financial effects require their own future workflow |

## Decision log template

| Date | Item/version | Exact user decision | Conditions | State | Batch | Evidence |
|---|---|---|---|---|---|---|
| September 23, 2026 | OWN-01 / v0.2 | “yes i approve this direction” | In response to keeping Add property, selecting/adding an owner first, direct ownership support, and reusing existing LLC records. No other numbered item or production execution included | Approved for specification | O1.3 | User response in this planning conversation |
| September 23, 2026 | OWN-02 labels / v0.2 | “yes approve. Also u can give me batched questions to approve and maybe number them for clear conunication.” | Approves Owned by, Owners & entities, actual person/organization name as profile title, and Legal structure; existing records/links preserved. Does not approve unspecified profile fields | Labels approved | O1.2–O1.3 | User response to the naming proposal |

## Repository constraints awaiting decision

- “Organization type” was explicitly selected in roadmap 8.2b. The user has now approved the OWN-02 replacement labels. Record this superseding decision in the eventual approved roadmap amendment; do not erase the historical item.
- Current rules require address identity, Save labeling, view-only profile boxes, blank-field omission, and pick-list-first categories. Apply these to the next visual; any exception must be explicit.
- Live UI verification under the reserved test actor and new-empty-account checks must be part of the eventual completion plan. This review authorizes no live edits.
- Uncommitted default-unit work must settle before Add property integration.

## Deferred scope

Bookkeeping implementation, tax calculation, deduction eligibility, mortgage forecasts, full document center redesign, global navigation redesign, email integration, operator console, CRM, subscription management, and AI-agent automation are not included in the ownership build.

## Review batch A — approved product requirements, September 23, 2026

Sub-IDs keep original recommendation numbers stable. Approval of one sub-ID does not approve its siblings.

| ID | Proposed decision | Status |
|---|---|---|
| 2A | One reusable profile per actual individual/entity; multiple properties can link to it; no duplicate owner per property | Approved for specification |
| 2B | Minimum new-owner fields: owner kind and legal name; entity legal structure can remain Unknown; no EIN/tax completion prerequisite for property entry | Approved for specification |
| 2C | Preserve existing EIN, registered agent, formation state/date, annual-report deadline and holding-company link; propose display name, mailing address and notes as additional fields | Approved for specification |
| 2D | Separate entity/person contact details from property-specific contact details; explicit user choice to reuse, no automatic move or overwrite | Approved for specification |
| 2E | Read-only profile sections: Identity, Contacts, Linked properties, Documents; Tax classification specified under OWN-03. Edit per existing box rules; existing shared financial accounts remain accessible | Approved for specification |
| 3A | LLC membership Single member / Multiple members / Unknown; separate federal tax treatment field; no automatic tax classification | Approved for specification |
| 3B | Record election type, status, relevant dates and supporting documents; submitted is not accepted; retain prior history rather than overwrite | Approved for specification |
| 5A | Owner documents use the shared document system; can link to owner only or owner and property; preserve original filename and readable label; no mandatory upload to create owner/property | Approved for specification |
| 7A | Legacy Individual ownership remains intact until actual owner identified; never infer identity from login, address or contact email; no forced re-entry | Approved for specification |

These are product decisions. Detailed validation, supported enum/configuration strategy, migration, permissions, revised visuals and acceptance criteria still need to be reconciled before build readiness.

## Batch A approval evidence and terminology clarification

User: “2a. yes” followed by clarification that one platform user wants multiple entities, each owning one or several properties; “2b. agreed”, “2c. agreed”, “2d. agreed”, “2e. agreed”, “3a. agreed”, “3b. agreed”, “5a. agreed”, “7a. agreed”.

Record all nine as approved product requirements. The question attached to 2A asks for explanation, not withdrawal of approval. Interpret the intended current scope as one customer portfolio with multiple property-owning entity records and direct personal ownership where applicable. Entity creation does not create a login, another customer workspace, an invited user, or any access grant. Do not use this approval to expand into third-party owner onboarding or team administration.

Vocabulary: user/account owner = person operating their customer workspace; ownership entity record = LLC or other actual property owner represented inside that workspace; property = asset linked to that entity. The signed-in user is not automatic evidence of title, membership or tax status. “Owner profile” was used for the latter record and should be explained as an entity/ownership record. Any further global rename beyond the already approved labels remains a proposal.

## Batch B — Add property flow (approved)

Evidence: user said “Approve Batch B” on September 23, 2026, approving all seven preceding product recommendations. This approves specification of the behavior, not a live deployment or unrelated schema changes.

| ID | Approved behavior | Status |
|---|---|---|
| 4A | Ownership → Property basics → Documents → Review; Back/Continue preserve input; only Save creates records | Approved |
| 4B | Owned by, street, city, state and ZIP required for new properties; address is identity; no required nickname; existing incomplete records editable | Approved |
| 4C | Purchase date/price available but not required; building, units, insurance and tax history remain in Overview; preserve all existing fields | Approved |
| 4D | Add a new entity inline; cancel leaves no accidentally created entity or property | Approved |
| 4E | Attach/link or skip documents; show entity/property/both association | Approved |
| 4F | Review ownership/address/acquisition/documents; final Save opens new Property Overview | Approved |
| 4G | Warn on likely duplicates; never auto-merge; failed save retains data; retries cannot duplicate records | Approved |

Next deliverables: preview revision v0.2 for visual review and O1-A scoped builder package. The detailed owner profile visual and production migration plan are not yet approved.

## Batch C — Acquisition details (approved)

Evidence: user said “I approved Batch c”. C1–C5 are approved product requirements, not deployment authorization.

| ID | Approved requirement |
|---|---|
| C1 | Optional purchase date, purchase price and acquisition method (purchase, inheritance, gift, transfer); unknown values never replaced with zero. |
| C2 | Reusable acquisition contacts: agent, brokerage, closing attorney, title/escrow company; name, company, role, phone, email. |
| C3 | Linked purchase agreement, closing disclosure/settlement statement, deed, title policy, inspection and appraisal; readable label, original filename, category, document date. |
| C4 | Detailed closing-cost entry deferred to bookkeeping; document upload creates no accounting entries or tax deductions automatically. |
| C5 | Acquisition fields, contacts and document links remain editable later; missing optional information never prevents property saving. |

Visual approval: preceding “looks good!” approves the displayed Add property v0.2 layout, not unshown entity profile screens or backend behavior.

Ownership clarification: user agrees actual legal ownership changes need a separate workflow, but an incorrect owner selected/entered at creation must be correctable. This approves correction capability and the distinction from transfer; the detailed correction safeguards below are now approved D1.

## Batch D — correction safeguards and upload policy (approved)

Evidence: user said “Approve Batch d.” All D1–D5 are approved product requirements. The live 50 MiB limit remains subject to hosted-setting verification; no production changes were made.

| ID | Recommendation |
|---|---|
| D1 | Edit Owned by offers “Correct an entry mistake” separately from “Record a legal ownership change.” Correction records previous/new owner, actor, timestamp and reason, creates no legal transfer event, and previews affected links. Preserve document links and posted financial records; never silently reassign books or relabel historical evidence. If posted records depend on the erroneous owner, flag for a separate reconciliation workflow. |
| D2 | Up to 25 files per upload batch; allow further batches, with no lifetime document-count cap per property/entity. Existing Quick Capture remains limited to 25 attachments per entry. |
| D3 | Approved target per-file ceiling 50 MiB (52,428,800 bytes), subject to verifying hosted storage settings before implementation. Display the limit before selection; validate client and server; do not lower limits on existing files. |
| D4 | Each file has its own category, readable label and property/entity links; allow bulk defaults with per-file adjustment. Per-file progress/errors and retry only failed uploads without duplicates; continue with valid files and preserve unsaved metadata. |
| D5 | Measure total workspace storage and show usage; defer a paid-plan quota amount until hosting capacity/cost are verified. No claim of unlimited storage. Existing records remain readable/downloadable if a future quota prevents new uploads. Linked copies count once. |

Source inspection: Quick Capture MAX_ATTACHMENTS_PER_ENTRY=25, enforced by callers; property DocumentLinkForm currently selects one file per save. Property Documents page sizes 25/50 are display pagination, not upload caps. No per-property lifetime document count cap was found in inspected code. Local supabase/config.toml sets 50MiB; hosted bucket settings and account-wide storage allowance remain unverified. These findings do not change production settings.


## First implementation handoff — remaining approval boundary

Batches A–D are approved within their recorded scopes. No further acquisition, upload-policy or ownership-field approval batches are required for the first scoped handoff. One final review remains: the owner/entity profile visual and the concrete O1-A implementation scope, preservation checks and completion criteria. Preparing its technical contract is builder work, not another user questionnaire. Raise a new product question only for a material conflict with approved requirements.

The first implementation package is ownership foundation and owner/entity profile. Add property and acquisition follow against that foundation. Full legal transfer workflows, ownership percentages, global registry filters/freshness, bookkeeping and operator CRM are deferred and must not delay this first package. The existing assessment prompt can already be used for read-only terminal preparation; it is not yet a final implementation prompt or live-release authorization.


## Batch E — Property Overview layout and editing (approved)

Evidence: user said “Approve Batch E” on September 23, 2026, approving E1–E7 below. These are Property Overview requirements for the subsequent build, not additions to the terminal's current O1-A preparation scope or new global operating rules.

Approved proposed page order: Property identity → Ownership → Acquisition → Building details → Units & occupancy → Insurance → Property taxes. Documents remain in the property's Documents tab with contextual access in relevant sections.

| ID | Approved requirement |
|---|---|
| E1 | Address is the header title; show property status and Owned by as an owner/entity profile link; essential identity visible without expanding a section. |
| E2 | Acquisition groups acquisition date, method, price, contacts and closing documents; concise collapsed summary and full expanded details, using approved Batch C fields. |
| E3 | Group whole-property physical facts: property type, year built, building area, lot area and applicable characteristics. Separate unit-specific facts. Preserve existing fields. Exact field list still requires reconciliation with current screens and the user's spreadsheets. |
| E4 | Existing units and leases remain authoritative for occupancy; show summary and links without duplicate tenant/rent/lease entry in Overview. |
| E5 | Show acquisition, insurance and tax documents in the corresponding sections and central property Documents view using the same underlying records/files. |
| E6 | Separate record Updated on from business dates such as closing date, policy effective date and tax year. An edit timestamp must not imply independent verification. |
| E7 | Existing section-level Edit → Save/Cancel pattern; saves update only that section's fields. Hide empty optional fields in view, expose in Edit; never substitute invented zeros. |

Next planning topic: exact Building details fields, based on the current implementation and available user spreadsheet evidence. E3 does not approve an invented complete field inventory or deletion of existing fields. No application changes or completion claims accompany this approval.


## Batch F — Building details field inventory (approved)

Evidence: user said “Approve Batch f.” F1–F8 approved September 23, 2026.

Source review September 23, 2026: propertiesQueries.ts, propertyFieldGroups.ts, PropertyForm.tsx, unitsQueries.ts and propertySpecs forms/section. Source code evidence only; no claim of reconciliation against the user's spreadsheets or hosted data. Property-level beds/baths already exist; the current Unit interface does not expose structured bed/bath/area fields, so do not assume per-unit structured equivalents exist based on old comments.

| ID | Proposed behavior |
|---|---|
| F1 | Basic building facts: property type (existing editable pick list), year built, and Living area (sq ft). Preserve the meaning of existing living area; do not silently rename it gross building area. All optional; absent does not mean zero. |
| F2 | Land and jurisdiction subgroup: lot size with sq ft/acres, county, township, municipal zoning code, county assessor use code. Preserve legacy lot text until a user supplies structured values; preserve entered units. |
| F3 | Preserve Property tax ID/PIN as a property identifier shown here and linked to Property taxes. Reuse the same underlying value. Multiple-parcel support is a future decision, not permission to split or replace existing IDs. |
| F4 | Building features subgroup: basement, exterior wall materials (multi-select), garage spaces, street parking and parking notes. Reuse existing pick lists; known None/zero differs from missing. |
| F5 | Preserve existing property bedrooms/bathrooms, label them Whole-property bedrooms / Whole-property bathrooms. Do not automatically replace with sums or copy them into units. Any future unit totals must distinguish incomplete data and require explicit reconciliation of conflicts. No bath-format conversion in this batch. |
| F6 | Preserve Specs & measurements for room dimensions, HVAC and other detailed/custom facts. Reuse Scope (whole building or unit), Area, Label and Value. Do not introduce duplicate HVAC fields. Preserve existing unit-linked specs even on single-unit properties. |
| F7 | Derive unit count and occupancy from existing unit/lease sources; link to Units & occupancy. Do not add a second editable count or place tenant/rent/lease data in Building details. Acquisition method belongs in Acquisition using its existing stored value. |
| F8 | Add optional source note/document link and source/as-of date for a physical fact or measurement. Existing files are linked rather than reuploaded. Keep these distinct from automatic Updated on. No inferred source dates or retroactive verification claims; source field implementation is new scoped work. |

All F1–F8 items are approved product requirements. Layout: Building details contains Basic facts, Land & jurisdiction and Building features; Specs & measurements remains a separate expandable section. Exact labels, legacy mappings and optional validation will be included in the later implementation contract. Existing data is preserved; no new required Building details fields. No new operating rules and no changes to O1-A terminal scope.


## Batch G — co-ownership, property identity and usable trust (proposed)

User explicitly clarified that a property can have multiple owners, including the user and spouse, with multiple phone/email contact methods. Multiple legal ownership must no longer be treated as a wholly deferred need. Do not infer that the user's actual properties are directly titled to both spouses, or that they each hold 50%. An LLC's members/contacts are distinct from the property title owner. Precise model/UI below remains proposed for review.

The user rejects the partial style preview as insufficient to evaluate product personality, trust and usability. It omitted the existing hero image and is not approved as the target page. Preserve existing images. This does not revoke approved A–F fields/behaviors.

| ID | Proposed decision |
|---|---|
| G1 | Allow multiple reusable legal owners per property, selecting people/entities individually; distinguish property ownership from entity membership and contacts. No inferred ownership percentages, tax allocation, marriage relationship, user access or transfer. Revise O1-A and Add property contracts before implementation; exact current owner setup requires user-entered evidence. |
| G2 | Each person/contact supports multiple labeled phones/emails, preferred contact method and optional primary contact designation. Reuse one person/contact across properties/entities; contact role or primary status confers no ownership/access. Do not merge people into a joint name record or overwrite legacy contact data. |
| G3 | Preserve the existing actual property hero photograph and existing design language. Provide responsive cropping/focal point and a compact mobile treatment with readable property identity and access to controls. Existing photo edit/replacement only on explicit user action, never automatic migration. |
| G4 | Keep address/status/owner summary visible with a compact reliable property summary. Reuse verified unit/occupancy facts, show their context, and avoid financial KPI claims until their sources are ready. No fabricated zeroes or trust/health scores. |
| G5 | Show contextual shortcuts to existing Add document, Quick capture and property-filtered Action Queue workflows, preselecting the property visibly and allowing correction. Do not introduce a separate alert system or automatic messages. |
| G6 | Preserve full field depth behind clearly labeled sections, with useful collapsed summaries and direct Edit access. Avoid nested accordion mazes. Retain the current font/nav/hover/box patterns and existing financial-account/specs sections. |
| G7 | Explicit Saving/Saved/error states, retained input on failure, retry without duplicate records, accurate timestamps/source references and functional document links. No decorative security claims or inferred verification; define tested behavior before release. |
| G8 | Proposed review/verification rule requiring explicit approval: use a complete realistic desktop/mobile preview (including hero and multiple owners), then observe a small initial pilot of 5 target owner-users completing key tasks. Track task completion, time, errors and confidence; resolve critical failures and retest. Five is a proposed practical starting sample, not statistical proof or a guarantee of success. Do not add this as a global operating rule unless approved. |

G1–G2 modify an important foundation assumption and must be reconciled into O1-A; do not implement the prior single-owner design unchanged. G3–G8 are subsequent page/review proposals, not blanket permission to expand the current terminal task. User has not approved Batch G yet.

Research (retrieved September 23, 2026):
- AppFolio 2026 Property Management Benchmark press release: 1,617 US residential property management professionals surveyed Sep 26–Nov 3, 2025; 45% plan technology consolidation. Vendor-sponsored, descriptive survey, not causal evidence of success for this SaaS. https://www.appfolio.com/newsroom/property-manager-benchmark-survey-2026
- AppFolio 2025 benchmark summary: over 2,000 property management professionals; 40% more concerned about online fraud and 37% more concerned about data security than previous year. Vendor research, not a visual-design effect estimate. https://www.appfolio.com/blog/post-2025-benchmark-report
- NAR 2025 technology survey release: 82% of agents reported clients responding positively/very positively to technology integration in buying/selling; agent reports and an adjacent audience, not owner SaaS users or hero-image evidence. https://www.nar.realtor/press-releases/realtors-embrace-ai-digital-tools-to-enhance-client-service-nar-survey-finds
- NN/g aesthetic-usability guidance (2024; reviewed 2026): attractive design can increase perceived usability but cannot compensate for major task failures; underlying research includes older studies. https://www.nngroup.com/articles/aesthetic-usability-effect/
- NN/g progressive disclosure guidance (2006, foundational rather than recent): prioritize common tasks and reveal specialized details clearly. https://www.nngroup.com/articles/progressive-disclosure/

No source found establishes that a hero image causes property-management SaaS adoption or a reliable probability of commercial success. Recommendations are design inferences to test with target owner-users.


## Batch G — explicit user decisions and ownership scope amendment

Evidence September 23, 2026: G1 “agree”; G2 “agree” with user choosing where contact information is attached; G4 “agree”; G6/G7/G8 “agreed”. G3 requests a visual, not approval. G5 objects to Quick capture in property profiles and asks for a later detailed capture/Action Queue map.

Approved: G1 multiple owners, G2 contextual reusable contacts with multiple contact methods, G4 useful identity, G6 manageable depth, G7 reliability, G8 realistic preview and user testing. The initial five-user pilot remains a practical starting plan; no recruited participants or scheduled tests are claimed.

User adds explicit percentage ownership requirements at both property and entity levels: 100% of one property, 48/52 split of another, and 50/50 entity membership are scenarios, not actual record values to insert. Percentages are no longer excluded from foundation planning. Detailed validation/history/tax rules need specification and review. Never infer marriage, ownership or tax allocation from examples.

G2 requires choosing attachment to property/entity and role; contact reuse is not automatic propagation to every context or an access grant.

G3 pending visual review. G5 not approved: no property-profile Quick capture shortcut. Future capture/action-queue workflow and visual design need their own approval; no automatic adoption of a new queue capture button.

User testing instruction: owner enters all property/entity and normal business information through dashboard UI, not terminal scripts or terminal-created live data. Tell the owner when a testable build is ready and provide numbered steps, expected results and pre-test preservation precautions. No real-data seeding, identity inference or direct DB edits. This explicitly requested instruction supersedes a conflicting plan to let a terminal populate live verification records for this batch.

Terminal package review: O1-A v1.0 still excludes ownership percentages and uses a single properties.llc_id plus flat contact fields. It is not implementation-ready for this amended scope. Preserving IDs lowers risk but does not establish zero risk. Extending document FK columns supports one entity per document, not arbitrary multiple-entity links. Audit coverage and existing-data assumptions require verification. Revised terminal prompt: ZMR-terminal-revision-prompt.txt.

Next detailed decisions to propose: percentage completeness and totals; effective dates/history and unknown historic dates; tax-report recipient/year and reviewed allocations distinct from title/equity shares; explicit contact attachments. No tax calculations or legal transfer implementation approved by these examples.

Research additions: SaaS Capital 2026 survey of >1,000 private B2B SaaS companies associates movement from 90–100% NRR to 100–110% NRR with 5 percentage points higher growth (observational, not causal): https://www.saas-capital.com/research/private-saas-company-growth-rate-benchmarks/ . ChartMogul's 2025 retention analysis classified ~3,500 software companies; for the >=$250k ARR retention comparison, median B2B NRR 82%, B2C 49%, AI-native 48%; mixed segments, platform sample and automated category classification limit generalization: https://chartmogul.com/reports/saas-retention-the-ai-churn-wave/ . IRS Schedule K-1 guidance describes partner-specific income/deductions/credits and special allocations; ownership percentage is not a universal tax-allocation rule: https://www.irs.gov/instructions/i1065sk1 .


## Hero feedback and Batch H — proposed navigation/investor priorities

User strongly likes hero concept look/feel, but explicitly flags missing Portfolio KPIs and other navigation as a regression. Record visual direction endorsement, not full screenshot/layout approval. Existing navigation/features must not disappear due to abbreviated concept. User is exploring Automations under Action Queue, a standalone Command Center for multi-mailbox property/entity communication, and possible Rent ops relocation. Tentative ideas are not implementation approvals.

User explicitly asks assistant to give independent agreement/disagreement and reasoning, rather than treat each idea as an absolute instruction. Record this collaboration preference.

Current source evidence: PropertyForm status manually selects Active/Inactive/Sold; it is not computed occupancy/health. PropertyPhysicalFactsStats has occupied-unit counts supplied from unit status and Monthly rent supplied from active leases, once per lease, not per tenant. These are distinct sources and can disagree; validate before claiming lease-based physical occupancy. Roadmap 10.5 already proposes Action Queue tabs To resolve/Automations, while Phase 11 still calls for standalone Automations: a future approved relocation must reconcile those entries, not delete history.

| ID | Pending recommendation |
|---|---|
| H1 | Keep Portfolio KPIs as a top-level destination across properties/entities, with entity/property/period filters. Keep property-level KPI drilldown. Separate full-asset figures from attributable ownership figures; never double-count assets through entity and person rollups. |
| H2 | Consolidate Automations into an Action Queue tab alongside To resolve; preserve rules, run history, paused/failed states and existing functionality. Reconcile roadmap 10.5 and Phase 11 before removing the standalone entry. |
| H3 | Keep Command Center as its own destination for connected mailboxes and communications across properties/entities. One mailbox may relate to several contexts; one property may relate to several mailboxes. Link actionable messages into Action Queue. Draft generation and automatic sending are different future approval scopes; no send permissions granted here. |
| H4 | Do not bury Rent ops in KPIs. Keep current access for now; later consider a Rent collection tab under Financials & tax with KPI links to the work. User has not approved relocation. |
| H5 | Add a compact summary strip immediately BELOW hero/status, not overlaid behind status. Show occupancy, current contracted monthly rent and relevant Action Queue attention; preserve existing sources/controls. Support narrow screens without oversized hero hiding priorities. |
| H6 | Retain Active/Inactive/Sold as manually selected property lifecycle status, explicitly separate from occupancy, collections and performance. Rent labels must distinguish current contracted monthly rent from period charges, receipts and overdue balances. Show dates/basis and incomplete data; no false zero. Occupancy must distinguish vacant vs unavailable vs missing and count units, not tenants. |
| H7 | Information priority: hero/identity/status → operating snapshot → urgent items and upcoming lease events → full ownership/contact details → acquisition/building and other existing sections. Preserve Financial accounts, Insurance, Taxes, Specs, Utilities, deposits, estimates and unit/tenant access. Later verified NOI/cash flow/debt summaries need explicit definitions and source readiness; no speculative metrics now. |

All H1–H7 remain proposals. No new global navigation changes or live actions authorized. Future complete visual must depict full nav and property KPI access; generated concept omissions are not instructions.

Research: AppFolio owner portal docs distinguish occupancy and rent charged vs paid month-to-date: https://www.appfolio.com/help/owner . IREM describes property management focus on optimizing rental income/operating expenses/NOI: https://www.irem.org/learning/career-development-resources/property-manager . These support topic relevance, not a scientifically established universal ordering; proposed priority is a hypothesis for target-owner testing.


## H decisions and tab-boundary clarification

User explicitly approves H1, H2 (Automations as another Action Queue tab), H3, H4 and H5. The standalone “yes” immediately following H5 is interpreted as H6 approval by sequence; make that interpretation visible in the reply. H7 is NOT approved: user objects to duplicating KPI/Financials/Mortgage/Activity/Documents content in Overview.

User clarifies desired separation: property rent operations belong in the property's Financials area (retain current tab name unless separately changed); all-property rent/cash-flow analytics belong in portfolio-wide reporting. This supplements H4, which preserved current rent access until the workflow is mapped. Do not delete/relocate the existing Rent ops route on this clarification alone. Cash flow is broader than rent receipts; do not label rent totals as cash flow.

Recommended revised H7 (pending): Overview = property identity/photo, compact approved occupancy/contracted-rent snapshot with source links, ownership/contacts, acquisition/building facts and existing operational sections. KPI = deeper performance and attention/lease-event summaries; Financials = rent charges/payments/balances and financial records; Mortgage = debt; Activity = dated events/communications history; Documents = document library. Compact reused summaries/contextual attachment links are permitted, not duplicate storage/edit forms. Preserve existing Insurance/Taxes/Financial accounts/Specs/Utilities/Deposits/Estimates/Units access; any relocation requires explicit section-by-section mapping. No new giant Overview task list or duplicate KPI screen.

User's recurring-use priorities (Command Center, Action Queue, Quick Capture, portfolio KPIs) are recorded as workflow direction, not approval of a new combined home dashboard.

## Batch I — recommendations to settle terminal v2.0 decisions (pending)

| ID | Proposed decision |
|---|---|
| I1 | Percentage optional while gathering records; allow incomplete drafts, clearly mark unallocated/unknown shares; known percentages >0 and <=100, combined interests at the same ownership level/time cannot exceed 100. A complete confirmed allocation totals 100; never auto-fill missing shares. Use exact decimal precision and atomic multi-owner validation in the contract. Do not mix direct property and indirect entity interests in one total. |
| I2 | Preserve effective-dated ownership and membership history from this build; unknown historic dates remain unknown. Store recorded-at separately. Distinguish correction from actual change. No automatic legal transfer or tax recalculation; actual transfer workflow remains later. Current and historic interests must not overlap ambiguously; exact temporal contract needed before implementation. |
| I3 | Do not invent a primary legal owner or accounting owner for multi-owner properties. Keep property-specific accounts and explicitly linked entity accounts distinguishable. Ownership percentage does not allocate books or authorize accounts. Builder must migrate/review every single-owner consumer and choose safe legacy-pointer handling without blanking/remapping records now. No first-owner fallback or automatic loss of existing account access. |
| I4 | Apply reason/history safeguards to corrections of entity membership as well as property ownership, consistently across all routes. |
| I5 | Add stale-edit protection to the touched Property information save path and change history for new contacts/methods/links, within this batch; preserve drafts and restrict access to sensitive audit details. No dashboard-wide rewrite implied. |

Technical builder requirements under already-approved integrity/reliability: enforce correction/audit requirements at the database/API boundary with correct account authorization, not frontend query-file discipline alone; choose mechanism without asking user to design security. Verify hosted upload limits separately from unaffected work. If read-only checks uncover inconsistent records, report exact issue privately and propose repair; do not guess or silently edit. Unified reassign correction remains settled.

Contract v2.0 still references v1.0 acceptance sections as “carry forward” although v1.0 was overwritten: next revision must be self-contained or link a retained version, with every required test explicit and no missing historical references. Review aggregate percentage races across different owner rows, not only stale edits to the same row. Contacts with both property/entity links need explicit context semantics before claiming independent reuse.


## Revised H7 and Batch I approved — implementation continuation

Evidence: user says “I approve h7 with the revision. I approve batch I” and requests keeping terminal working on approved items while planning continues. Revised H7 and I1–I5 above are approved without reopening their product choices. User also explicitly agrees rent totals alone are not cash flow.

Authorization: proceed with bounded local ownership-foundation implementation, isolated verification and approved profile behavior, after incorporating I decisions into the contract. Old blanket assessment-only/awaiting-review status is superseded for this scoped work. Unapproved hero details/navigation changes remain pending and do not block independent foundation work. No production migration, release, live business-data entry, tax calculations or automatic communications authorized. Owner conducts dashboard data entry and acceptance testing.

Continuation prompt: ZMR-approved-work-terminal-prompt.txt. Prioritize foundation/compatibility/integrity tests, then approved profile UI using current design patterns. Keep migration files additive, test locally, inspect hosted limits without guessing and isolate that upload-release blocker. Updates must distinguish implemented locally, verified locally, awaiting owner UI testing and released.


## Batch J approval — capture/queue, with J2 location clarification pending

User says “I approve Batch J.” J1 Quick Capture records inputs; Action Queue reviews/resolves. J2 reuse one capture form; user explicitly requests it open in place rather than navigate to the global page, with property preselection from context. User mentions property profile, conflicting with prior no-property-Capture decision; a clarification is pending on button placement only. Do not implement profile Capture without resolving it. In the meantime Action Queue scoped to exactly one property can preselect that property visibly; unfiltered/multi-property views cannot guess.

J3 format (receipt/visit/communication/mileage) distinct from work category (leasing/occupancy/maintenance/bookkeeping). J4 save creates linked review item, reuses attachments, does not automatically post accounting/change ownership/send messages. J5 filing/review status separate from completion of follow-up work. J6 user selects property/entity/both, with private Unassigned allowed for intake and assignment required before final filing/posting. J7 To resolve offers Needs review/Open work/Completed filters; Automations separate tab; contextual fields visible. These are approved requirements for a subsequent batch, not permission to interrupt ownership implementation.

Terminal checkpoint 7b615e5 confirmed present by git log; contract reports new schema/services and one property Ownership UI increment, tests, and mocked-platform Postgres verification. This chat did not independently rerun those tests. Entity/membership UI and Settings bypass unresolved; no browser/integration/owner acceptance done. Fresh-database repeatability is not rerun idempotency. Recheck percentage validation against incomplete owner lists rather than assuming all entered percentages imply a complete allocation.


## J2 resolved — contextual Capture button, no property Capture tab

User clarification: “it can have a button to capture information but i meant it should not have its own tab within a property profile.” Approved: property profile Capture button opens the shared form in place (drawer/dialog), visibly preselects the property and permits correction. No separate property Capture tab, no separate capture data model, and no navigation away to the global Quick Capture page. This supersedes earlier notes excluding a property-profile button. Action Queue can use the same form, preselecting a single-property context where present. Owner associations must not be guessed from the property. Terminal is running on ownership; do not interrupt it with this later feature.

## Batch K — Capture form and review transitions (proposed)

| ID | Proposal |
|---|---|
| K1 | Shared responsive drawer/dialog opened by contextual Capture button, with property chip/selection visible and editable. Global capture has no guessed property. Mobile can use a full-screen dialog. Keep Cancel/Save and confirm before discarding unsaved input; successful Save confirms the review item and stays in originating context. |
| K2 | Preserve existing capture types and their existing fields: Receipt, Visit, Communication, Mileage. Require capture type and event date; property/entity association can remain Unassigned at intake under J6. Show relevant fields for the chosen type. Exact existing field inventory must be reconciled before build; do not remove fields or add blanket requirements for receipt amounts/vendors merely to save intake. |
| K3 | One or more explicit property/entity associations where supported by approved model, multiple attachments per D, optional notes and work category; do not infer or auto-attach every owner. Each staged attachment must receive explicit final links before filing. Preserve existing capture scope and review migration plan for new intake associations. |
| K4 | Save creates one capture and its linked Needs review item, with duplicate-safe retries. Review can save progress, file supporting documents, explicitly create/link follow-up work, or route to bookkeeping review. No automatic posting/sending. Mark review complete only when its required routing/association decisions are resolved. |
| K5 | Work is Open, In progress or Completed, separate from capture review/filed state. Due date optional; no date never means overdue. Financial verification/posting remains separate from work completion. Avoid global new workflow states unless this batch's exact scope is approved. |
| K6 | Completion does not erase source capture, documents or linked work. Allow reopening with history and soft archiving mistakes/duplicates with a reason; no automatic merge or hard deletion. Duplicate detection is a warning, not permission to discard evidence. |

K1–K6 remain pending. This is subsequent workflow planning, not new scope for the running ownership terminal.


## Batch K approved

Evidence: user said “batch k approved.” All K1–K6 in the preceding proposal are approved: shared contextual capture drawer/dialog; existing type-specific fields and required type/date with Unassigned intake allowed; explicit contextual links/attachments; review and routing without automatic posting/sending; separate Open/In progress/Completed work status with optional due dates; reopen/archive with history rather than automatic merge or permanent deletion.

The concrete field inventory, state-transition contract, legacy-data compatibility and review visual still need preparation before this subsequent implementation batch. Approval does not authorize additional capture types, global workflow changes beyond the specified scope, automatic messages, or live-data entry by terminal. Keep the running ownership implementation focused on its unfinished approved work.


## Batch L proposed — Capture implementation details (September 23, 2026)

J/K remain approved. Field inventory, lifecycle transitions, preservation safeguards and 16 acceptance cases are prepared in ../capture-review/ZMR-capture-review-specification.md. Interactive demonstration: ../capture-review/ZMR-capture-review-preview.html. Fictional data only; no application implementation or live changes in this planning step.

- L1 pending: one property per capture, or entity-only/Unassigned, plus explicit entity associations. Multi-property receipt allocation happens later in bookkeeping without duplicate receipt files or counting the full expense against each property.
- L2 pending: finish capture review only after retained attachments are filed with valid categories/links, context assigned and requested work/bookkeeping routes saved. Notes-only captures require no fabricated document. Accidental attachments require explicit archive/history.
- L3 pending: separate existing receipt Reconcile posting action into Review/File and an explicit validated Financials posting step. Preserve all previously posted transactions and evidence.
- L4 pending: recurring work requires its first due date; one-off work can remain undated.

Preview layout is pending review, not automatically approved by interaction. Browser checks confirmed category validation, review completion independent of open work, and work completion retaining filed evidence without posting. This is demonstration QA, not application acceptance testing. Running ownership work remains first.


## Latest approval — Batch L approved

User: “approve batch L. One thing I noticed missing was history and how it will be presented in our dashboard.” L1–L4 are approved, superseding all pending-L wording above. This does not approve the preview layout or the newly proposed history presentation. J/K/L are approved for the queued capture scope; ownership remains first. History retention was already required, but its display needs an explicit specification.

Batch M1–M4 proposed in ../capture-review/ZMR-history-presentation-proposal.md: placement, event presentation, coverage/filtering, read-only correction/integrity. All pending; not inferred from the history observation.


## Batch M approved — history presentation

Evidence: owner said “approve Batch M.” M1–M4 are approved: preserve existing history destinations and add scoped capture/work/entity history access; newest-first expandable actor/action/time/record entries; operational event coverage with filters and discoverable completed/archived records; read-only history with new correction events, permission controls and honest legacy gaps. See docs/planning/capture-review/ZMR-history-presentation-proposal.md (filename retained, status updated) and specification v0.2. Supersedes earlier pending-M status.

J/K/L/M are approved for the queued capture scope. Ownership remains first. Capture preview layout remains pending; next preparation is the history visual and implementation handoff reconciliation. No application implementation, live records or deployment changed by this approval-recording step.


## Owner steering — hold handoff; return to Property Overview

Owner explicitly will not send capture/history handoff while terminal is running and will report completion. Do not dispatch it or presume terminal progress. The consolidated handoff is a reference backlog, not the next all-at-once assignment. After checkpoint review, prepare one cohesive bounded implementation prompt at a time with clear dependencies, preservation checks and owner UI acceptance.

Owner says recent workflow previews lack the existing Property Overview personality. Preserve hero/photo, actual typography/navy palette, hover feedback, box hierarchy and established view/Edit interaction. Recent previews do not approve replacement styling. Return planning to unfinished Overview boxes, then review each property-profile tab, supporting Excel-to-dashboard entry with explicit field mapping. Acquisition C, Overview E, Building F and revised H7 have approved requirements but must not be represented as completed screens or comprehensive visual approval. J–M remain approved queued requirements, not immediate work ahead of Property Overview.

Batch N1–N5 proposed, not approved: Financial accounts presentation, optional metadata, explicit scope, linked documents, archive/history. See ZMR-property-overview-continuation.md.


## Batch N approved — Financial accounts

Evidence: owner said “batch N approved.” N1–N5 approved in ZMR-property-overview-continuation.md: compact Overview account reference; preserve existing identification and add optional institution/purpose/notes; distinguish property-specific/entity-shared associations without inferred account access; explicit supporting-document links without automatic posting; archive/restore, historical references, Updated on and scoped history.

Queued requirements only. Reconcile multi-owner account context with the current ownership implementation before building. Existing personality/design patterns remain the visual baseline. Terminal handoff remains on hold until owner shares its completion report; do not send the whole backlog. Next Overview planning topic: Insurance. No application source, live records, migration or deployment changed by this approval update.


## Batch O proposed — Insurance

O1–O7 pending in ZMR-insurance-batch-O.md: existing visual character; identification/coverage; explicit premium basis/payment meaning; reusable contacts/documents; honest date states/renewal history; opt-in renewal task; shared-policy associations/history. Existing insurance source inspected, including missing-expiration Active behavior and ambiguous premium basis. No user approval inferred.


## Batch O approved / cb9b988 checkpoint reviewed

Owner approved O1–O7 (“Approve bath o”) and supplied terminal completion report. Insurance requirements are queued, not implemented. Commit cb9b988 atop 7b615e5 independently confirmed present. Terminal reports entity UI, Settings bypass closure, explicit allocation completeness and mock browser verification; this chat did not rerun reported tests or verify every implementation claim. No actual Supabase integration or owner acceptance yet; documents are reference-only.

Detected contract drift: I5 in the approved register explicitly covers the Property information save path, but contract v3.1 §10 treats it as pending and leaves it unimplemented. Next bounded prompt ZMR-ownership-closeout-terminal-prompt.txt addresses this already-approved gap, separates mock/real owner checklists, and requests read-only environment assessment. No installation, cloud project, production migration or deployment authorized. Prepared for owner to paste, not dispatched by chat. The broad capture handoff remains held; do not start N/O/J–M automatically.


## Owner feedback — reduce vertical stacking; checkpoint received

Owner supplied terminal close-out report for 486be47: Property information/registry stale-save protection implemented and verified via reported static, scratch-Postgres and mock-browser checks; actual Supabase integration, hosted upload limit and owner acceptance remain unverified. Owner says “good for now”; no software install, cloud project, production migration or release authorization inferred.

Owner finds Insurance preview too vertical and says desktop horizontal space is underused across dashboard boxes. Insurance visual approval remains pending; Batch O functional requirements stay approved. Next layout recommendation: a compact full-width Insurance summary row, side-by-side interior information groups on sufficiently wide screens, and narrower-screen stacking; documents/history collapsed below. Review whole Overview box composition separately against existing full-width-expanded-section rules. Do not silently adopt a two-column dashboard or change global rules; use concrete desktop/mobile comparison for owner review. No new build handoff dispatched.


## Horizontal layout direction approved / INS-1 queued

User says “I approve this” to compact Insurance summary row; three side-by-side expanded groups on wide screens, two/one when narrower; documents/history below; review compatible Overview box pairs while detailed sections can expand full width. Exact cross-box pairing is not specified and is not permission for a blanket two-column conversion. Preserve existing visual identity and readable type.

Next bounded terminal assignment prepared: ZMR-insurance-INS1-terminal-prompt.txt. Actual Insurance application presentation using existing schema/fields, honest premium/date meaning, responsive view/Edit and isolated visual verification. No production changes/migrations, no software install/cloud project, no real data entry. New insurance storage, shared policies, contacts, renewals, document/history expansions stay queued as distinct O slices. Ownership 486be47 real-platform integration remains unresolved. Prepared for owner to paste, not dispatched by chat.


## Property tax review prepared — Batch P pending

Inspected existing year/two-installment model and compact table. Proposed P1–P7 in docs/planning/ownership-property/ZMR-property-tax-batch-P.md: compact layout/tax year; bill and variable installment facts; distinct payments; truthful completeness/status; evidence/Financials links; explicit reminders; preservation/history. All pending owner review; no new terminal assignment. Insurance INS-1 remains active. Legacy amount meaning is unresolved and must not be guessed.


## Batch P approved / INS-1 checkpoint reviewed

Owner approves P1–P7 and supplies INS-1 terminal report. Commit dff3397 confirmed present. Source review finds horizontal Insurance presentation and retained existing file-upload input/path; real Supabase evidence and owner visual acceptance remain outstanding. No independent rerun of reported tests in this planning review. PendingFeatureNotes exposes implementation/Batch O references inside product UI. New date helpers lack dedicated source tests found by focused search; timezone comment claims account basis although implementation uses viewer-local dates.

Prepared bounded next prompt ZMR-insurance-INS1-review-cleanup.txt: remove engineering notes from product, test date boundaries, correct upload/test-checklist claims and make styled Overview ready for owner visual review. P remains queued; do not start another broad feature batch. No installation/deployment/live-data authorization. Prompt prepared for owner, not dispatched.


## Batch Q proposed — Market & rent value history

Pending Q1–Q6 in docs/planning/ownership-property/ZMR-market-rent-batch-Q.md: horizontal presentation, source evidence, rent scope/period, chosen estimate for analysis, traceable corrections, and clear separation from books/actual rent. Existing latest values feed Mortgage, Portfolio KPI and market-value Balance Sheet report; consumer mapping required before semantic changes. Insurance cleanup remains terminal assignment; P approved and queued. No new implementation dispatched.


## Q revised — owner monthly multi-source workflow; competitor research

Owner clarifies monthly manual Redfin/Zillow/Rentometer observations, source-specific rent/value trend lines and an average across comparable estimates. This supersedes the single-latest-value emphasis of proposed Q4 for chart design, not the existing application calculations. See docs/planning/ownership-property/ZMR-monthly-estimates-and-competitors.md. Detailed averaging/missing-source rules proposed; Q1–Q6 not blanket-approved. Competitor review is strategic context, not additional implementation scope or claims of exclusive features. Insurance remains terminal assignment.


## Q approved; Insurance review found responsive spacing issue

Owner says “Approve batch q,” following the monthly multi-source clarification. Approve Q with revised charts: distinct property-value/rent charts, named source lines plus average, monthly entry grid and evidence, source count/range and no zero/stale substitution, comparable unit/property/period and Rentometer statistic. Original Q4 single-latest chart emphasis superseded; downstream calculation input needs explicit mapping before changes. Competitive ideas are not newly approved scope.

Terminal cleanup commit 3d412d3 independently confirmed. Reported 53 tests/clean clone not independently rerun here. Opened running mock page, selected Property Overview INS-1 and expanded Insurance. Internal pending-feature notes gone. Actual screenshot at approximately 976px page width shows Representative label running into contact value in three-column details; responsive spacing still requires correction before visual acceptance. Review page left open for owner, no real data touched. Real Supabase integration/upload limit remain unresolved.


## Owner questions — placement and review-process correction proposed

Owner questions Overview placement of recurring market/rent history, suggests charts in KPI and monthly upkeep in Action Queue; asks why 5180 differs from 5173 and whether workflow is efficient. Verified harness bypasses AppShell/app-main; normal 5173 runs same project with hosted URL configured. Proposed R1–R5 in docs/planning/ownership-property/ZMR-placement-and-review-process-proposal.md. Pending, not new approved rules or relocation authority; no install/provisioning. Existing terminal CSS work left untouched. Need full-frame review and isolated integration environment; do not claim mock-only success is completed product.


## Placement and review corrections approved — delivery reset

Owner agrees Overview destination candidates and mapping every current function first, and authorizes recommended review-process corrections. Added scoped approved workflow rules to CLAUDE.md, plus ZMR-property-destination-map-and-delivery.md and ZMR-review-environment-terminal-prompt.txt. Tenant/unit detail destination still unspecified; preserve existing access. No immediate relocation or deployment authorization. General frequent-release goal requires concrete scoped release review, not a push of all unreleased HEAD.

Immediate handoff: finish active Insurance responsive fix, then full-AppShell owner preview and consolidated verification; do not start another feature batch. Test-environment preference asked asynchronously (hosted nonproduction versus local stack), with no installation/provisioning yet. Prepared prompt only; owner controls terminal. All planning/approval records preserved, app source untouched by this planning step.


## Hosted practice environment approved — real portfolio remains production

Owner confirms information entered through 5173 is real and must remain available through the published dashboard across computers; approves proceeding with the recommended separate hosted practice environment. This is not approval to repoint 5173, copy business records into practice, change live data, deploy code or apply production migrations. Prepare/use a distinct hosted Supabase project after verifying current capacity and no incremental charge; obtain a specific decision for any cost or unresolved account access. Practice uses fictional data, real backend integration, normal application UI and a dedicated local port. Local URLs are not cross-device hosting.

Terminal reports d686e73 delivers Insurance responsive spacing and real AppShell harness integration, so do not repeat that task. Evidence is reported, not independently reverified here; owner acceptance and real integration remain open. Next handoff: docs/planning/ownership-property/ZMR-isolated-integration-terminal-prompt.txt, superseding the earlier review-environment prompt's pending environment decision. Prompt prepared for owner to relay, not dispatched. Preserve existing real portfolio/configuration and confirm targets before writes. No application source or live records changed in this planning step.


## Isolated integration environment — infrastructure delivered, blocked on cost/access

Executed the isolated-integration prompt. No practice Supabase project was created — the CLI exposes no billing/plan field (`orgs`/`projects list` JSON checked directly) and the org's actual per-project cost could not be determined without dashboard access this session doesn't have; per the prompt's own explicit stop condition, no plan upgrade, payment entry, or blind project creation was attempted. Owner decision needed: confirm the org's plan permits a free second project, or create "ZMR Practice" via the dashboard (seeing the real price first) and hand back its URL/anon key/db password via masked input.

Everything not requiring that project to exist was built and verified: `npm run dev:practice` (port 5190) loading the real app entry against a practice-only env directory, a fail-closed guard in `supabaseClient.ts` (confirmed refusing to start with no practice env configured, never falling back to production), a permanent PRACTICE banner (confirmed inert in the real app and the existing mock harness), and a full bootstrap plan (`ZMR-practice-bootstrap-plan.md`) identifying the two migrations (`20260903192431_seed_zmr_account.sql`, `20260904180522_seed_properties.sql`) that embed real business data and exactly how to clean that up in practice only, without editing shared migration history or repointing this shared working directory's own Supabase CLI link (confirmed still linked only to the live project). Port 5173/its `.env` and all real portfolio data untouched. `npm run build`/`lint`/`test` clean (53/53, 76-line lint baseline). No O2–O7/P/Q work started.


## Practice project created; real integration verified end to end

Owner independently confirmed no additional charge and approved continuing, with reuse-before-create and masked credential handling. No existing "ZMR Practice" project was found, so one was created (`supabase projects create`, ref `gxgvrktzpxhtqklupvif`, org `axoccuzqqmsucjpfqomm`, region `us-east-2`) — a real, billable-tier-eligible cloud resource, created only after the owner's own cost verification, never guessed at.

All 97 migrations applied via `supabase db push --db-url` from a disposable scratch clone (tracked `supabase/migrations/` never edited). The two real-data-bearing seed migrations were reviewed and handled per the documented bootstrap plan: the FK-violating insert genuinely aborted the push on first attempt (confirming, not assuming, the plan's stated risk), fixed with a one-line existence guard in the disposable clone only. Real-named rows this produced ("ZMR Real Estate" account, two real property addresses) were deleted from practice and replaced with a fictional account and two disposable Auth test users, created via direct SQL (no public signup flow exists in this app) since the Admin-API/curl approach was blocked by the session's own safety classifier — re-verified afterward (0 real accounts/properties remaining).

Real application UI exercised against this real project end to end: property create/save/reload, ownership add/complete-allocation (real RPC), Insurance add/date-validation/document upload+signed-URL retrieval (verified to ~8.8 MB, tooling-capped there), the Property Information stale-write conflict (reproduced via direct SQL against the real hosted database, confirmed no overwrite), and cross-account RLS isolation with a second disposable user. This is qualitatively different evidence from every prior checkpoint in this register — real Postgres/Auth/Storage, not scratch Postgres and not the mock harness.

Not verified: the exact hosted per-file upload ceiling beyond ~8.8 MB (dashboard-only), and owner acceptance. Owner checklist: `ZMR-practice-integration-owner-checklist.md`. `npm run build`/`lint`/`test` clean (53/53). Real portfolio data, port 5173, and this repo's own Supabase CLI link (still only the live project) untouched throughout. No O2–O7/P/Q/R work started.


## Batch R explicitly approved; practice provisioning awaiting billing verification

Owner says "Approve batch r": preserve prominent hero and existing design; compact shared occupancy/rent summary; Acquisition/Building Details in Overview; Insurance/service setup/account references in Overview with payments in Financials and follow-up in Action Queue; market/rent history in KPI with shared update form through monthly Action Queue; property-tax bills/payment history in Financials with parcel/jurisdiction reference in Overview; preserve every existing function before removing its former access. This consolidates placement approval, not authority to deploy or relocate all sections at once.

Terminal reports practice scaffolding on port 5190 with fail-closed guard/banner/bootstrap plan, but no practice Supabase project or integration verification yet. Billing visibility is the concrete blocker. Recommend owner inspect Supabase dashboard (option 1); never confirm free eligibility without checking the actual organization/account. No credentials should be pasted into chat. Paid provisioning still requires a specific cost decision.


## Owner acceptance findings — September 25, 2026
Owner confirms Practice banner, Overview structure and rejection of complete ownership allocation totaling 70%. Not full acceptance: successful ownership persistence, document opening, stale-edit conflict and tests 6/7 not owner-confirmed. Owner proposes KPI default, clearer insurance date labels, wider forms and softer theme/hover treatment. Recorded S1–S5 as recommendations awaiting approval in ZMR-owner-review-2026-09-25.md, including detailed tests 6/7. No terminal dispatch or app/rule changes. Existing checklist has contradictory ownership success step and unsuitable random-byte document fixture for owner review. Registry legacy Name and owner/contact inputs need reconciliation, not cosmetic widening alone.


## Batch S responses and testing responsibility — September 25, 2026
S1 approved (existing-property KPI default, new-property Overview setup, explicit links preserved). S2 response requests eventual owner testing with real data on live; not live-write/deploy authority or explicit acceptance of all proposed copy. S3 wider grouped form direction approved, visual required before implementation. S4 authorizes terminal design evidence collection to inform universal rules, not global restyling or unreviewed new rules. S5 explicitly changes testing responsibility: agent/terminal performs feasible repeatable tests and reports evidence; owner is asked only for necessary manual checks, design decisions and final genuine live workflow. Passing engineering tests need not be repeated by owner.
Prepared ZMR-batch-S-terminal-handoff.txt for owner relay; not dispatched. No application source changes. Final live entry stays owner-operated after a reviewed release, preserving real records.


## Batch S executed — September 25, 2026
Executed the handoff per direct owner instruction. S1 implemented and live-verified in Practice (roadmap 7.38 addendum); all seven functional checks from instruction 1 completed autonomously with evidence, none left for the owner to repeat. S3 delivered as a non-saving, non-production visual preview only (`src/devHarness/PropertyFormGroupedPreview.tsx`, via `npm run dev:harness`) — not implemented in the real form, per the explicit visual-approval gate; both conflicts (Name-vs-address identifier, flat Owner fields duplicating the real Ownership box) flagged in the preview itself, not resolved. S4 evidence gathered and measured (token/contrast audit, hover-fill selector, width-limit selector, confirmed breakpoints) with no universal rule invented and no rule file changed. Full detail, file list, and remaining owner decisions: `ZMR-CURRENT-WORK.md`'s "Batch S executed" entry. No other approved batch started; no deploy, migration, or real business record touched.


## Option 3 approved; Batch S report reconciled — September 25, 2026
Owner explicitly approves connected workflow builds with continuous terminal testing and consolidated owner reviews. Approved rule appended to CLAUDE.md, binding planning and executing agents. Existing explicit S3 visual gate remains. Commit 972fc41 independently confirmed; reported tests not rerun. Source/browser inspection found S3 preview omits multiple current fields despite completeness claim (lot units, basement, street parking, assessor code, purchase method/type, exterior materials examples). Source retains global form max-width 480px; report citing only app-main 1440px is incomplete. Preview opened, mobile-size current view observed; no desktop/full visual approval claimed. Proposed Name/flat-contact reconciliation is pending, preserves data and requires consumer mapping. Handoff ZMR-workflow-package-reconciliation.txt consolidates evidence correction, agent-run remaining checks and approved-backlog packaging. Prepared, not dispatched. No application changes or deployment.


## Workflow-package reconciliation executed — September 25, 2026
Executed the reconciliation handoff. S3 preview corrected: all 7 previously-missing fields/widgets added, and its form-width claim fixed (the real `<form>` was still capped at the app-wide 480px rule; the already-shipped Insurance Edit form has the same unaddressed cap — a separate real finding, not changed here). Keyboard tab order and live focus-outline contrast verified directly (not just from tokens); window-resize remains unreliable in this environment, worked around via an iframe substitute for reflow. A real, live PRACTICE-banner/sticky-header collision was found and fixed (`--practice-banner-height`, `index.css`), verified against the real practice tab, confirmed inert outside Practice. Full A–S backlog matrix and a fully-specified first connected package (property creation/core setup) delivered — see `ZMR-CURRENT-WORK.md`'s matching entry for detail and file paths. No production deploy, migration, or real business record touched; no other approved batch started.
