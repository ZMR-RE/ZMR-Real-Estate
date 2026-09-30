# T4 — Approval register addendum (to append; additive only)

**Why this is a separate file.** At the time of writing, the main checkout has
**uncommitted** edits to both of these files:

- `docs/planning/ownership-property/ZMR-approval-register.md`
- `CLAUDE.md`

The edits belong to the planning side. T4 does not edit either file, so none of
that work is overwritten. The owner of those edits should append the section
below, verbatim, to the end of the register, after committing their own
changes.

## RP1–RP7 wording — not available to T4

The owner approved RP1–RP7. **Their exact wording is not in any file this
terminal can read.** I searched:

- the main checkout, including uncommitted files;
- the T1, T2 and T2-foundation worktrees;
- this worktree.

The only references to RP1–RP7 are T4's own. They were not included in the
prompts relayed to T4. T4 has **not** reconstructed or inferred them.

Needed from the planning conversation: the verbatim RP1–RP7 text, pasted into
this addendum, the register and the T4 specification (`ZMR-T4-agents-workspace-preview.md`, section "RP1–RP7").

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
- RP1–RP7 approved. Verbatim wording: [TO BE INSERTED from the planning conversation — not available to T4].
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

Not authorized by these decisions: mailbox connection, sending, schedule activation, schema/migration
deployment, production changes. Nav rename requires shared-file coordination (AppShell.tsx, App.tsx route
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
