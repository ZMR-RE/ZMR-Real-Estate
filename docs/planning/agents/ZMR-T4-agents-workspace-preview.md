# T4 — Agents: Rent & Payments Assistant specification and preview

Owned by terminal T4. Last revised September 30, 2026. This is a specification
and a non-saving preview only.

**Nothing was deployed, migrated, connected, scheduled or sent.**

Owner decisions are listed as **Approved** only when the owner stated them.
Everything else is marked as a recommendation or an open item.

**Companion documents:**

- [`ZMR-T4-approval-register-addendum.md`](ZMR-T4-approval-register-addendum.md): additive register text, RP1–RP7 status, and rename coordination.
- [`ZMR-T4-to-T2-rent-payment-dependency-proposal.md`](ZMR-T4-to-T2-rent-payment-dependency-proposal.md): one recorded payment, invoice allocations and Financials, with no duplicate income.

## Status (per the September 24 reporting rule)

| Stage | State |
|---|---|
| Implemented locally | Non-saving preview, committed on branch `agents/workspace-preview` (worktree `../ZMR-Real-Estate-Agents`) |
| Visually reviewed by owner | First-pass layout accepted **temporarily** as sufficient in density. The revised preview has not been reviewed. |
| Real integration verified | **No.** The backend is simulated: `vite.agents-preview.config.ts` swaps in the devHarness Supabase and auth mocks, so no database is read or written. |
| Released | **No** |

**Review URL:** `http://127.0.0.1:5193/agents-preview.html`
- Start it from the worktree with `npx vite --config vite.agents-preview.config.ts`.
- It uses the real AppShell and production CSS, and is not wired into `App.tsx`.

**Preview datasets:**
- Example account
- Failed run (soft red)
- Many rows (layout test): 59 generic rows labelled as test rows
- New account

**Fictional data:** every name, address, amount, date and entity code is
fictional.

## Approved decisions (owner, September 30, 2026)

### 1. Agents workspace

- The workspace is named **Agents**.
- The searchable, filterable directory sits on the left and the selected
  profile on the right. **Side by side remains the approved direction.** The
  current layout and density are accepted temporarily.
- Controls are compact, with accessible touch targets.
- Directory rows are ordered by priority *before* pagination: problems, then
  review, then the rest.
- The total count is shown, with 25/50/100 page sizes.
- **Selection is stable.** It's tracked by id and never changed by filtering,
  re-sorting or paging. A "Show selected" control appears when the selected
  row is off the current page or hidden by filters.

**Why the preview shows one pane below 1200px.** This is a narrow-width
fallback, not a replacement for side by side. With the sidebar visible, a
900px window leaves about 560px for content, so a profile beside a 280–340px
directory would be about 200px wide.

**Rename coordination.** The nav label, routes and the CLAUDE.md nav list need
coordinated shared-file edits, but no renewed approval. See the addendum.

### 2. Row colours

- **Light yellow:** the whole row when human approval or review is needed,
  **including missing billing information**, such as a lease with no rent.
- **Soft red:** a failure, a lost connection or overdue work.
- **Neutral:** everything else. Idle time and ordinary drafting are not alerts.
- **Selection** keeps the colour. It adds an outline and an inset bar.
- The colours come from preview-scoped tokens in `agentsPreviewTokens.css`.

### 3. The assistant

- One rent-cycle specialist, **Rent & Payments Assistant** (name approved).
- It covers invoices, payment-notification review, partial payments, receipts,
  reminders and delivery, with per-tenant workload assignments.
- There are no separate agents by default.
- Unconfigured examples are removed from the operational directory.
- **My evaluation: I agree with one agent.** All six duties share the same
  records, and separate agents could act on the same record in conflicting
  ways.
  - Each duty has its own on/off switch.
  - Delivery stays locked off until a mailbox exists and sending is approved.

### 4. RP1–RP7

