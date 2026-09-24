# INS-1 — owner review checklist

Version 1.0 · September 24, 2026. Covers only the bounded INS-1 slice (Insurance presentation in the real Property Overview). Batch O's other items (O2–O7 — coverage rows, premium basis field, reusable contacts, file upload, cancellation/renewal, shared policies) are **not** in this slice — see the roadmap's 9.24 entry for what's queued.

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
14. Note what you do **not** see: a working "renewal reminder" button, a real change-history timeline, or a file-upload control for documents on this screen. All three say plainly that they're not built yet — that's expected for this slice, not a bug.

## B — your real dashboard (after this code is deployed)

Every step in A, repeated against your actual properties and policies, plus:

1. Confirm every existing real policy's data (provider, dates, premium, documents) is exactly what it was before — nothing renamed, reset, or lost.
2. Confirm a real document you already had attached to a policy still opens correctly from the new compact Documents area.
3. Tell us if any of your real policies show a date/status label that looks wrong for what you know about that policy — the labels describe only the dates on file, not a guarantee of actual coverage.

Section B cannot be done until this code is reviewed and deployed — it is not tested yet.
