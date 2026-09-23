# Ownership and Add property — proposed feature contract

> Current approval status — September 23, 2026: OWN-01 direction, OWN-02 labels, Batch A (2A–2E, 3A–3B, 5A, 7A), and Batch B (4A–4G) are approved product requirements. These do not approve all parent-item details or live deployment. No live changes are authorized by this planning packet. The approval register controls scope.

Version 0.3 · September 23, 2026 · PROPOSED / NOT READY TO EXECUTE

Repository review: see `ZMR-project-reconciliation.md` for current evidence and unresolved constraints. Reuse existing LLC/holding-company/account records. Visual v0.2 now reflects Batch B and the principal project labeling rules; it remains a preview for visual review, not evidence of implemented persistence/security.

Applies to OWN-01 through OWN-10. Refer to the approval register for authority. This is a detailed product contract, not an invented database migration. Initial mappings are now verified: accounts/account_members, llcs, properties.llc_id, holding_companies, property_financial_accounts and documents. Generalized individual-owner identity, historical ownership links and entity-document anchoring still require an approved physical design and deployed-schema verification.

## 1. What the current screen does

The authenticated Add property form was inspected without saving changes. It includes:

- Name, Organization type (initially Individual ownership), Address, City, State, ZIP, Status.
- Purchase price and purchase date.
- Owner name, contact phone and contact email.
- Living area, lot size/value unit, year built, whole-building bedrooms and bathrooms.
- Basement, garage spaces, street parking, parking notes.
- Property tax ID/PIN, municipal zoning code, county assessor use code, county and township.
- Purchase method, property type and exterior wall materials.

The recommended change reorganizes creation; it does not remove any existing field. All building/overview fields remain available after creation and for existing records. Existing contact information must not be silently reclassified as the legal owner's contact details: it may be a property/business contact.

Existing observed properties are Ash Street and Foster Avenue. Foster is associated with a named LLC; Ash displays Individual ownership. These are baseline examples to verify, not permission to infer legal owners, member counts, tax elections, ownership dates or other facts.

## 2. Proposed information model

### Ownership entity

A workspace-scoped actual person or legal organization that owns property. “LLC” is a legal form; “5336 W Foster LLC” is an entity. A workspace is the customer's collaboration/account boundary and can contain several ownership entities. A person signing into the app is not necessarily a legal owner.

### Property ownership relationship

Links a property to an ownership entity, with start/end dates where known, optional ownership interest, evidence and review state. Preserve history. Do not infer a start date from record creation or purchase date without confirmation. Model the relationship so multiple direct owners and ownership changes can be represented, even if the first approved UI supports a smaller subset.

### Tax profile

Related to the entity, separately tracks legal form, single/multiple membership, federal tax treatment, effective date, election status and evidence. Unknown remains unknown. Selecting LLC or single-member must not silently set a filing status or create bookkeeping entries.

### Document and document links

A file/source record belongs to a workspace. Links associate it with property/entity plus relevant context, such as ownership relationship, tax election or acquisition. One document may support multiple related records without copying the file. Linking never broadens permissions. The eventual Documents section must find it by property/entity.

### Bookkeeping boundary, reserved for later

Entity records will anchor books; property/unit dimensions attribute financial activity. Existing ledger/report code remains intact. No new ledger, balances, depreciation or tax calculation is created by the ownership batch. Legal ownership and the tax reporting owner are distinct relationships; a disregarded entity should not be merged with an individual solely because of tax treatment.

## 3. Field dictionary — entity identity

R = required for creation; O = optional; C = conditional. Unknown values must not be defaulted to fabricated facts.

