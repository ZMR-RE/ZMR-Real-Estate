# Release packet: billing issuer + tenant entry (T4)

**Status: PREPARED. Deployment NOT authorized.** This needs T3's clearance of the F-P1 delta, the owner's visual acceptance and an explicit scoped release approval.

## 1. What ships
| | Hash |
|---|---|
| **Release candidate** | **`3ef4b6273ec0457a90082a3069aa38520c353187`** (branch `t4/practice-billing-tenant`) |
| Production baseline (checked October 2; `origin/main`) | `d9cdcb3aa4aec84c68c78b183593b2a130ede3d7` (deploy `6abecfa88ba3c700072e1197`, 119 migrations) |
| Billing | `588388f4b6ad5ee1588d02821f6875d84fa0b323` (T3-cleared) |
| Tenant entry | `5692647a26c08fb9150095f0d2abdd7ecdd51e47`: T3-cleared `2d8aa76` plus the F-P1/empty-state delta (**T3 review pending**) |
| Dropdown fix (T2) | `999d716238a71c4bd06e9eb5851f62f6535f31b2`, merged unchanged |

- **Frontend only: no migrations** (119 files, the same as live) and no database change. `3ef4b62` descends directly from `d9cdcb3`, so the push is a fast-forward.
- **Owner-facing changes:**
  - **Billing settings:** "Invoice issuer (person or business)". Saved property instructions show even with no issuer. "+ Add person" creates an Individual issuer with no ownership; same names are offered, never forced; repeat clicks and Enter are ignored. The hint says the person is saved right away.
  - **Wording:** issuer screens say "their profile" and "issuer", not "entity".
  - **Property › Overview › Tenants:**
    - "+ Add tenant" beside Edit;
    - choose the unit; if it has a tenancy, choose "co-tenant (shares its rent)" or "separate tenancy (own rent)";
    - an unfinished tenancy is offered for resume by ID;
    - same-name people show their details;
    - one save per click burst.
  - **Units › "+ Add lease"** asks the same questions.
  - **Picker menus** are no longer cut off at a box's edge.
  - **CLAUDE.md** notes the owner-approved Tenants "+ Add tenant" exception.

## 2. Evidence: reused from Practice vs changed after
**Hosted Practice test on `3e75bcd`:** PASS (`ZMR-T4-practice-results-billing-tenant.md`, evidence `practice-billing-tenant/`). B1–B5, T1–T7, R1–R3 and D1 at 1280/900/390. Preservation 436/436 unchanged; 34/34 new rows are fixtures; 0 reminders; 0 migrations.

**Changed after hosted testing:** only the 6 files of `2d8aa76..5692647`.

| Area | Hosted evidence (on `3e75bcd`) | Status on `3ef4b62` |
|---|---|---|
| Billing B1–B5 (+ Add person, bursts, cancel, same name, wording) | PASS | **Reused.** Billing code unchanged. |
| Tenants entry point, co-tenant/separate, resume after reload and Cancel, ended lease, R1–R3 bursts | PASS | **Reused.** Save, guard, choice, resume and query code unchanged. |
| Dropdown D1 (Tenants + Units, 3 widths) | PASS | **Reused.** CSS and picker unchanged. |
| Same-name prompt (T7 separate-tenancy prompt; F-P1 co-tenant case) | T7 PASS; F-P1 found | **Changed.** Name matching and prompt text now use the full list. Verified **locally only** (simulated backend, 3 new tests, browser checks). T3 review pending. Not re-run on Practice: matching and messaging only, no write-path change. |
| Tenants empty-state text | Old text observed | **Changed** (text only). Verified locally. |
| Preservation of existing records | PASS | **Reused** (the delta adds no reads or writes). |

## 3. Known items kept out of this release (recorded separately)
1. **Unit status setup:** adding a unit requires a status. An account with an empty unit-status list can't add a unit until an option exists. This was seen on Practice and is not changed here.
2. **Units › Lease history after a partial failure from Tenants:** it shows the unfinished lease only after a reload or remount. No data effect.
3. **Durable fix:** one atomic, idempotent database operation for a lease and its tenants. It needs its own migration review and approval.
4. **Not hosted-checked:** the Rent ops draft blocker wording ("…on their profile"). Drafting was out of the Practice scope; it's covered locally.

## 4. Gates before publication (all required)
1. T3 clears `2d8aa76..5692647` (and confirms `3ef4b62` = `3e75bcd` + that delta + docs).
2. The owner accepts the visual review (`ZMR-T4-owner-visual-review-billing-tenant.md`).
3. **Owner's explicit scoped release approval** for exactly `3ef4b62`.
4. **At release time:**
   - re-check that `origin/main` is still `d9cdcb3` and the live deploy is still `6abecfa8…`. If either moved, **stop**: re-integrate on the actual baseline, re-verify, and send any new delta to T3. Never ship over unreleased work;
   - clean-clone build of exactly `3ef4b62`;
   - `git ls-files` covers every import;
   - migrations compared exactly (expected: none pending);
   - **T2 coordination:** `999d716` ships here. Confirm with T2 via planning that it's not also being released separately, and that T2's sticky candidate `059764d` is sequenced after this release, or re-integrated if it ships first.

## 5. Publication (only after gate 3)
1. Record a production window in the assignments file. There's no database change, so no editing pause or backup is needed for data; note that.
2. Push exactly `3ef4b62` to `main` as a fast-forward from `d9cdcb3`. Never force-push.
3. Wait for Netlify. Confirm that the published deploy's commit is `3ef4b62` and that the built files match the clean-clone build.
4. **Live read-only visual check**, with **no saving**. Use the reserved identity `zmr-test-verification@myearthmarket.com` if it has a documented sign-in handoff; otherwise the owner checks it, and it's recorded as "live visual check outstanding". Check:
   - Property › Overview: Tenants "+ Add tenant" beside Edit, and the empty or existing list;
   - Billing settings: "Invoice issuer (person or business)" and the "+ Add person" button (open the step, then Cancel);
   - Units › Edit › "+ Add lease": the choice step, then Cancel;
   - a picker menu fully visible at desktop and phone widths.

   **Before opening any property page or the Action Queue,** run the read-only reminder pre-check (`ZMR-T4-practice-plan-billing-tenant.md` §T3 warning). Property KPI and Units pages run the account-wide renewal-reminder backfill, and that's a production write.
5. Record the release (hashes, deploy id, checks) and its status: released; live visual check done or outstanding.

## 6. Recovery (frontend only)
- **Rollback target:** the immediate prior verified deploy, `6abecfa88ba3c700072e1197` (`d9cdcb3`). Republishing it is emergency recovery only.
- **Follow-up:** a scoped `git revert -m 1` of this release on `main`, so a later push can't reintroduce it. Preserve unrelated later commits; never force-push.
- **Data:** no database change to roll back. Tenancies and people created after release are ordinary user data and are kept.
