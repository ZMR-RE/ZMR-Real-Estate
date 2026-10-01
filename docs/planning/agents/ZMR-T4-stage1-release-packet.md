# Release packet: Stage 1 rent invoicing (T4)

Prepared by T4, 2026-10-01.

**Status:**
- NOT deployed; release NOT approved.
- The production candidate is NOT final yet. It's finalized only after the Manage-panel release (T2, `9caf8e6`) is confirmed live; see §5.

## 1. Reviewed code
- **Code candidate:** `45d3eb5ecfbcd5ee09a6404b9a6c5f2e15b9cf5d` (branch `t4/stage1-on-a`). T3 cleared it with no material blockers.
  - It is `03b3343` (T3-cleared, hosted-tested) plus the F-1 fix.
  - Later commits on the branch change documentation only.
- **Built on:** Release A `ba2c9b1`.
  - It does **not** yet contain Release B `1e4e640` (live) or the Manage fix.
  - The production candidate is an integration merge (§5), not this commit as it stands.
- **Scope (Stage 1 of RP1–RP7, owner-approved September 30), owner-only:**
  - Rent ops invoices: draft, review, approve, issue (per-entity number and stored PDF), revise and cancel.
  - Tenancy & billing terms, billing rules and statements, and earlier unpaid balances.
  - Entity › Invoicing (code and first number), and Property › Billing settings.
  - Assistant workload records (no sending).
- **Excluded:**
  - sending, mailbox, scheduling and the assistant running by itself;
  - receipts, and moving payments between invoices;
  - the Agents rename (T2 owns navigation);
  - F-2 to F-4 (pre-existing; recorded separately).

## 2. Database: exactly nine migrations

All nine are additive. They're byte-identical in `03b3343` and `45d3eb5`, which is the content Practice applied on 2026-10-01.

| Version | File | SHA-256 (first 16) |
|---|---|---|
| 20261002100000 | billing_entities_and_tenancy_terms | f27ffaf757e387f7 |
| 20261002110000 | invoice_lifecycle_and_numbering | d1b5b2c4ee293a5f |
| 20261002115000 | tenancy_charge_rules | 9842fa3f68d10e8a |
| 20261002120000 | invoice_draft_actions | 208f165cdc5fab8a |
| 20261002125000 | invoice_issue_actions | 101f0180482222d2 |
| 20261002130000 | rent_assistant_workload | dccf62274b5ff2b7 |
| 20261002140000 | invoice_pdf_storage_protection | b8eef4010bdaf24d |
| 20261002150000 | entity_invoice_code_lock | 62ab38f054ffa255 |
| 20261002160000 | invoice_owner_only | 612608bf7da781f4 |

**Push procedure.** Production has 109 migrations, and its latest, `20261003100000`, sorts after these nine.
1. Run the exact-set check: local-not-remote must be **exactly these 9**, and remote-not-local must be **none**.
2. The dry run must list only these 9.
3. Push with `--include-all`.

The candidate doesn't carry T1's mortgage `20260930200000` or Capture's migrations, so they can't be pushed by accident. The Manage fix adds no migration.

**What stays in the database after any rollback.** Nothing is dropped, and there are no down scripts.

| Kind | Objects |
|---|---|
| New tables | `invoice_lines`, `invoice_events`, `document_sequences`, `lease_billing_terms`, `tenancy_charge_rules`, `tenancy_charge_statements`, `agents`, `agent_assignments`, `agent_runs`; all account-scoped with RLS |
| New schema | `invoicing_internal`, not exposed through the API |
| New columns on existing tables | `invoices` (lifecycle, number, revision, approval/issue snapshots, version …); `llcs.invoice_code`; `properties.billing_entity_id` and `payment_instructions_override`; `lease_tenants.is_billing_recipient`; `documents.invoice_id`. All are null or default for existing rows. |
| Guards | Owner-only triggers on invoicing actions and settings (ZM370); a payment-versus-revision guard (ZM349); the invoice-code lock after first issue; protection of stored invoice PDFs (no delete, overwrite or move); the same-account check on the billing entity |

**Old-dashboard compatibility.** The pre-Stage-1 dashboard runs correctly on the Stage 1 database: `old_client.sql`, 6 checks. That covers the gap between the database and frontend steps, and a frontend rollback.

## 3. Evidence