| Field / label | Type and requirement | Validation and display | Purpose |
|---|---|---|---|
| Owner / entity kind | Choice, R | Individual or Legal entity; legacy unresolved state preserved | Controls relevant fields |
| Legal name | Text, R | Trim; nonempty; preserve punctuation; warn about same-workspace potential duplicate | Identifies person or registered entity |
| Display name | Text, O | Falls back to legal name | Short recognizable label |
| Legal structure | Choice, C for entity | LLC, corporation, partnership, trust, other, unknown; final supported list to approve | Do not equate structure with tax treatment |
| Formation jurisdiction | State/country fields, O | No hardcoded inference from property location | Entity registration context |
| Formation date | Date, O | Reject invalid calendar dates; future date requires clear draft treatment | Source-backed legal fact |
| App record status | Active/Archived, R default Active on new record | Distinct from legal standing, occupancy, or property status | Controls selection in new workflows |
| Mailing address | Structured address, O | Separate from property address | Correspondence |
| Primary contact | Name/role/email/phone, O | Email syntax; flexible phone formatting; preserve original | Manager/contact may differ from owner |
| Notes | Multiline, O | Plain text; safe display; no secrets required | Context |
| Source / evidence | Document links or source note, O | Workspace access checked | Provenance |
| Last updated | System timestamp + actor | Not user-editable; correct timezone | When the record changed |
| Last verified | Date + verifier, O | Set only by explicit review action | When user checked the fact |
| Existing EIN | Preserve existing field and values | Review existing access/display behavior; do not remove, duplicate or expand collection implicitly | Already in LlcForm/llcs |
| Registered agent | Existing optional field | Preserve without inferring person/contact identity | Entity administration |
| Annual report due date | Existing optional date | Preserve; future reminders route through Action Queue | Entity administration |
| Holding company | Existing optional relationship | Preserve stable holding_company_id and existing picker | Ownership hierarchy |
| New sensitive identifiers | Deferred | No new SSN collection; additional fields require explicit scope | Avoid unnecessary collection |

Legal status such as dissolved/in-good-standing is not inferred from app status. No entity is automatically registered or legally modified through this form.

## 4. Field dictionary — tax metadata

These fields record user-confirmed facts; they do not give tax advice or choose an election for the user.

| Field | Requirement / behavior |
|---|---|
| LLC membership | C for LLC: Single member / Multiple members / Unknown. Unknown is an explicit supported state |
| Federal tax treatment | Optional: Unknown / Disregarded entity / Partnership / S corporation / C corporation / Other. Display combinations needing review; never silently convert legal structure |
| Tax treatment effective date | Optional date; missing means “Date not recorded” |
| Election status | Optional: Unknown / No election recorded / Submitted / Accepted / Superseded. “No election recorded” does not certify none exists |
| Election type / description | Optional controlled choice plus notes; final choices reviewed against existing requirements |
| Submitted / effective / acceptance dates | Separate optional dates; do not treat submitted as accepted |
| Evidence | Zero or more document links, e.g. election copy or acceptance notice; none required just to create a property |
| Tax reporting owner | Future relation or explicit unresolved field after schema review; do not auto-link sign-in user |
| Verification | Needs review / User verified, with date and actor; avoid “CPA verified” unless the verifier and authority are established |

Tax data can be shown in an expandable “Tax classification” section of the initial ownership profile. Later Tax tab design remains separate. Creating a useful owner profile must not require a complete tax packet.

## 5. Field dictionary — relationship and property creation

| Field | Proposed behavior |
|---|---|
| Owning person/entity | Required selection for new creation; show display/legal name plus kind, not just “LLC” |
| Ownership effective from / to | Optional; preserve unknown dates; reject end earlier than start |
| Ownership percentage | Optional and deferred in first UI unless needed; no automatic 100% assumption. If multiple entries are later supported, precision and aggregate validation must be specified |
| Ownership evidence | Optional links to deed, acquisition/closing record, assignment or other evidence |
| Property identity | Address is canonical under CLAUDE.md/roadmap 8.6. Preserve existing name column/values; approve compatibility behavior rather than inventing or deleting names |
| Street, city, state, ZIP | Approved 4B: required for new creation; US ZIP supports ZIP+4. Existing incomplete records remain editable. No address-incomplete server drafts included |
| Property lifecycle status | Preserve existing Active / Inactive / Sold; separate from setup completeness and occupancy |
| Purchase date / price | Optional; unknown price remains null; saving does not create financial postings |
| Property contact details | Existing fields retained separately unless source evidence establishes entity contact role |
| Existing detailed fields | Still available in Property Overview; creation can route there to complete them |
| Setup completeness | Proposed informational checklist based on known fields; never interpret completeness as financial verification |

