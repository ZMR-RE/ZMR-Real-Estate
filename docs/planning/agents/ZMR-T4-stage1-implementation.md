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

## Remaining milestones (estimates)

| # | Work | Estimate |
|---|---|---|
| 2 | Dashboard fields: Tenant profile › Tenancy & billing box (terms, recipients); Property › Billing settings box; Entity profile › Invoicing box (code, reply-to, payment instructions, sequence start) | 8–10 h |
| 3 | ~~Rent ops replacement workflow~~ **done locally**, see above | — |
| 4 | Agents screen (real module at the Automations route): assistant, assignments, Workload (next task, balance, missing fields with links, pending approvals), Approvals, runs | 7–9 h |
| 5 | Practice verification (after T2's window handoff); empty-account and export checks; mobile; clean clone; T3 review | 5–6 h |
|   | **Total remaining** | **≈ 20–25 h** |

## Dependencies and coordination

- **Practice window:** held by T2. T4 makes no shared Practice writes or
  migration application until the handoff.
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
