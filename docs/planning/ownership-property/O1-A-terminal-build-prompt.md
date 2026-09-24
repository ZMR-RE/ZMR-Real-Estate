> **BOUNDED CHECKPOINT REACHED — September 24, 2026 (v3.2).** Batch I and revised H7 are approved; this batch was authorized for bounded local implementation per `ZMR-approved-work-terminal-prompt.txt`, `ZMR-ownership-next-increment.txt`, and `ZMR-ownership-closeout-terminal-prompt.txt`. Everything in approved scope that can be built and verified *without* a real Supabase target is now built and verified locally — including, as of v3.2, the I5 Property-information stale-edit guard that v3.1 had wrongly deferred. **Still not deployed, still not verified against any real Supabase project, still not owner-accepted.** The next step is not more code: it is the owner's environment decision (contract §9.5), then integration testing, then Checklist B.

# O1-A — terminal implementation prompt (v3.2, at checkpoint)

This is a **continuation prompt**. Read `O1-A-implementation-contract.md` v3.2 in full first, especially its §0 (what changed and why), §2.8/§4.1 (the stale-edit guard), §9 (verification — read carefully: it distinguishes database-level evidence, seed-fixture vs. fictional-fixture evidence, and browser-harness evidence, none of which is Supabase-integration evidence), §9.5 (the environment assessment and the one decision pending), and §10 (remaining work).

---

## Continue from here

**Before touching anything:** read `CLAUDE.md`, `ZMR-CURRENT-WORK.md`'s latest entries, `ZMR-approval-register.md`'s Batch I section, `ZMR-ownership-next-increment.txt`, and `O1-A-implementation-contract.md` v3.1 in full. Run `git status` and `git log --oneline -10` to confirm nothing material has changed since the contract was written.

**What's done, per the contract:**
- The full ownership/contacts/documents foundation (7 migrations, corrected in this revision for the I1 completeness bug — read §0/§2.3 carefully, since the corrected model requires an explicit `allocation_status` argument that earlier code did not have).
- The full entity profile page (`/entities/:id`): Identity, Contacts, Linked properties, Tax classification + Election history, Membership, Documents (Phase 1), Financial accounts.
- The property-side Ownership box, now with an explicit "mark complete" control.
- The Settings ownership-reassignment bypass closed — `OrganizationTypePropertiesPanel`/`useOrganizationTypeProperties` deleted, `updatePropertyLlc`/`listPropertiesByLlc` removed, `OrganizationTypeList` now embeds the same `EntityLinkedPropertiesPanel` the entity profile uses.
- **The I5 Property-information stale-edit guard** (v3.2): `properties.updated_at` maintained by a new trigger migration (`20260925080000`), `updateProperty` refuses a stale draft at the database boundary, both callers of the save path guarded, draft preserved on conflict with a two-choice notice (keep editing / discard and load latest) and no overwrite path. Verified on scratch Postgres (T1–T7, contract §9.2) and in the mock browser harness (nine-step run, §9.4).
- `npm run build`/`lint`/`test` all clean (20/20 tests).
- Real browser verification via an isolated mock-data harness (`npm run dev:harness`, `http://localhost:5180/harness.html`, now with a third view for the stale-edit guard) — genuine evidence the UI renders and behaves correctly, explicitly **not** Supabase-integration or owner-acceptance evidence (contract §9.4).
- **Owner test checklists written**: `O1-A-owner-test-checklist.md` — Checklist A (mock harness, runnable by the owner today) and Checklist B (real integration acceptance, every step UNTESTED until a target exists).

**What's still not done, in priority order:**

1. **Owner decision on the test environment** (contract §9.5): local Supabase stack via Docker/Colima (recommended) or a second nonproduction Supabase project. Do not install software or create a project without that decision — both are owner actions under the governing instructions.
2. Once a real Supabase target exists: apply all 97 migrations there (`supabase db reset` for a local stack, or `supabase db push` with an explicit non-live project ref — never the live one), re-run every scenario in the contract's §9.2 (including T1–T7) against real Postgres/PostgREST/Auth, run the §2.7 cross-account pre-check, then hand the owner Checklist B.
3. **Hosted upload size limit** — still blocks Phase 2 (batch file upload) only; the CLI cannot read bucket configuration, so this needs whoever has Supabase dashboard access.
4. Owner acceptance: Checklist A now (mock), Checklist B after item 2.

### Explicit exclusions — unchanged

No legal ownership transfer, no percentage used in bookkeeping/tax calculation anywhere, no shared-document splitting, no registry filter/nav changes, no role-based write enforcement, no touching `PropertySpecsSection.tsx`/`UnitsSection.tsx`/`useUnits.ts`/leases/tenants modules, no Quick Capture/Action Queue redesign, no global navigation changes, no work on the parallel Batch E/F/G/H Property-Overview-layout track.

### Live verification — owner-driven, not terminal-driven (unchanged instruction)

The owner enters all normal property/entity/contact/ownership/document data themselves through the dashboard — never through terminal scripts or terminal-created live records. No isolated automated test may write to the live account. The mock-data harness (§9.4) never can, structurally — it has no real Supabase URL or key. When a real nonproduction target exists and the numbered test script is written, do not perform that testing yourself in place of the owner, and do not claim it as done until they've done it.

### Required checks (repeat before every further increment)

`npm run build`, `npm run lint`, `npm run test` must stay clean. Any new migration gets the same treatment as the ones already written: applied and exercised against a real (or real-equivalent) Postgres instance before being described as verified. If a real Supabase target becomes available, re-verify the browser-level flows described in contract §9.4 against it directly, not just the mock harness, before treating them as more than "the code renders correctly in isolation."

### Do not mark complete

- Do not check off any roadmap item until the full Definition of Done criteria in CLAUDE.md are met, including live-dashboard verification by the owner against the real app.
- Do not claim hosted verification, real Supabase integration, or owner acceptance occurred — none of it has, and the mock harness is explicitly not evidence of any of it (say so plainly if asked).
- A short plain-language session close-out summary belongs in `ZMR-CURRENT-WORK.md` at the end of whichever session next advances this batch.