## 6. Add property interaction contract

### Entry

Keep the existing Add property action. Open a dedicated guided form area with heading “Add property,” a visible Back to properties action and four named steps. Do not nest a large modal in another modal. Existing property records remain unchanged.

### Step 1 — Ownership

- Search/select active existing ownership entities from the current workspace only.
- Show entity kind alongside name; Individual ownership must identify a person once confirmed.
- “Add owner / entity” expands an inline form with Individual / Legal entity selection and minimum identity fields.
- Tax details are optional expandable fields; unknown is permitted.
- Changing between existing and new preserves local entries until cancel; only the chosen alternative is submitted.
- Existing archived entities may appear for historical relationships but cannot be silently assigned to new properties without a supported restore flow.
- Selecting a similar entity presents a duplicate warning with enough context to choose the existing one. Similar names alone do not justify a merge.
- Continue validates only step-one required fields.

### Step 2 — Property basics

- Display selected owner compactly with Change link.
- Structured address and lifecycle status appear first. Address remains canonical; no required nickname field.
- Optional purchase date and purchase price are in an acquisition subsection.
- Explain that building details, units, taxes, insurance and other fields can be completed in Overview.
- Check for likely duplicates in the workspace by normalized address/name; warn, do not block legitimate separate parcel/building records without an approved rule.
- Show required markers and inline error text. Failed validation keeps entered data and focuses the first invalid control.

### Step 3 — Documents (optional)

- Actions: choose an existing accessible document, upload a file using current approved storage, or skip.
- Each selected document has display label, original filename, category, date if known, and Linked to: property, entity, or both.
- Context defaults from where the user attached it, but user sees the association before save.
- Original filename is the label fallback. Document date is not upload date.
- File limits, MIME validation, upload scanning if available, retries and access policy must be specified from the actual implementation before Ready for build.
- Display pending/uploading/failed states per attachment. Failed files must never appear filed successfully.
- Do not force reuploading existing documents. Do not delete or relocate existing files as part of this flow.

### Step 4 — Review

- Show the proposed owner/entity, property basics, optional acquisition data and attachments with their associations.
- Allow editing earlier steps without losing values.
- In this proposed Review step, show validation/completeness information only where useful. Ordinary read-only profile boxes omit blank fields under existing rules; do not introduce blanket placeholders.
- Primary persistence action: “Save,” per the project convention. Secondary: Back. Cancel remains available.
- Do not create the property or entity on merely changing steps.
- Save once using the existing supported transactional approach. Repeated click/retry must not create duplicate properties or entities.
- If attachments require separate storage requests, use an explicit staged/finalized state, recoverable linking and cleanup limited to new unattached temporary uploads. Never delete a pre-existing file during compensation.
- On confirmed success, navigate to the new Property Overview and show a concise result including owner link and remaining setup tasks.
- If save outcome is uncertain, resolve by request identity/server result before retrying a mutation. Do not announce failure or success without evidence.

### Cancel, navigation, concurrency

- Cancel with no changes simply exits; with local unsaved changes, offer Keep editing / Discard unsaved changes.
- Cancelling does not create an owner, property or document association.
- Approved 4A/4D: no persisted entity/property drafts before final Save. Temporary upload staging is separate and must not create finalized document records. Do not introduce browser storage for sensitive form fields by default.
- Detect a conflicting edit using the application's version/updated-at mechanism; do not overwrite someone else's newer changes silently.
- Network errors preserve local work and present retry. Expired sessions must not expose data or falsely report success.

## 7. Ownership profile and registry presentation

