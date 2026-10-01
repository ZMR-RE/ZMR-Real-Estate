# T4 — Stage 1 implementation: connected manual invoice drafting and PDF review

This is owner-approved Stage 1 of RP1–RP7, approved September 30, 2026. Owned
by terminal T4.

- **Branch:** `agents/stage1-invoicing` in the worktree `../ZMR-Real-Estate-Agents`, started from the fixed preview `f52bd86`.
- **Overall specification:** RP1–RP7, verbatim in `ZMR-T4-agents-workspace-preview.md`.

## Scope

**In Stage 1:**

- The dashboard fields needed to draft invoices from structured records:
  - tenancy and billing terms (RP1);
  - the billing entity and the property's billing settings (RP2).
- Persisted drafts and approvals.
- Reviewable PDFs.
- Rent ops and the assistant's Workload use the **same** invoice records.
- Explicit owner-approved issuance with entity-specific numbering. Nothing
  implies delivery or payment.

**Outside Stage 1 (deferred):**

- mailbox processing and payment evidence (RP4);
- issuing payment receipts;
- reminders and late fees (RP6);
- schedules;
- sending and delivery history entries;
- the portfolio rent overview (RP7);
- payment allocations and the Financials link (see the T2 dependency proposal).

No T2-owned functionality and no competing accounting records. Payments are
untouched, except that a payment can now only be recorded against an issued
invoice.

## What RP items the Stage 1 fields reuse

| RP item | Field | Stage 1 | Reuses |
|---|---|---|---|
| RP1 | Linked property/unit, co-tenants | existing | `leases.property_id/unit_id`, `lease_tenants` |
| RP1 | Billing recipients | new flag | `lease_tenants.is_billing_recipient` |
| RP1 | Rent | existing | `leases.rent_amount` |
| RP1 | Frequency, due day, effective dates, prorating | new | `lease_billing_terms` (one row per tenancy) |
| RP1 | One charge per tenancy/period | enforced | unique (lease, period) index |
| RP2 | Explicit invoicing entity | new | `properties.billing_entity_id` → existing `llcs` |
| RP2 | Display/legal name, address | existing | `llcs.display_name/name/mailing_*` |
| RP2 | Reply-to, payment instructions, invoice code | new | columns on `llcs` |
| RP2 | Preserved on issued documents | enforced | `issuer_snapshot` / `recipient_snapshot` at issue |
| RP3 | Assigned tenancies, active/paused | new | `agents`, `agent_assignments` |
| RP3 | Tenant-specific invoice note | new | `agent_assignments.invoice_note` |
| RP3 | Next task, unpaid balance, missing fields, pending approvals | derived | from invoices, blockers, and existing payments |
| RP3 | Template overrides | **deferred** | — |
| RP5 | Unique numbers, billing period, itemized lines, PDF, approval, revisions | new | extends existing `invoices`; `invoice_lines`; `document_sequences`; `invoice_events`; `documents.invoice_id` |
| RP5 | Payment allocations, balance across payments | **deferred** | existing `payments` stays as is; allocations wait on T2 |
| RP5 | Delivery history | **deferred** | no sending in Stage 1 |

## Milestone 1: database and document layer (done locally, not yet committed)

**Migrations.** Six new files, `supabase/migrations/20261002100000` to
`20261002140000` (the last is the PDF storage protection, added in the
Milestone 3 pass). They are dated after every other terminal's pending
migrations and use error codes ZM300–ZM344.

1. `billing_entities_and_tenancy_terms`
   - Entity invoice code (format and per-account uniqueness), reply-to and
     payment instructions.
   - The property's explicit billing entity, with a same-account guard.
   - Billing-recipient flag.
   - `lease_billing_terms`.
   - The "Invoices" document category, added additively.
