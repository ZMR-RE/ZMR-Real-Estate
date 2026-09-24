# INS-1 — owner review checklist

Version 1.1 · September 24, 2026 (corrected). Covers only the bounded INS-1 slice (Insurance presentation in the real Property Overview). Batch O's other items (O2–O7 — coverage rows, premium basis field, reusable contacts, better upload labels/categories with hosted-limit validation, explicit cancellation/renewal, shared policies) are **not** in this slice — see the roadmap's 9.24 entry for what's queued.

**Correction from v1.0:** v1.0 wrongly implied document upload isn't built for Insurance. It already is — the multi-file input on each policy's Edit form and its save path (`uploadInsurancePolicyDocument`) predate INS-1 and are untouched by it. What's actually true, and what section A.14 below now says: this session never ran that upload against a real Supabase project (only the mock harness, which cannot upload anything by construction), and the hosted per-file size limit is still unverified — see the environment items in the ownership checkpoint (`O1-A-implementation-contract.md` §9.5) for why.

## A — mock harness (fictional data, safe to click freely)

1. In a terminal, `cd` to the project and run `npm run dev:harness`.
2. Open **http://localhost:5180/harness.html** — a dark-blue banner confirms this is the mock harness, not your live dashboard. Nothing here is saved; reloading resets it.
3. Click **Property Overview (Insurance INS-1)**. This is the real Property Overview page (hero, tabs, every box) for a fictional test property.
4. Open the **Insurance** box. You should see 7 fictional policies (`ZMR-TEST-FIXTURE`-prefixed), the first one already expanded.
5. Confirm the top summary line of each policy shows only the facts it actually has (some show a policy #, premium, and payment plan; others show almost nothing) — no blank dashes, no placeholder text.
6. Click **Show details** on a few policies. Confirm the three groups (Policy identification / Coverage & cost / Contacts & extras) sit side by side, and that a group with nothing in it (e.g. "ZMR-TEST-FIXTURE Placeholder Mutual") simply doesn't appear rather than showing an empty box.
7. Find the policy whose badge says **"Within recorded term"** with **"(term ends today)"** — confirm it is NOT also labeled expired or shown in a way that implies coverage lapsed.
8. Find the policy with a **"$0.00 — basis not recorded"** premium — confirm it shows the actual $0.00, not blank (a $0 policy and a policy with no premium on file are different facts).
9. Find the **"Invalid date range"** policy — confirm it clearly reads as a data problem, not one of the four normal term labels.
10. Click **Edit** on any policy. Confirm the same three groups appear side by side in Edit too. Try setting the expiration date before the effective date and Save — confirm it's blocked with a clear message and nothing is lost.
11. Save a real change (e.g. edit the premium) and confirm it shows correctly after Save. Click Cancel on a different policy after changing something and confirm nothing was kept.
12. Click **"+ Add insurance policy"**, save a new one, and confirm it appears as a new 8th policy — none of the existing ones changed.
13. Resize your browser narrow (phone width) and confirm the three groups stack to one column with no sideways scrolling.
14. In Edit mode, confirm the **Documents** group still has its file-input control (this predates INS-1 and is unchanged — INS-1 only moved where Documents sits on the card, not what it can do). The mock harness's upload will fail with a "Mock storage" error if you actually pick a file and Save — that's the harness being unable to reach any real backend by construction, not a defect; don't read anything into it. Separately, note what you do **not** see anywhere: a working "renewal reminder" button or a real change-history timeline — neither is built yet (queued as Batch O6/O7), and that absence is intentional, not a bug.

## B — your real dashboard (after this code is deployed)

Every *view-only* step in A (2, 5–9, 13), repeated against your actual properties and policies, plus:

1. Confirm every existing real policy's data (provider, dates, premium, documents) is exactly what it was before — nothing renamed, reset, or lost.
2. Confirm a real document you already had attached to a policy still opens correctly from the new compact Documents area.
3. Tell us if any of your real policies show a date/status label that looks wrong for what you know about that policy — the labels describe only the dates on file, not a guarantee of actual coverage.
4. **Editing and uploading on real policies is not part of this checklist.** If you want to verify Save/Cancel or a real document upload against a real policy, agree on one specific, low-stakes record with us first (or a disposable test policy created for exactly that purpose) rather than editing values on a real policy ad hoc — an edit changes that record's real data, and an upload against a real backend is untested by this session and depends on the still-unverified hosted per-file size limit.

Section B (steps 1–3) cannot be done until this code is reviewed and deployed — it is not tested yet. Step 4 needs an explicit decision with us regardless of when it's deployed.