- Entity header: display name, legal name if different, kind/legal structure, app status, last updated.
- Sections: Identity, Tax classification, Contacts, Linked properties, Ownership documents, History. This is the proposed first profile, not authorization to build future Bookkeeping/Tax reporting tabs.
- Use small summaries and explicit Edit actions rather than opening every field in edit mode.
- Property header/Overview shows “Owned by [entity name]” as a link; unresolved legacy ownership shows “Individual ownership — owner details need review.”
- Registry retains address/name and adds owner identity. Optional owner filter/grouping must preserve the flat all-properties view.
- Do not change all primary navigation during this batch. Proposed access: owner filter/links from Properties plus existing Settings entry renamed only where the same concept applies.
- Use readable history: “Changed legal name from … to …”; never raw column names, JSON arrays or internal IDs.
- Last updated belongs near the profile/section heading; historical facts use their own date. A new upload must not make a valuation appear newly observed.

## 8. Documents and capture nuance

The user requires documents to be linked to a property or entity. Finalized documents must meet that requirement. An entity formation document can belong only to the entity; a deed can belong to property and entity.

Later phone captures may arrive before the user knows the correct property/entity. Proposed handling, not yet approved: keep these private staged inbox items, then require an anchor before final filing or posting. They remain visible in a workspace-scoped Unassigned inbox, never silently filed to a guessed owner. This is not part of the current Add property implementation unless explicitly included.

## 9. Migration and real-data protection

Before implementation, inventory every existing ownership/property field and its consumers, including exports, pick lists, search, history, documents, units, leases/tenants, tasks, mortgages and even sparse financial records.

Proposed expand-and-map approach:

1. Establish a recoverable nonproduction copy and approved production backup/restore process. Protect any copied tenant and document data.
2. Capture counts, stable IDs, relationship checks, representative values and file/storage references. Record existing inconsistencies separately.
3. Add compatible structures; retain legacy fields and read paths during transition.
4. Produce a mapping preview: legacy ID/text → proposed entity/relationship → reason/confidence → needs review. Do not match by name alone when ambiguous.
5. Reuse the existing Foster LLC identity if it already exists. If a new representation is necessary, maintain a durable mapping and all referring records.
6. Keep Ash's direct ownership unresolved unless owner identity is explicitly confirmed. Preserve its original text and dates.
7. Do not move property contact email/phone into a person's profile without a reviewed role mapping.
8. Rehearse migration, rerun it to verify idempotency, and compare records and file links against baseline.
9. Route new UI reads/writes through compatible mapping. If compatibility requires dual writes, define one authority, consistency checks and recovery before proceeding.
10. Do not drop old fields, delete records, merge entities, fabricate ownership dates or run mass renames in this batch.
11. Review the concrete migration and release plan before later authorized production execution. Rollback must preserve records created after cutover, not blindly restore an old database over new work.

## 10. Acceptance cases

| ID | Given / action | Expected result |
|---|---|---|
| OWN-T01 | Existing named LLC selected for a new property | Exactly one new property and relationship; no duplicate LLC |
| OWN-T02 | Individual owner selected | Property links to that actual person record; no fictional LLC |
| OWN-T03 | New LLC with unknown tax treatment | Can complete creation; unknown remains unknown |
| OWN-T04 | User cancels after entering a new owner | No owner/property association created; old records untouched |
| OWN-T05 | Double-click or network retry of final save | One logical creation; consistent success/recovery state |
| OWN-T06 | Required field missing | Inline readable error; prior input preserved |
| OWN-T07 | Potential duplicate address/entity | Warning and choice; no automatic merge |
| OWN-T08 | Existing document linked to property and entity | One source document, two authorized links, discoverable from each context |
| OWN-T09 | New attachment fails | Failure visible; no falsely successful document link |
| OWN-T10 | Another workspace's entity/document ID used | Server rejects access/mutation; no leaked names/files |
| OWN-T11 | Viewer/read-only role attempts change, if role exists | Backend denies mutation; UI reflects permission |
| OWN-T12 | Existing Ash and Foster records after migration | IDs, fields, units, tenant/lease links, tax rows, documents and sparse financial/mortgage data preserved |
| OWN-T13 | Unknown legacy owner or date | Explicit unresolved state; no invented identity/date |
| OWN-T14 | Existing incomplete property edited | New creation requirements do not block unrelated safe edits |
| OWN-T15 | Stale client edits | Conflict surfaced; no silent loss of newer data |
| OWN-T16 | App record archived with linked properties | Historical links remain accessible under permissions; no cascade deletion |
| OWN-T17 | Ownership changes historically | Prior relationship preserved; app edit does not silently move historical books |
| OWN-T18 | Phone/tablet/desktop widths | No clipped required controls; usable navigation and actions |
| OWN-T19 | Keyboard/screen reader flow | Labels, step headings, error announcements, focus and navigation work |
| OWN-T20 | New information saved | Updated time changes appropriately; verified/as-of dates do not change automatically |
| OWN-T21 | Migration repeated and rollback rehearsed | No duplicate mapping, lost records, broken file links or destruction of post-migration writes |
| OWN-T22 | User opens optional tax section | Legal structure and tax treatment remain separate; no accounting/tax calculation occurs |