2. `invoice_lifecycle_and_numbering`
   - Extends `invoices` with lease, issuer, state, number, revision,
     versions, approval, issue and cancel fields, snapshots, a visible note
     and an internal note.
   - `invoice_lines`, `invoice_events`, `document_sequences` and
     `documents.invoice_id`.
   - Guards:
     - invoices change only through the actions;
     - numbered invoices are never deleted;
     - issued invoices are never edited;
     - issued PDFs are never changed or removed;
     - no payment against a draft.
   - Existing invoices become `issued` without a number. They are never
     renumbered.
3. `invoice_draft_actions` and `invoice_issue_actions` (two files) — the
   only write path:
   - `create_invoice_draft` (from structured records; daily or manual
     prorating; co-tenants billed as one charge);
   - `get_invoice_draft_blockers`;
   - `update_invoice_draft` (requires the version the editor read; anything
     except the internal note clears approval);
   - `approve_invoice` / `reject_invoice`;
   - `issue_invoice` (locks the entity's sequence row; six-digit number;
     snapshots);
   - `revise_invoice` (`-R2`; the original becomes superseded and keeps its
     PDF);
   - `cancel_invoice` (number kept, never reused; refused while payments
     exist);
   - `set_document_sequence_start` (only before the first issuance).
4. `rent_assistant_workload`
   - One assistant per account; tenancy assignments with a tenant note.
   - Owner-started `run_assistant_invoice_drafts`: skips and lists missing
     information and already-invoiced months; one run at a time.

**Invoice code** (`src/modules/rentInvoices/`):
- `rentInvoicesQueries.ts`: every call goes through the database actions.
- `invoiceSampleFixtures.ts`: the fictional sample invoice (tests and
  review PDFs; written by `tools/invoice-samples`).
- `invoiceDocument.ts`: issued invoices render **only** from snapshots;
  drafts are marked DRAFT with no number; the approved filename convention.
- `invoicePdf.ts`: jsPDF, US Letter, design-system colours. It never says
  "sent" or "paid".
- `invoiceBlockers.ts`: messages plus each field's dashboard home.

**Sample PDFs for owner review** (fictional):
- `docs/planning/agents/samples/A-INV-000001_2026-10_Unit-1.pdf` (issued, with a credit line)
- `docs/planning/agents/samples/DRAFT_2026-10_Unit-1.pdf` (draft)

### Evidence

All of this ran against a disposable local Postgres 17 on 127.0.0.1:55434.
It was not run on Practice or production.

- `supabase/tests/rent_invoicing/run.sh`: all 104 existing repo migrations plus my
  five apply to a fresh database. **63/63 rule checks PASS**, run as a
  signed-in user so row-level security applies. They cover:
  - direct-write refusal on every table;
  - blockers listing every gap, with nothing inferred;
  - account isolation;
  - full-month, daily-prorated and co-tenant drafts;
  - one charge per tenancy and period;
  - stale-version refusal;
  - approval kept by an internal note; cleared by the visible note,
    recipient or lines;
  - `A-INV-000001` → `000002`, with `SRP-INV-000001` independent;
  - snapshots unaffected by later settings changes;
  - no edit or delete of issued invoices;
  - revision `A-INV-000001-R2` taking no sequence number;
  - a cancelled number not reused (next is `000003`);
  - the configured start used (`PP-INV-000121`), locked after the first
    issue;
  - code format and uniqueness;
  - PDF rules;
  - assistant runs drafting into the same table, printing the tenant note,
    and skipping on rerun;
  - no payment against a draft; legacy invoices still accept payments.
- `concurrency.sh`: an owner-created and an assistant-created invoice for
  the same entity, issued concurrently. The second waited on the sequence
  lock: `A-INV-000004` and `A-INV-000005`, 0 duplicates.
- **Compatibility:** all 120 migrations (main plus T1's and T2-foundation's
  pending ones plus mine) apply together, and the 63/63 checks still pass.
- **Unit tests:** the document model and PDF (8), plus the full suite; see the
  commit report.

