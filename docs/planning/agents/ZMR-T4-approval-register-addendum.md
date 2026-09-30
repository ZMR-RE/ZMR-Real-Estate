# T4 — Approval register addendum (to append; additive only)

**Why this is a separate file.** At the time of writing, the main checkout has
**uncommitted** edits to both of these files:

- `docs/planning/ownership-property/ZMR-approval-register.md`
- `CLAUDE.md`

The edits belong to the planning side. T4 does not edit either file, so none of
that work is overwritten. The owner of those edits should append the section
below, verbatim, to the end of the register, after committing their own
changes.

## RP1–RP7 wording — received September 30, 2026

The verbatim text was relayed to T4 with the Stage 1 approval. It replaces the earlier placeholder and is also recorded in `ZMR-T4-agents-workspace-preview.md`.

```
RP1 — Tenant and tenancy
Tenant profile → Tenancy & billing: Linked property/unit, co-tenants, billing recipients, rent, frequency, due day, effective dates and prorating instructions. One charge per tenancy/period by default, not per co-tenant.
RP2 — Billing entity
Property → Billing settings; reusable entity profile: Explicit invoicing entity, display/legal name, address, reply-to address and payment instructions. Preserve these on issued documents even if settings later change.
RP3 — Agent workload
Agents → Rent & Payments Assistant → Workload: Assigned tenancies, active/paused status, next task, unpaid balance, missing fields and pending approvals. Tenant-specific invoice/receipt notes and template overrides, without duplicating the agent.
RP4 — Payment evidence
Rent ops → Payments; mailbox connection in Settings: Source email/reference, payer, amount, currency, payment date, reported status, owner confirmation and allocations across charges. Support partial payments, reversals and duplicate detection.
RP5 — Invoices and receipts
Rent ops: Unique document numbers, billing period, itemized charges/credits, payment allocations, balance, PDF, approval and delivery history. Changing an issued invoice creates an auditable revision or adjustment—not a silent replacement.
RP6 — Reminders and late fees
Tenancy & billing → Collection rules: Grace period, fee method/cap, timing, exceptions and approved rule source. Missing information blocks fees. During training, require owner approval of the proposed fee, revised invoice and message.
RP7 — Portfolio rent overview
Rent ops: All properties together, filterable by entity/property/tenant/period. Show outstanding, partially paid, overdue and paid invoices; confirmed payments separately from reported-but-unconfirmed payments. Financials uses linked payment records so income is not entered twice.
```

---

## Text to append to the approval register

```
## Agents / Rent & Payments Assistant — owner decisions, September 30, 2026 (recorded by T4)

Approved (owner statements relayed to T4; see docs/planning/agents/ZMR-T4-agents-workspace-preview.md):
- Workspace renamed "Agents": searchable/filterable directory left, selected profile right; side-by-side
  remains the approved direction (current layout/density accepted temporarily). Priority ordering (problems,
  review, rest) before pagination; total count; 25/50/100 page sizes; stable selection.
- Row colour: light yellow = human approval/review needed (including missing billing information); soft red =
  failure, disconnection or overdue work; otherwise neutral; selection preserves the colour; ordinary drafting
  or idle time is not an alert.
- One rent-cycle specialist named "Rent & Payments Assistant" (name approved), covering invoices,
  payment-notification review, partial payments, receipts, reminders and delivery, with per-tenant workload
  assignments; no separate agents by default; no unconfigured examples in the operational directory.
- RP1–RP7 approved as the overall specification (verbatim text in docs/planning/agents/ZMR-T4-agents-workspace-preview.md and the T4 addendum).
- Shared records: Rent ops, agent Workload and Approvals reference the same invoice/payment/receipt records;
  no parallel agent ledger or document copies. Draft edits appear everywhere; issued PDFs and delivery history
  preserved through explicit revisions; edits made while an agent is working are detected.
- Approval invalidation: any change to recipient, visible email/PDF content or attachments invalidates approval
  (as do amount, dates, issuer); a note stays exempt only if strictly internal and unable to affect delivery.
- Numbering and filenames: independent invoice and receipt sequences per issuing entity; six digits,
  {CODE}-INV-000001 / {CODE}-RCT-000001; revisions -R{n}; files {number}_{YYYY-MM or YYYY-MM-DD}_{unit}.pdf;
  continuous, no annual reset; numbers assigned at issuance only; cancelled numbers never reused; issuance
  protected per entity and document type across every creation path (not only one run per agent). Entity
  codes are configurable dashboard values.
- Payments: notification emails are evidence, never automatic settlement or reconciliation; separate payment
  events preserved; no duplicate financial entries; payment splits are explicit owner-confirmed proposals (no
  automatic order such as oldest-first is approved).

Stage 1 implementation approved (Sep 30): connected, manual invoice drafting and PDF review — dashboard fields
to draft invoices from structured tenancy and issuer records; persisted drafts and approvals; reviewable PDFs;
integration with Rent ops and the assistant's Workload on the same records; explicit owner-approved issuance with
entity-specific numbering, without implying delivery or payment. Outside Stage 1: mailbox processing, payment
receipt issuance, reminders, late fees, schedules, sending; no competing accounting records or T2-owned
functionality; no production deployment. Shared Practice writes wait for the current window handoff (held by T2).
Approved filenames: A-INV-000001_2026-10_Unit-1.pdf and A-RCT-000001_2026-10-03_Unit-1.pdf. Structured dashboard
records supply billing values (never inferred from lease PDFs); a missing payment email is not proof of nonpayment.

Not authorized by these decisions: mailbox connection, sending, schedule activation, production changes. Nav rename requires shared-file coordination (AppShell.tsx, App.tsx route
label, Automations placeholder, Action Queue "Automations" tab, CLAUDE.md Navigation discipline list) — not
renewed product approval. T4 → T2 rent-payment dependency proposal pending T2 review:
docs/planning/agents/ZMR-T4-to-T2-rent-payment-dependency-proposal.md.
```