Approved by the owner. **The verbatim wording is not available to this
terminal.** It isn't in any readable checkout and wasn't included in the
relayed prompts. T4 has not reconstructed it. The addendum has a placeholder
for the planning conversation to fill in.

### 5. Shared records

- Rent ops, the assistant's Workload and Approvals reference the same invoice,
  payment and receipt records. There is no parallel agent ledger and no
  document copies.
- Draft edits appear everywhere.
- Issued PDFs and their delivery history are preserved through explicit
  revisions.
- Edits made while the agent is working are detected.

### 6. What clears an approval (correction)

**Any** change to what the tenant receives clears an existing approval:

- recipient (bill-to name and email);
- visible email or PDF content: amount, dates, period, issuer, the note shown
  on the invoice;
- attachments.

**Only a strictly internal note** keeps the approval. It is never rendered on
the PDF, never included in an email, and cannot affect delivery.

### 7. Numbering and filenames (six-digit format per the owner's correction)

**Formats:**

| Item | Format | Example |
|---|---|---|
| Invoice number | `{CODE}-INV-{NNNNNN}` | `A-INV-000001` |
| Receipt number | `{CODE}-RCT-{NNNNNN}` | `A-RCT-000001` |
| Revision | `{number}-R{n}` | `A-INV-000001-R2` |
| Invoice file | `{number}_{YYYY-MM}_{unit-slug}.pdf` | |
| Receipt file | `{number}_{YYYY-MM-DD}_{unit-slug}.pdf` | |

**Rules:**
- Each issuing entity has independent invoice and receipt sequences.
- Numbering is continuous, with no annual reset.
- Numbers are assigned at issuance only.
- Cancelled numbers are never reused.
- `{CODE}` is a configurable dashboard value on each entity.

**Correction: issuance is protected per entity and document type across every
creation path.** That means assistant drafts, owner-created Rent ops invoices,
revisions and receipts. One run per agent is **not** the protection.

- **Preview.** Every path takes its number from one allocator,
  `agentIssuance.ts`. It reserves a number, then commits only if the
  sequence hasn't moved and the number is unused. A stale reservation is
  refused (nothing is written) and re-reserved.
  - A test covers the assistant and a manual owner invoice reserving from the
    same snapshot: EXH-INV-000009 is issued once, the second path is refused,
    then gets EXH-INV-000010.
- **Built feature.** One database function locks the entity × document-type
  sequence row, writes the number and state, and relies on a unique
  (account, entity, document type, number) index. No client path writes a
  number directly.
- The per-agent run lock stays, separately, to prevent overlapping runs.

### 8. Payments (correction)

- A payment email is evidence. It never settles or reconciles anything
  automatically.
- Separate payment events are preserved.
- There are no duplicate financial entries. See the T2 proposal: one recorded
  payment is one Financials income row, with Rent ops allocations linked to
  it.
- **Splits are explicit owner-confirmed proposals.**
  - The allocation editor starts empty.
  - The owner enters each amount. "Fill balance" is a per-invoice shortcut the
    owner chooses.
  - Validation: no allocation above an invoice's balance, no total above the
    payment, and only this tenant's open invoices.
  - Anything unallocated stays visibly unapplied.
  - **No automatic order (such as oldest-first) is implemented or approved.**
  - The open invoices are listed by due date for display only.

## How the preview models it

**One record store.** `RecordStore` (entities, invoices, payments, receipts,
reminders, notices) is held once by `useAgentsPreview`, and agents hold none
of it.
- Workload is a per-tenant filter.
- Approvals filters draft/approved invoices and receipts, pending reminders
  and notices.

**Document states.** draft → approved → issued, plus superseded, cancelled and
rejected.
- Only issued invoices carry a payment status, so a draft never shows as
  "overdue".

**Versions.** Every edit bumps `version`.
- An edit to any field except `internalNote` also bumps `materialVersion`.
- Approval is valid only while `approvedMaterialVersion === materialVersion`.

