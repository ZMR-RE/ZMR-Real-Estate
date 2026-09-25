# Backlog status matrix — Batches A–S

Prepared per `ZMR-workflow-package-reconciliation.txt` instruction 4.
Status columns: **Approved** (owner sign-off exists) / **Implemented**
(code exists) / **Integration-tested** (verified against a real Supabase
backend, Practice or production) / **Visually approved** (owner has
seen and accepted the actual UI) / **Released** (deployed to production,
port 5173) / **Blocked** (cannot proceed without an owner decision or
external access). A batch can be several of these at once; "—" means
not applicable/not reached yet. Evidence points to file paths and
commits, not to this document's own earlier claims.

| Batch | Approved | Implemented | Integration-tested | Visually approved | Released | Evidence |
|---|---|---|---|---|---|---|
| A — Ownership foundation (reusable person/entity profiles, tax classification, preserve legacy) | Yes | Yes | Yes (Practice; also this session's Batch S re-verification: valid save, stale-write conflict, cross-account isolation) | Partial — owner confirmed Practice banner/Overview structure/rejected the 70%-allocation case; success-path save/document/conflict not yet owner-confirmed (S5 now removes the need for owner to re-run passing engineering checks, so what remains is a preference/workflow look, not re-verification) | No | `7b615e5`,`cb9b988`,`486be47`; `src/modules/llcs/ownershipInterestsQueries.ts`; Practice checklist `ZMR-practice-integration-owner-checklist.md` |
| B — 4-step Add-property flow (Ownership→Basics→Documents→Review→Save) | Yes (4A–4G) | **No** — current Add Property is still one flat form (`PropertyForm.tsx`), not the approved 4-step flow | — | — | No | Gap identified this pass; addressed by Package 1 (`ZMR-package-1-property-creation-contract.md`) |
| C — Acquisition (method/date/price, reusable contacts, closing docs) | Yes | Partial — `purchase_price`/`purchase_date`/`purchase_method` fields exist; acquisition-specific reusable contacts and closing-document grouping not distinctly built | — | — | No | `PropertyForm.tsx`; folded into Package 1 |
| D — Correction-vs-transfer distinction, audit, upload limits/batching | Yes | Correction/audit: Yes (`property_ownership_corrections`, reason-required unified write path). Upload batching (25/batch, 50MiB target): not verified as built | Partial — real upload tested to ~8.8MB only | — | No | `ownershipInterestsQueries.ts`; hosted limit still unverified (dashboard-only) |
| E — Property Overview layout (E1–E7) | Yes | Overview tab exists and ships; exact E1–E7 line-by-line mapping not independently re-checked this pass | Yes (Practice) | Superseded/refined by R below | Overview shipped, but see per-section rows (Insurance, etc.) for what's actually inside it | `PropertyProfileOverviewTab.tsx` |
| F — Visual baseline (retain existing typography/colors/hover) | Yes | N/A — a standing constraint, not a feature. Confirmed honored this session (S4 token/contrast audit found zero drift from `DESIGN-SYSTEM.md`) | — | — | — | S4 audit, this session |
| G — Multiple owners w/ %, entity membership, reusable contacts | G1/G2/G4/G6-G8 Yes; G3 (visual) pending; G5 (Quick Capture entry) explicitly rejected | Yes | Yes (Practice) | G3 still pending | No | `property_ownership_interests`, `llc_membership_interests`, `contacts`/`contact_methods`/`contact_links` |
| H — Hero/layout feedback, no Overview/specialist-tab duplication | H1–H5 Yes; H7 revised | Folded into R's later placement decisions | — | — | — | superseded by R |
| I — Ownership increments (I1 completeness fix, I5 stale-edit guard) | Yes | Yes | Yes — re-verified live this session (two real browser tabs, Batch S) | — | No | `486be47`; roadmap 7.38 addendum |
| J/K/L/M — Capture/Quick-Capture transitions, review workflow, history presentation | Yes (each, in sequence) | **No** — explicitly deprioritized behind ownership/property work for this entire session | — | — | No | `ZMR-capture-history-terminal-handoff.md` (prepared, not dispatched) |
| N — Financial accounts (Overview reference, institution/notes, archive) | Yes (N1–N5) | No | — | — | No | Queued, untouched |
| O — Insurance (O1–O7) | Yes | O1 (=INS-1) Yes; O2–O7 No | O1: Yes (Practice, real upload to ~8.8MB) | O1: partial — spacing bug found and fixed (`d686e73`); full owner visual acceptance not recorded | No | `dff3397`,`3d412d3`,`d686e73`; roadmap 9.24 |
| P — Property tax (P1–P7) | Yes | No | — | — | No | Queued, untouched |
| Q — Market/rent value history | Yes (revised monthly multi-source form) | No | — | — | No | Queued, untouched |
| R — Overview/nav placement consolidation (R1–R5) | Yes | Largely reflected in current Overview/nav structure; not exhaustively re-audited item-by-item this pass | — | — | — | `ZMR-property-destination-map-and-delivery.md` |
| S1 — KPI/Overview tab default | Yes | Yes | Yes (Practice, live) | — | No | commit `972fc41`; roadmap 7.38 addendum |
| S2 — Future real-data owner testing on live | N/A (a future-testing intent, not a build item) | — | — | — | — | — |
| S3 — Grouped wider Property form | Direction Yes; visual implementation explicitly NOT yet approved | Preview only, corrected this pass (all 31 fields present, real form width measured/fixed) | — | **Still pending** — this is the actual visual-approval gate | No | `src/devHarness/PropertyFormGroupedPreview.tsx` |
| S4 — Design evidence | Yes (evidence-gathering only) | N/A | Yes — contrast measured, hover-fill/width selectors identified, PRACTICE-banner sticky-header collision found **and fixed** this pass (`.app-nav`/`.tab-bar`/`thead th`, `index.css`) | — | Fix applied in Practice/dev only, not production | This document's own §S4 fix, live-verified against the real practice tab |
| S5 — Testing-responsibility process rule | Yes | N/A (a process rule) | — | — | — | CLAUDE.md "Testing responsibility" section |
| Option 3 — Connected workflow delivery | Yes, Sept 25, 2026 | N/A (a process rule) | — | — | — | CLAUDE.md "Connected workflow delivery" section |

## Cross-cutting corrections made by this reconciliation pass

- Ownership's "real Supabase integration" gap, reported as open in
  several earlier checkpoints, is **closed** — Practice (built Sept 24,
  exercised repeatedly since, including this session's Batch S) is a
  real, separate Supabase backend, not a mock. Carrying forward "still
  open" language for that specific gap in any future report would be
  stale; only the *owner's own visual/workflow acceptance* and the
  *hosted upload ceiling above ~8.8MB* remain genuinely open.
- Batch B's approved 4-step creation flow was never actually built as a
  distinct flow — the single-form `PropertyForm.tsx` was implemented
  instead and never flagged as a gap against B specifically until this
  pass. This is a missed-existing-instruction, not a new defect;
  addressed by Package 1.
- The Batch-S3 preview's own earlier "every field preserved" claim was
  incomplete (7 fields/widgets missing) and its "wide two-column" claim
  was invalid (the real `<form>` element was still capped at 480px by
  an app-wide rule the preview's outer wrapper didn't override) — both
  corrected this pass; see `PropertyFormGroupedPreview.tsx`'s own
  file-level comment for the exact fix.

## Blockers, consolidated by cause

- **Missing requirement / never-built approved item:** Batch B's 4-step
  flow (addressed by Package 1); Batches J–M, N, P, Q (approved, queued,
  simply not yet started — a sequencing choice, not a defect).
- **Implementation defect (found and fixed this pass):** S3 preview's
  incomplete field list and invalid form-width claim; the PRACTICE
  banner's sticky-header collision (`.app-nav`/`.tab-bar`/`thead th`).
- **Missed existing instruction:** Batch B never implemented as its own
  flow despite explicit approval; the stale "real integration still
  open" language for Ownership.
- **Tooling/environment limitation (reported, not worked around further
  this pass):** hosted per-file upload ceiling above ~8.8MB is only
  visible on the Supabase dashboard, no CLI/API path found; this
  session's browser-resize tool cannot resize the actual OS window
  (confirmed via `window.innerWidth` staying fixed regardless of the
  requested size) — worked around for reflow testing via a same-origin
  iframe pinned to an exact width, and worked around for the
  practice-banner check by measuring the real page's own computed
  styles directly via script rather than resizing.
- **Design/product discovery, not yet a decision:** the Name-vs-address
  identifier conflict and the flat-contact-fields duplication (S3
  preview's own flagged callouts, now also Package 1 §6's owner
  decisions 1–2); the `llc_id` sync rule for 2+ owners (Package 1 §6
  decision 3, a long-open O1-A item this pass proposes closing).

No new global operating rule is proposed for any of the above — each is
addressed at the specification/implementation/test level named above,
per the reconciliation instruction's own guidance not to add a rule for
every bug.