## Rename coordination (shared files)

Checked on September 30, 2026 across main, T1, T2 and T2-foundation.

| File | Change needed | Status |
|---|---|---|
| `src/shared/AppShell.tsx` | Nav label `Automations` → `Agents`; add `/agents` route and keep `/automations` redirecting | Clean in every checkout. Ready after assignment. |
| `src/App.tsx` | Route `/agents` → the Agents screen; `/automations` → redirect | Clean everywhere |
| `src/modules/automations/Automations.tsx` | Placeholder heading → Agents; later replaced by the real screen | T4-owned module |
| `src/modules/actionQueue/*` | "Automations" tab label → "Agents" | Clean everywhere |
| `CLAUDE.md` | Navigation discipline list: "Automations" → "Agents" | **Uncommitted edits in main (planning side).** Sequence after they're committed. |

**Recommended sequencing.**

1. The planning side commits its `CLAUDE.md` and register edits.
2. One terminal is assigned the rename (T4 can take it) and applies all five
   changes in one commit.
3. Verify with a clean-clone build.

No product approval is needed; the owner has settled the rename.

## Owner-only invoicing — approved September 30, 2026

**Approval (verbatim scope from the owner's T4 prompt).** Owner-only invoice functionality
for this release. Enforce portfolio ownership on invoice mutations and related settings in
the backend. No invitations or manager/viewer workflows. Use existing ownership records; do
not silently change memberships. Record the approval and test denial for unauthorized callers.

**What "owner" means.** The existing `account_members.role = 'owner'`. Nothing creates,
changes or backfills a membership.

**Covered (refused with ZM370 for a manager or viewer):**

- every invoice action: draft, edit, approve, reject, issue, revise, cancel;
- attaching an issued PDF, and uploading into a property's `Invoices` folder;
- the first-number setting, the entity invoice code and the property's invoicing entity;
- the property's payment-instructions override and the tenancy billing-recipient flag;
- tenancy billing terms, billing rules and statements;
- assistant assignments, runs and the assistant record;
- entity branding & documents: settings, logo versions and logo files.

Direct API writes are covered by table triggers. Every action checks ownership before any
other validation.

**Not covered (unchanged):**

- reading: managers and viewers can still see invoices and settings;
- other edits to the same records (property address, tenancy members);
- recording payments — this is T2's rent-payment area. The owner should decide there whether
  managers may record payments.

**Evidence:**

- `supabase/tests/rent_invoicing/owner_only.sql`: 31 checks. A manager, a viewer and another
  account's owner attempt each action. The checks also confirm that no invoice, event or
  setting changed afterwards and that memberships are untouched.
- `supabase/tests/entity_branding/tests.sql`: 8 owner-only checks.

**Release check.** On Practice, confirm the reserved test-verification login is an `owner`
before using it for invoice or branding verification. If it isn't, report it; don't change
the membership.
