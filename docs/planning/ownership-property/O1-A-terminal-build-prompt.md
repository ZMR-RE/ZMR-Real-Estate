> **IMPLEMENTATION IN PROGRESS — September 24, 2026.** Batch I and revised H7 are approved (`ZMR-approval-register.md`); this batch is authorized for bounded local implementation per `ZMR-approved-work-terminal-prompt.txt`, superseding the earlier "awaiting review, do not implement" status. The ownership foundation (schema, RPC functions, query layer) is implemented and verified against a local scratch database — see `O1-A-implementation-contract.md` v3.0 §9 for exactly what was and wasn't verified. One UI increment (the property's Ownership box) is wired. **Not yet deployed, not yet shown to the owner in a browser, and not yet complete** — see the checkpoint report in `ZMR-CURRENT-WORK.md` for the current state and remaining items.

# O1-A — terminal implementation prompt (v3, in progress)

This document is now a **continuation prompt** for whoever picks this work up next, not a from-scratch briefing — read `O1-A-implementation-contract.md` v3.0 in full first; it documents what's built, what's verified, and exactly what remains (§10 there).

---

## Continue from here

**Before touching anything:** read `CLAUDE.md`, `ZMR-CURRENT-WORK.md`'s latest entries, `ZMR-approval-register.md`'s Batch I section, and `O1-A-implementation-contract.md` v3.0 in full — especially §9 (verification performed) and §10 (remaining work). Run `git status` and `git log --oneline -10` to confirm nothing material has changed since the contract was written; this is a shared, actively-changing repository.

**What's already done** (contract §1.1/§9): seven migrations (schema, RPC functions, cross-account integrity), the TypeScript query/service layer for ownership interests/contacts/entity documents, one wired UI increment (property Ownership box), and a `vitest` suite (16 tests) for the shared validation/error-interpretation logic. `npm run build`, `npm run lint`, and `npm run test` are all clean.

**What's explicitly not done yet** — pick up in this order, per the contract's §10:

1. **Open a real browser against the new UI.** Nothing in this work has been visually verified — `npm run dev`, navigate to a property profile, and check the new "Ownership" box: empty state (no owner on file), single owner, adding a second owner with a percentage, the 48/52 → 50/50 rebalance, a validation error (percentages summing over 100, or a fully-known set not summing to 100), and the required-reason enforcement. Check light/dark mode and mobile width.
2. **If Docker becomes available**, re-run the migration sequence through `supabase start` / `supabase db reset` (the project's own real toolchain) rather than relying solely on the hand-built scratch-Postgres verification described in the contract's §9.2 — that verification is real and was actually executed, but it approximates the Supabase platform rather than running it.
3. **`OrganizationTypePropertiesPanel`'s reassign control** still calls `updatePropertyLlc` directly — the one remaining bypass of the correction/reason requirement. Replace it with a call into the same `usePropertyOwnershipInterests`-family functions used by the new property-side box (contract §10 item 2).
4. **Confirm whether the pre-existing Property information box's own save should get the same stale-write guard** now built for ownership interests (contract §10 item 1) — a decision to confirm, not assumed either way.
5. **Build the entity profile page** (`/entities/:id`) — Identity, Contacts, Tax classification, Documents, Financial accounts. The query layer for all of these already exists and is verified at the schema/RLS level; none of it has a UI yet.
6. **Entity membership interest UI** — same status as the property-side box, but for `llc_membership_interests`; the query/RPC layer exists, verified, unused by any component yet.
7. **Hosted upload size limit** — still blocking Phase 2 (actual file upload) only; check with whoever has Supabase dashboard/CLI access. Nothing else in this batch is blocked by it.

### Explicit exclusions — unchanged

No legal ownership transfer, no percentage used in bookkeeping/tax calculation anywhere, no shared-document splitting, no registry filter/nav changes, no role-based write enforcement, no touching `PropertySpecsSection.tsx`/`UnitsSection.tsx`/`useUnits.ts`/leases/tenants modules, no Quick Capture/Action Queue redesign, no global navigation changes, no work on the parallel Batch E/F/G/H Property-Overview-layout track.

### Live verification — owner-driven, not terminal-driven (unchanged instruction)

The owner enters all normal property/entity/contact/ownership/document data themselves through the dashboard — never through terminal scripts or terminal-created live records. No isolated automated test may write to the live account (all of this pass's DB-level verification ran against a disposable local database, never the hosted project). When the UI increments above are actually browser-verified and ready, provide the owner a numbered UI test script: setup, exact steps, expected results, and how to safely discard any test data they create — do not perform that testing yourself in place of the owner, and do not claim it as done until they've done it.

### Required checks (repeat before every further increment)

`npm run build`, `npm run lint`, `npm run test` must stay clean. Any new migration gets the same treatment as the ones already written: applied and exercised against a real (or real-equivalent) Postgres instance before being described as verified, not just written and assumed correct.

### Do not mark complete

- Do not check off any roadmap item until the full Definition of Done criteria in CLAUDE.md are met, including live-dashboard verification by the owner.
- Do not claim hosted verification occurred — it hasn't, and this session had no access to perform it.
- Do not claim the entity profile or membership-interest UI exists — they don't yet.
- A short plain-language session close-out summary belongs in `ZMR-CURRENT-WORK.md` at the end of whichever session next advances this, same as every other session on this batch.
