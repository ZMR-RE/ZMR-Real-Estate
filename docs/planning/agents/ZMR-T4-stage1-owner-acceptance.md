# Stage 1 rent invoicing: owner acceptance (short)

## What it does
- You draft a tenant's monthly invoice from their lease and billing rules, check what will print, approve it and issue it.
- **Issuing:**
  - gives it the entity's next number (e.g. A-INV-000001);
  - stores the PDF permanently.
- **After issuing:** you revise it or cancel it; you can't edit it.
- **Payments block changes:** once a payment is recorded, the invoice can't be revised or cancelled.

**Not included:** nothing is ever sent or scheduled. Receipts and the assistant drafting by itself are not part of this stage.

**Owner-only:** only an account owner can do any of this. Managers and viewers can look but not change.

## Where it lives (no new menu item)

| Screen | What's there |
|---|---|
| Rent ops | "Invoices to review" and "Issued invoices" |
| Tenant | Tenancy & billing (due day, who's billed, partial months) and Billing rules (recurring shares, variable bills from statements, one-time charges) |
| Entity profile › Invoicing | The invoice code and the first number |
| Property › Billing settings | Which entity issues this property's invoices; optional property payment instructions |

## Evidence

**Real Practice dashboard, fictional data, October 1.** Screenshots are in `evidence/stage1-hosted/`:
1. H1: the tenant's billing terms after a reload.
2. H3: the November draft at $1,045.00 (rent $1,000 + pest $25 + water $20).
3. H4: "Changed since you approved it", needing approval again.
4. H5: issued S1T-INV-000001 with its stored PDF preview.
5. H7a and H7b: a failed PDF save is recovered with "Store PDF", keeping the same number.
6. H8a: a revision is refused because a payment arrived meanwhile.
7. H8c: earlier unpaid invoices are listed and not charged again.
8. H11: Financials is unchanged.

**Owner-only (H10):** not testable on Practice, which has no manager login. It's proven by 32 local database checks only.

**Simulated backend, not Practice:** `F1-fixed-harness-after-cancel.jpg` shows the details-panel fix. After Cancel, the panel shows "Cancelled (number kept)" with no Revise/Cancel. After Reject, the panel closes. This screen fix hasn't been seen on Practice yet.

**Limitations:**
- The Practice screenshots are at one desktop width and drawn small, so they're proof that things work, not a guide to how they look.
- **For appearance,** use the local review harness captures. They're the same screens and styles with fictional data and no real backend, at 1280, 900 and a true 390 px width: `evidence/stage1-local-harness/`.
- Things to look at, and the open layout questions: `ZMR-T4-stage1-acceptance-review-material.md`, sections 3 and 4.

## Please decide
1. **Accept or request changes** to the Stage 1 screens and invoice PDF as shown. Phone width: accept the harness evidence, or ask for a phone check on Practice.
2. **Hosted re-checks before release** (optional):
   - F-1 on Practice;
   - H10 with a Practice manager login. This one needs your approval to create a non-owner Practice member.
3. **Release timing:** settled. Stage 1 releases after T1's mortgage release, on whatever is actually live then.
4. **Release approval** comes later, for the exact final candidate.

## After release
The first real invoices are yours to set up through the dashboard:
1. the entity's invoice code (and first number, if you're continuing an existing sequence);
2. each tenant's billing terms;
3. then draft → approve → issue.

**Nothing is sent automatically.**
