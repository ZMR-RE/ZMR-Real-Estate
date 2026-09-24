> **IMPLEMENTATION IN PROGRESS — September 24, 2026 (v3.1).** Batch I and revised H7 are approved; this batch is authorized for bounded local implementation per `ZMR-approved-work-terminal-prompt.txt` and `ZMR-ownership-next-increment.txt`. The ownership foundation, the full entity profile UI, and the Settings ownership-reassignment bypass closure are all implemented and verified — both at the database layer (scratch Postgres) and, new in this revision, interactively in a real browser against an isolated mock-data harness. **Still not deployed, and still not verified against any real Supabase project** (nonproduction or otherwise) — see below for exactly why and what's needed.

# O1-A — terminal implementation prompt (v3.1, in progress)

This is a **continuation prompt**. Read `O1-A-implementation-contract.md` v3.1 in full first, especially its §0 (what changed and why), §9 (verification — read carefully: it distinguishes database-level evidence, seed-fixture vs. fictional-fixture evidence, and browser-harness evidence, none of which is Supabase-integration evidence), and §10 (remaining work).

---

## Continue from here

**Before touching anything:** read `CLAUDE.md`, `ZMR-CURRENT-WORK.md`'s latest entries, `ZMR-approval-register.md`'s Batch I section, `ZMR-ownership-next-increment.txt`, and `O1-A-implementation-contract.md` v3.1 in full. Run `git status` and `git log --oneline -10` to confirm nothing material has changed since the contract was written.

**What's done, per the contract:**
- The full ownership/contacts/documents foundation (7 migrations, corrected in this revision for the I1 completeness bug — read §0/§2.3 carefully, since the corrected model requires an explicit `allocation_status` argument that earlier code did not have).
- The full entity profile page (`/entities/:id`): Identity, Contacts, Linked properties, Tax classification + Election history, Membership, Documents (Phase 1), Financial accounts.
- The property-side Ownership box, now with an explicit "mark complete" control.
- The Settings ownership-reassignment bypass closed — `OrganizationTypePropertiesPanel`/`useOrganizationTypeProperties` deleted, `updatePropertyLlc`/`listPropertiesByLlc` removed, `OrganizationTypeList` now embeds the same `EntityLinkedPropertiesPanel` the entity profile uses.
- `npm run build`/`lint`/`test` all clean (20/20 tests).
- Real browser verification via an isolated mock-data harness (`npm run dev:harness`, `http://localhost:5180/harness.html`) — genuine evidence the UI renders and behaves correctly, explicitly **not** Supabase-integration or owner-acceptance evidence (contract §9.4).

**What's still not done, in priority order:**

1. **Get real Supabase integration testing running.** No Docker/Colima is available in this environment, and this Supabase org has exactly one project — the live one. Two options, both requiring the owner's action (see "Environment action needed" below): (a) the owner installs Docker or Colima so `supabase start` can run this project's actual local stack, or (b) the owner creates a second, dedicated nonproduction Supabase project. Do not attempt either yourself without the owner's explicit go-ahead — installing platform software and creating external projects are both actions CLAUDE.md/the governing instructions reserve for the owner.
2. Once a real Supabase target exists: apply the 7 migrations there (`supabase db reset` for a local stack, or `supabase db push` against a real nonproduction project — never the live one), re-run every scenario in the contract's §9.2 against real Postgres/PostgREST/Auth, and run the §2.7 cross-account pre-check against a copy of real data if testing against anything derived from production.
3. **Confirm whether the pre-existing Property information box's own save should get the same stale-write guard** now built for ownership interests (contract §10 item 1).
4. **Hosted upload size limit** — still blocks Phase 2 (batch file upload) only; check with whoever has Supabase dashboard access.
5. Once 1–2 are done, write the **numbered owner UI test script** the earlier version of this prompt asked for — not written yet, since a script tested only against the mock harness would describe mock behavior, not the owner's real app.

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