| Evidence | Where | What it shows |
|---|---|---|
| T3 review | `03b3343` cleared; F-1 at `45d3eb5` cleared | No material blockers |
| Hosted Practice, on exact `03b3343` (2026-10-01) | `ZMR-T4-stage1-hosted-results.md` | **H1–H9 and H11 PASS** on the real Practice backend and browser. Pre-existing records identical before and after. |
| H10, owner-only | Not available on Practice: no non-owner member exists, and none was created | **Not a hosted pass.** Evidence is local only: `owner_only.sql` (32 assertions: manager, viewer and another account's owner refused for every action; nothing changes; memberships untouched) and 8 owner-only branding checks. |
| F-1 (panel refresh after reject/cancel) | `45d3eb5` | 6 unit tests (3 fail if the old behaviour is restored). Browser before/after on the local review harness, with a **simulated backend, not Practice**. Its database side is unchanged from the hosted run (H8a/H8b refusals and saved states), but the panel refresh itself hasn't been seen against a real backend. |
| Clean clone of `45d3eb5` | T3 request | Build OK; `tsc -b` clean; vitest 228 passed / 1 skipped; oxlint 0 errors (83 warnings); rent_invoicing 167/167; payment_race 0 failed |
| Combined with Release B (trial, `03b3343` + `1e4e640`) | `ZMR-T4-stage1-implementation.md` | Clean merge; 118 migrations; entity 43/43, closed-period 35/35, void-reconcile 36/36, branding 27/27, invoices 167/167. Repeated at finalization (§5). |

## 4. Release prerequisites (all required)
1. **Manage release live and verified**: `9caf8e6` published and confirmed by T2. **T1's mortgage release keeps its own order.** Whichever ships after Stage 1 merges Stage 1, and the reverse.
2. **Owner acceptance** of the Stage 1 screens and invoice PDF (`ZMR-T4-stage1-owner-acceptance.md`).
3. **Owner release approval** for this exact, finalized candidate.
4. **Register entries:** the Stage 1 and owner-only invoicing approvals are recorded only on this branch (recording gap 2). The planning side appends `ZMR-T4-approval-register-addendum.md`, or confirms it.
5. **A production window** recorded in the shared assignments file, with the owner pausing edits.
6. **A fresh verified encrypted backup**, using the fail-closed script that checks reachability first.
7. **Read-only production preflight:**
   - live deploy and commit equal the Manage release;
   - migrations 109;
   - exact-set pending = these 9;
   - the dry run lists only these 9;
   - counts: accounts, properties, llcs, leases, tenants, invoices (with states), payments, documents, Storage objects, audit;
   - none of the 9 migrations' objects exist yet.

## 5. Integration and check plan
Do this once, when the Manage release is confirmed live. Don't rebuild against an earlier hypothetical baseline.

1. **Confirm the baseline:**
   - `git fetch`; local and remote `main` equal the live commit (expected `9caf8e6`);
   - the Netlify published deploy is that commit.
2. **Merge:** a new branch from live `main`, then merge `45d3eb5`.
   - Expected: clean. Stage 1 doesn't touch `src/index.css` (the Manage fix's only file), and it had no file overlap with Release B.
   - Any conflict → stop and report.
3. **Preservation checks:**
   - every file `main` changed since `ba2c9b1` (Release B and the Manage fix) is byte-identical to `main`;
   - every Stage 1 file is byte-identical to `45d3eb5`;
   - the migration directory = production's 109 + these 9;
   - `git ls-files` covers every imported file.
4. **Clean clone** of the merge commit:
   - `npm ci`, `npm run build`, `tsc -b --noEmit`, vitest, oxlint (no new errors);
   - DB suites on fresh local databases: rent_invoicing (with self-test and payment_race), entity_responsibility, closed_period_protection (with concurrency), void_reconcile, entity_branding.
5. **Visual spot check** of the merged build against Practice, only in a newly coordinated window, if the owner wants it:
   - Rent ops issue/reject/cancel, which also observes F-1 on a real backend;
   - the Financials entity field (B);
   - the Manage panel at 390 px.
6. **T3 focused review** of the merge commit: integration only, with no new behaviour. The result is the **exact production candidate hash**.

## 6. Release steps (after approval)
1. Window, pause, backup and preflight (§4, items 5–7). Stop on any difference.
2. **Database:** from the clean clone of the candidate:
   - exact-set check, then `supabase db push --linked --include-all`;
   - post-checks: 118 migrations, nothing pending or remote-only, and the 9 versions' tables, columns, triggers and policies present;
   - `anon` refused on the new tables and RPCs;
   - **no existing row changed:** counts equal the preflight, and existing invoices are readable with defaults;
   - earlier releases' triggers still enabled: R1 void/reconcile, M6 closed-period and same-workspace, B entity, R2 branding, audit.
3. **Frontend:** a fast-forward push of `main` to the candidate.
   - Netlify auto-deploys `main`.
   - Verify the published deploy's commit, and that the live bundle is byte-identical to the clean-clone production build and references production only.
4. **Read-only live check** with the owner's session, nothing saved:
   - Rent ops loads with existing invoices and payments unchanged;
   - Entity › Invoicing and Property › Billing settings show empty, not invented, values;
   - Financials (entity field and filter), the Manage panel and R2 branding still work.
5. **Record:** new baseline = the candidate hash. Tell T1 and T2; the owner resumes editing.
6. **First real invoices are owner-entered:** invoice codes, first numbers (if continuing existing numbering), terms, then draft → approve → issue. No production invoicing data is created by a terminal.

## 7. Rollback (to the immediate prior release)
- **Target:** the Manage-panel release (the deploy and commit recorded when it goes live), not Release B or anything older. It is the only release that preserves everything shipped before Stage 1.
- **Frontend:**
  1. Emergency: republish that Netlify deploy.
  2. Then a normal scoped revert of the Stage 1 merge on `main` (to the same content), so auto-deploy doesn't republish Stage 1.
- **Database:** **no change.** The 9 migrations, and any invoices, numbers, PDFs, rules and terms entered, stay.
  - The prior dashboard works on this database (`old_client.sql`). It simply doesn't show the new invoicing screens.
  - Issued numbers are never reused, and stored PDFs stay protected.
- **Not available:** a database rollback. There are no down scripts by design, because dropping would destroy issued invoice records. Any database defect is fixed forward with a new reviewed migration.

## 8. Owner decisions remaining
1. **Visual and workflow acceptance** of Stage 1 (acceptance file). This includes the gap that hosted screenshots exist at one desktop width only; phone and intermediate evidence is from the local harness.
2. **Release approval** of the finalized candidate (§5, step 6), including the timing relative to T1's mortgage release.
3. Whether to require a **hosted re-check of F-1 and H10** before release. H10 would need a non-owner Practice member, which hasn't been approved (P-TESTID is open).
4. **Register recording** of the Stage 1 and owner-only approvals (prerequisite 4).
5. Separately, not blocking Stage 1: F-2 (collapsed box Edit), F-3 (button labels) and F-4 (issued-table money format).