Test data must use synthetic entities and documents in nonproduction. Current production checking is read-only. The eventual completion plan must also satisfy the project's live-dashboard UI verification requirement using the reserved test actor for test mutations, exact before/after checks, a new empty account, and a data-export path. Define that scope before execution. Never use the user's real records as disposable fixtures.

## 11. Not yet resolved

- Actual schema, entity names, migrations, storage security, role model and deployment process.
- Whether existing documents already support shared contextual links and staged uploads.
- Existing form draft/concurrency/idempotency conventions to reuse.
- Whether the first UI needs joint ownership and fractional interests now, or only compatible foundations.
- Required address policy for new drafts and legal structure choices.
- Exact filename/category/date rules and storage limits.

These are readiness gates. A builder must surface and resolve them before implementing affected behavior; it must not improvise significant product decisions.

## 12. Visual reference scope

The conversation's Add property preview is visual revision v0.1. It demonstrates step layout, selecting an existing LLC or a new individual/entity, optional tax metadata, document association, and a review summary. It intentionally permits moving between incomplete steps for design inspection and uses an illustrative attachment. It does not implement search, actual uploads, validation, draft persistence, permissions, or real creation. Production behavior must follow the approved written contract and acceptance tests, not those prototype shortcuts. The existing LLC shown is a context example, not permission to assign any new property to it.

The owner profile screen, migration-review screen and error-state visuals are not yet approved or fully drawn. Those visuals must be completed for their selected build batch before declaring it Ready for build. Revised visuals must use address identity, Save labeling, unmarked optional fields, established form/section patterns and the approved naming decision.

## Batch B visual and implementation addendum

Visual v0.2 is the current Add property review reference. It uses address identity, Owned by, minimal required fields, unmarked optional field labels, optional document associations, review and Save. It demonstrates missing-required-field errors and local-only navigation. It does not perform real uploads, server duplicate checks, atomic persistence, permissions or real navigation to a saved property. The native owner selector/state input remain preview approximations: production must use SearchableSelect and the existing fixed US state selector. No new entity is selected by default.

The approved review summary includes acquisition information only when entered. Existing incomplete-property editing stays compatible; required new-creation rules must not be retroactively applied to unrelated edits.

O1-A preflight must refresh lease/unit dependencies: the repository has changed since the initial reconciliation, including a leases module and staged removal of older tenant assignment components. Historical statements about missing lease grouping must not be assumed current without a fresh review.


## Acquisition and ownership correction addendum

Batch C (C1–C5) is approved; see the approval register for exact fields and evidence. Place optional acquisition details in Property Overview → Acquisition, with a short expandable entry during Add property. Reuse contacts and the shared document registry. Additional contact/document type choices must follow existing pick-list rules. Uploading a closing statement must not create financial entries. All optional acquisition information can be completed later.

The user approved correcting an owner entered incorrectly, separately from a real legal transfer. Preserve this distinction in all implementation prompts. D1 correction safeguards and D2–D5 upload policy are approved by “Approve Batch d.” Hosted limits still need verification. Do not implement guessed quotas or automatic financial/document reassignment.

Add property visual v0.2 has user layout approval (“looks good!”). Production validation, data preservation and the entity profile visual still need completion.