**Edit-during-run detection.**
- The assistant applies a change only against the version it read, using the
  `property_ownership_versions` pattern (`20260925050000`).
- If the record moved on, the change is held and flagged "Changed by you
  while run … was working".

**Revise and Cancel.**
- **Revise** creates a linked draft. On issue it takes `{number}-R{n}` and the
  original becomes Superseded; both PDFs are kept.
- **Cancel** keeps the number and PDF; the sequence is never rewound.

## Field map (existing vs missing, with dashboard home)

The authoritative list is `src/modules/automations/preview/agentInputs.ts`
(36 fields: 10 exist, 26 new, each new field naming the existing record it
extends). The preview renders it under Required information › Field map.

**Actionable links.** For gaps in existing fields, the preview links to the
dashboard home:
- lease rent → Property › Units › Lease;
- owners → Property › Ownership;
- tenant email → Tenant profile.

## Still open — reduced to genuinely unresolved items

### A. Business settings, entered later through the dashboard

These are values, not product decisions. The feature needs a field for each
(see the field map).

- Each entity's numbering code, and each entity's starting sequence number
  (so it can continue from any existing paper numbering).
- Each lease's rent due day, grace period, and billing contact for co-tenants.
- The issuer for a property with several owners.
- The assistant's draft day and time zone, and which tenants it serves.

### B. Architecture for the terminals to resolve (no owner decision needed)

1. **T2 + T4:** one recorded payment ↔ Financials income row ↔ invoice
   allocations; which side creates it; closed-period re-allocation. See the T2
   proposal.
2. **T4:** the database function and unique index for issuance; the run-lock
   table; the version columns.
3. **T4:** audit coverage for invoices, payments and receipts, and an `agent`
   audit source value.
4. **T4 with the planning side:** the nav rename sequencing after `CLAUDE.md`
   is committed.
5. **T4:** the narrow-width layout (side by side at 900–1200px).
6. **T4:** whether to promote the light-yellow/soft-red tokens to `index.css`,
   and the app-wide phone touch-target fix for the shared Edit button and tab
   bar.
7. **Scheduler infrastructure**, once schedule activation is ever approved.
   None exists today.

### C. Owner choices still genuinely unresolved

1. **Overpayments.** Is unapplied money held as tenant credit for later
   allocation, or refunded? The preview only keeps it visible as unapplied.
2. **Activation.** How many reviewed practice runs before the assistant may be
   activated, and who may activate it.
3. **Review-by deadline**, which defines "overdue review" and therefore red:
   for example, N days after drafting, or before the due date.
4. **Receipt and invoice PDF content.** Which fields and wording appear; the
   layout will follow the design system.
5. **Delivery**, when sending is approved: which mailbox sends for each
   entity, and whether reminders go by email.

## Checks run (T4, branch `agents/workspace-preview`)

**Automated:**
- `npx vitest run src/modules/automations`: 40/40 pass, across two files.
  They cover:
  - colour tiers;
  - priority ordering before pagination, the total count, and 25/50/100 pages;
  - stable selection;
  - the single store;
  - every field that clears approval, and the internal-note exemption;
  - edit-during-run conflicts;
  - per-entity six-digit sequences and filenames;
  - independent invoice and receipt sequences;
  - simultaneous assistant and owner issuance, with no duplicate number;
  - revisions;
  - cancelled numbers never reused;
  - re-issue consuming no number;
  - the run lock;
  - duplicate notice linking;
  - explicit splits only (an empty split applies nothing), with validation;
  - once-per-month drafting.
- The full suite, `npm run build`, `tsc -b --noEmit`, lint, and a clean-clone
  build of the commit: results are in the T4 commit report.

**Real browser** (earlier passes on this branch; re-checked after this revision
where noted in the report):
- the light-yellow row, and the soft-red selected row keeping its tint;
- approval clearing;
- issue and revise, and cancel with the number kept;
- a split payment recorded once;
- duplicate linking;
- ordering and paging;
- widths of 390 and 900px with no overflow.