### Old "Create invoice" form

Once these migrations are applied, Rent ops' old "Create invoice" form (a
direct insert) is refused by design. Milestone 3 has now replaced it; the
old-client behaviour is rehearsed below.

## Milestone 3 (Rent ops replacement workflow): implemented locally

This was pulled ahead of Milestone 2 because the owner asked for it to be finished before any shared migration.

**The screen: Rent ops › "Invoices to review"** (`src/modules/rentInvoices/`, wired in `rentOps/RentOps.tsx`)

- **+ New invoice**
  - Pick a tenancy (refreshed each time the picker opens) and a month.
  - Missing information is listed in light yellow with links to where it's fixed; nothing is guessed.
  - Save creates a **draft only**.
- **Review panel** (box standard)
  - View-only facts, with Edit top-right.
  - Approve, Issue… and Reject… sit beside Edit.
  - Edit covers the due date, issuer, recipient, email, lines (charges and credits), the visible note and the internal note.
  - A warning appears *before* saving any change that would clear an approval.
  - The PDF preview is exactly what would be issued, loaded on request.
- **Issue…**
  - The confirmation names the entity's next number.
  - It states that nothing is sent and no payment is recorded.
  - On issue, the PDF is rendered from the stored snapshot, uploaded once, and linked through `attach_invoice_pdf` with its SHA-256.
- **Issued invoices** (the existing Rent ops list)
  - Number column.
  - Drafts never appear there, so they never get a payment status.
  - Superseded and cancelled invoices are dimmed and labelled.
  - "Record payment" only on live issued invoices.
  - Earlier invoices are shown as "Earlier invoice (unnumbered)".
- **Opening a numbered invoice**
  - Shows the **stored** PDF, checked against the recorded fingerprint.
  - Offers Revise (the original stays until the revision is issued) and Cancel… (reason required; the number is kept).
- The old direct-insert `InvoiceForm.tsx` and `createInvoice` are removed.

**Review page** (simulated backend, clearly labelled):

- `npx vite --config vite.rent-invoices-review.config.ts` → `http://127.0.0.1:5196/rent-invoices-review.html`.
- It's the real Rent ops screen in the real AppShell, but `supabaseClient` and `AuthContext` are replaced by `src/modules/rentInvoices/review/`:
  - an in-memory store with fictional fixtures;
  - a JavaScript mirror of the database actions;
  - an in-memory Storage that refuses overwrites.
- There is no database and no network. The SQL remains the source of truth.

**Browser-checked on the review page:**

- Draft → approve → issue gave SRP-INV-000001; the stored PDF matched its fingerprint.
- The New invoice blockers for an incomplete tenancy show four yellow items with fix links; the already-invoiced month is refused; November is drafted.
- Approval is kept by an internal-note edit and cleared by a visible-note edit (with a warning before save).
- Revise creates a draft revision.
- Cancel needs a reason and keeps the number.
- The issued list shows statuses.
- 390px: no sideways scroll; every control at least 44px.
- 900px: no sideways scroll (wide tables now scroll inside their box).

**Bug found and fixed:** the issued panel opened before the PDF finished storing, showing "No stored PDF yet". Issue now stores the PDF before reopening, and "Store PDF" appears only when the file is actually missing.

## Old clients (the currently deployed dashboard): rehearsed

`supabase/tests/rent_invoicing/old_client.sql` replays the deployed client's exact statements against the Stage 1 database, as a signed-in member:

- Old "Create invoice" is refused (`ZM311`) with the message "Invoices are now created and changed through the review-and-issue flow. Reload the dashboard to continue — nothing was saved." Nothing is written.
- Old invoice list query: every column it reads still exists, and it works.
- Old "Record payment" on existing invoices still works.
- A stale tab **would list drafts** (it can't filter by state). This is display only: recording a payment against a draft is refused (`ZM316`).

**Release order implied:** database first, then the frontend immediately after. The gap only affects creating invoices (safely refused, with a reload instruction).

## Issued PDF bytes: protected in design, not yet proven on hosted Storage

- `attach_invoice_pdf` is the only way to link a PDF. It checks the path and records the SHA-256 and size in the immutable `invoice_events`. The screen re-checks the stored bytes against that digest whenever it opens them.
- Restrictive policies on `storage.objects` (documents bucket) stop members deleting or overwriting any object that a `documents` row links to an invoice. Other documents are unaffected; the control object in `storage.sql` passes.
- **Limit of the evidence:** the disposable Postgres proves the policy SQL, **not** that hosted Supabase Storage enforces it on its API. Before release, verify in Practice (after T2's window handoff):
  1. upload an issued PDF;
  2. try to overwrite it (`upsert`) as a member;
  3. try to delete it through the Storage API;
  4. confirm both are refused and the bytes still match the recorded digest;
  5. confirm an ordinary document can still be deleted.
- The service role bypasses these policies, as with all Storage policies. The recorded digest is the detection backstop.

## Review references and later changes (September 30)

- **`4bd2078` is the owner's review reference** for the Rent ops workflow.
  - It's served from the pinned worktree `../ZMR-Real-Estate-T4-review` at
    http://127.0.0.1:5196/rent-invoices-review.html (a detached server).
- **Later, separately identified changes:**
  - `ae0d469`: Milestone 2 checkpoint. Tenancy & billing, Property billing
    settings and Entity invoicing boxes, plus the invoice-code lock
    migration `20261002150000`. Not yet browser-verified; it needs a backend.
  - The entity branding proposal preview (see
    `ZMR-T4-entity-branding-proposal.md`).
- **The current Stage 1 PDF samples are not approved.** The owner wants
  entity branding and the invoice layout settled first; proposals B1–B9
  await numbered approval.

## T3 correction on `4bd2078` (September 30) and owner-only invoicing

**Implemented locally and checked; not visually reviewed by the owner; not released.**

| T3 finding | What changed | Evidence |
|---|---|---|
| Approval must cover exactly what prints | `invoice_print_snapshot` builds everything printed (issuer, branding and logo version, payment instructions with their source, recipients, rental, lines, note, earlier unpaid). Approval stores it; issue refuses with ZM348, naming what changed; the issued invoice keeps the approved snapshot. The review screen shows "Changed since you approved it" with **Approve again**. | DB checks: branding phone change → ZM348; property override → ZM348; new entity code → ZM348; later settings change leaves the issued snapshot alone. Browser check on the review page. |
| Revisions with payments | `revise_invoice` refuses with ZM349 and explains that payments would need moving, which this release doesn't do. No payment migration was built. | DB check. |
| Assistant provenance | Drafts are created only through `invoicing_internal.create_draft_core`. The public action is always `owner`. The assistant path is only its run, which checks membership and ownership of the assistant's account. Direct `agent_runs` writes are refused (ZM356), and so is passing `'assistant'` to the public action. | DB checks. |
| Test runner | `run.sh` counts PASS/FAIL against the number of checks written, exits 1 on any failure or a check that didn't run, and `selftest.sh` proves detection. It caught two real issues this session: a missing-amount billing rule passing the shape check, and a check that silently didn't run. | 145/145; self-test OK; concurrency A-INV-000004/000005 with no duplicates. |
| PDF existence and retry | Added to the release verification list below. | The retry was browser-checked on the review page with `?fail-upload=1`. |

**Owner-only invoicing (owner-approved September 30).** Recorded in the approval register addendum.

- ZM370 applies to every invoice action, invoicing setting, billing rule, assistant record and invoice-PDF upload for anyone who is not the account's owner.
- It is checked first in every action and backed by table triggers for direct writes.
- The DB checks run a manager, a viewer and another account's owner against each action (31 checks), then confirm nothing changed and memberships are untouched.

## Invoice totals and earlier balances (September 30)

**Owner requirement, as stated September 30.**

- Show this invoice separately from earlier unpaid invoices.
- Earlier invoices never become new charges.
- An account-wide total must count each earlier remaining balance exactly once.
- An explicitly linked renewal may carry the earlier balance within the same billing relationship and entity.
- Never infer the link from tenant identity, and never combine unrelated liabilities.
- Flag uncertain responsibility for review.

**Built:**

- **The link.** `lease_billing_terms.continues_lease_id` is owner-set on Tenancy & billing ("Billing continues from").
  - It must point to an earlier tenancy in the same account (ZM302).
  - It can't form a loop (ZM303).
  - Each earlier tenancy can be continued at most once (unique).
  - It is owner-only through the existing billing-terms trigger.
  - Nothing is linked automatically.
- **Which earlier invoices count.** `invoice_balance_references(invoice)` walks this tenancy plus its explicit links. It takes issued, numbered invoices with a remaining balance (amount due − payments), and excludes superseded, cancelled and unissued invoices and the invoice being revised.
  - Invoices issued by the same entity, on this tenancy or on a linked tenancy that shares a billed tenant, are **counted**.
  - Anything else is **review only**, with a reason: "different entity — separate liability" or "no billed tenant in common — who owes it needs your review". These are shown to the owner and never printed or counted.
- **Snapshot.** The print snapshot carries `prior_unpaid` (counted), `balance_review` (not counted) and `balance {this_invoice, earlier_unpaid, total_outstanding}`.
- **What prints.** "Amount due — this invoice" (the invoice's own lines), then a separate, smaller line: "Total outstanding for this tenancy" — or "… this tenancy and the one it continues" when a link applies. The earlier-invoices block is headed "already billed, not charged again on this invoice" and names the earlier tenancy.
- **Evidence.** 13 new DB checks; the suite is at 158/158 with a passing self-test. They cover:
  - a replaced invoice counted once (the revision, not the superseded original);
  - totals exact, and no earlier balance ever becoming a line;
  - no link, no carry-over, even for the same tenant;
  - link refusals: self, later tenancy, other account, second successor;
  - a linked renewal counted once, with the invoice's own amount unchanged;
  - a different entity going to review only;
  - no shared billed tenant going to review only.

  Plus unit tests for the renderer and new sample PDFs (samples 2 and 3).

**Not verified:**

- PostgREST's embed hint `lease_billing_terms!lease_billing_terms_lease_id_fkey` has not been run against real PostgREST (it's needed now that two foreign keys point to `leases`). This is a Practice check.
- The review page's simulated backend models this-tenancy earlier balances only, not links.

## Candidate on the released baseline (October 1)

**Branch** `t4/stage1-on-r2` is released R2 `2026d5f` (which contains R1 `fc20c6c`) plus a merge of `agents/stage1-invoicing` (`080fe6a`) and one fix commit. The fixed candidate commit is named in the T3 request (`ZMR-T4-request-T3-review-stage1.txt`).

- **Merge:** one conflict, in `DESIGN-SYSTEM.md`. Both sides had added a separate section, and both were kept.
- **R1 and R2 preserved:**
  - migrations `20260929020000` and `20261001190000` and `src/modules/bankReconciliation/*` are byte-identical to `2026d5f`;
  - no released migration changed;
  - no M1–M6 (`b2c767d`) and no `20260930*` migration.
- **Released R2 renderer files changed by Stage 1:** `stationeryFields/Logic/Pdf/Types.ts`, for the approved totals and renewal labels. `EntityProfile.tsx` gains the Invoicing box.
  - Proof that R2's output is unchanged: the branding sample invoice and receipt, with and without field numbers, render **identical** PDFs on `2026d5f` and on the candidate, apart from the creation date.
- **One PDF viewer:** invoices now use R2's shared `src/shared/pdf/PdfCanvasPreview`. Stage 1's earlier invoice-only copy, its worker type stub and its styles are deleted, so the bundle carries one pdf.js copy.

**Completed locally (evidence):**

- `tsc -b --noEmit` clean; vitest 188 passed (+1 new); oxlint 0 errors; build OK.
- **Database suites on the full chain** (115 migrations: production's 106 + Stage 1's 9):
  - invoices **158/158** with a passing self-test; concurrency gives A-INV-000004/000005, no duplicates;
  - branding **27/27**;
  - R1 void-reconcile **36/36**.
- **Previously open checks, now resolved:**
  - **Billing-rules box in a browser:** the review page now opens the real tenant profile with `?path=/tenants/t-casey`. At 500 px width:
    - rules and statements render;
    - an empty one-time rule shows all three required-field errors and saves nothing;
    - a valid −$25 credit saves and lists as "−$25.00 in November 2026 (credit)";
    - a $91.40 statement shows the "Tenant's 50%: $45.70" hint and lists as not billed;
    - every rule control is 46 px; there is no sideways scroll.
  - **Two defects found and fixed:**
    - a brand-new credit showed "On an invoice" when a missing value meant not billed (fixed, with a test);
    - billing-form dropdowns were 41 px on phones (now at least 44).
  - **"Billing continues from":** offers only earlier tenancies, labelled with address, unit, dates and tenants. It offers none for the earliest tenancy.
  - **Rent ops at 500 px:**
    - "What prints" shows the separate "Amount due — this invoice" and "Total outstanding for this tenancy" ($1,450 / $2,900), with the earlier invoice listed as already billed;
    - no control under 44 px; no sideways scroll;
    - the draft PDF draws through the shared viewer, with no embedded viewer.
- **Reused unchanged (no code change since):** the visible PDF-upload retry (`?fail-upload=1`) and the PDF-viewer failure/recovery checks from `bb9a392`; the shared viewer's failure/recovery checks from R2 `2026d5f`.

**Still needs hosted checks:** Practice, in a window granted by T1; see the list below and `ZMR-T4-request-T1-practice-window-stage1.txt`.

**Release ordering (for whoever ships second):**

- T2's A candidate (`ba2c9b1`) is also built on `2026d5f`. Its M6 migrations sort before R2's.
- Stage 1's 9 migrations sort after R2's, so after either order Stage 1 applies with a plain push of exactly its 9 files.
- The second frontend release must integrate the first. Neither includes the other today.

## Release verification (Practice, before any production step)

Each item must be observed on Practice through the dashboard, not inferred from disposable-DB checks.

1. **PDF exists.** After issuing a test invoice, open it. "Stored PDF — matches the fingerprint recorded at issue" must show. Download the file and compare its SHA-256 with the `pdf_attached` event.
2. **PDF is protected.** As the owner, try deleting and overwriting that object through the Storage API; both must be refused. Confirm an ordinary document in the same bucket can still be deleted (control).
3. **Visible retry.** Make the upload fail (for example, go offline in DevTools just before confirming Issue).
   - The invoice must show as issued with its number and the "PDF isn't stored yet … Store PDF" message.
   - Retrying must store the PDF under the same number.
   - Reloading before retrying must still offer "Store PDF".
4. **Owner-only.** Confirm the reserved test-verification login's membership is `owner`; if it isn't, report it rather than change it. If Practice has a non-owner member, their invoice actions must be refused with the owner-only message.
5. **Hosted Storage.** Confirm the Storage policies behave as in the local stand-in, including a non-owner upload into `/Invoices/` being refused.
6. **Tenancy & billing loads through real PostgREST.** The `lease_billing_terms!lease_billing_terms_lease_id_fkey` embed must return the terms now that two foreign keys point at `leases`. The simulated backend can't test this.
7. **Apply on Practice by the exact-set procedure.**
   - Pending from the candidate = exactly the 9 `20261002*` files, after mirroring Practice's already-applied M6 files locally as was done for R2.
   - Then repeat the invoice flow end to end on a `ZMR-TEST-` tenancy: draft, approve, issue (number and stored PDF), revise refusal with payments, cancel. Also one billing rule and one statement.
   - Clean up, and report residue. Stored invoice PDFs and logos are permanent by design.

## Routine implementation choices (not owner decisions)

These are recorded so they aren't mistaken for approvals.

- Recipients are copied from tenant profiles when a draft is made. A later profile edit doesn't change a draft until "Refresh from tenant profiles" is saved; that refresh counts as a material change.
- Lines from billing rules can't be edited on the invoice; they change on the tenancy. Manual lines stay editable.
- Drafts print "DRAFT — NOT ISSUED", "Assigned on issue" and "On issue". A revision prints "REVISED — REPLACES <number>".
- Approving an already-approved invoice again is allowed; it refreshes the recorded snapshot.
- A statement document is linked from the property's existing documents; uploading happens in Documents.
- Ending a billing rule keeps it on record (status `ended`); nothing is deleted.
- Old sample PDFs were replaced by snapshot-rendered samples: `samples/sample-1-issued-with-logo_A-INV-000001.pdf` and `samples/sample-2-draft-no-logo_co-tenants.pdf`.

## Known gaps (updated October 1)

- **Resolved:** the phone-width check, and the billing-rules box in a browser (see "Candidate on the released baseline").
- **Workload editing of billing rules:** not wired, because the real Agents screen doesn't exist yet (the rename is pending coordination). It isn't added now: no new features. `TenancyChargeRulesBox` is reusable there.
- **Member role in the frontend:** the shared auth context doesn't carry it, so non-owners see action buttons and get the owner-only refusal message. Hiding the buttons is a shared auth change, not made here. The backend enforcement is complete.
- **Recording payments:** existing behaviour, unchanged, recorded separately in `ZMR-T4-existing-payment-recording-behavior.md`.
- **Hosted checks 1–7 above:** pending a Practice window from T1.

## Remaining milestones (estimates)

| # | Work | Estimate |
|---|---|---|
| 2 | Dashboard fields: Tenant profile › Tenancy & billing box (terms, recipients); Property › Billing settings box; Entity profile › Invoicing box (code, reply-to, payment instructions, sequence start) | 8–10 h |
| 3 | ~~Rent ops replacement workflow~~ **done locally**, see above | — |
| 4 | Agents screen (real module at the Automations route): assistant, assignments, Workload (next task, balance, missing fields with links, pending approvals), Approvals, runs | 7–9 h |
| 5 | Practice verification (after T1's handoff); empty-account and export checks; mobile; clean clone; T3 review | 5–6 h |
|   | **Total remaining** | **≈ 20–25 h** |

## Dependencies and coordination

- **Practice window:** requires a handoff from **T1** (corrected September 30;
  earlier text said T2). T4 makes no Practice reads or writes and applies no
  migration until T1 hands over.
- **Shared files:**
  - Milestone 2 adds boxes on Property, Tenant and Entity profiles.
    `PropertyProfile.tsx` is on the shared-file caution list, so T4 places
    the billing box inside the Overview tab's own component and checks
    status before editing.
  - The Agents nav rename waits for the planning side to commit
    `CLAUDE.md`; see the addendum.
- **T2:** the payment allocation and Financials link stay T2-dependent
  (proposal pending). Stage 1 doesn't need them.
- **T1:** a pending migration also extends `documents`. No overlap was found
  in the combined test.

## Deferred and recorded (not decided here)

- RP3 template overrides.
- RP5 allocations, balance across payments and delivery history.
- Receipts (sequence table ready for `receipt`).
- RP4, RP6, RP7.
- Storage-level protection of issued PDF files. The database row is
  protected; the storage bucket's delete policy is shared and unchanged.
- Audit-log coverage beyond `invoice_events`.
