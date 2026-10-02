# Release packet: billing issuer + tenant entry (T4)

**Status: PREPARED. Deployment NOT authorized.** This needs T3's clearance of the F-P1 delta, the owner's visual acceptance and an explicit scoped release approval.

## 1. What ships
| | Hash |
|---|---|
| **Release candidate** | **`3ef4b6273ec0457a90082a3069aa38520c353187`** (branch `t4/practice-billing-tenant`) |
| Production baseline (`origin/main` re-checked October 2, 02:32 UTC: `d9cdcb3aa4aec84c68c78b183593b2a130ede3d7`) | `d9cdcb3aa4aec84c68c78b183593b2a130ede3d7` (deploy `6abecfa88ba3c700072e1197`, 119 migrations) |
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
2. The owner accepts the visual review: page `docs/planning/agents/owner-review-billing-tenant/index.html` (12 numbered items with screenshots from `3ef4b62`; supersedes the earlier markdown list). Visual acceptance is **not** release approval.
3. **Owner's explicit scoped release approval** for exactly `3ef4b62`.
4. **At release time:**
   - re-check that `origin/main` is still `d9cdcb3` and the live deploy is still `6abecfa8…`. If either moved, **stop**: re-integrate on the actual baseline, re-verify, and send any new delta to T3. Never ship over unreleased work;
   - clean-clone build of exactly `3ef4b62`;
   - `git ls-files` covers every import;
   - migrations compared exactly (expected: none pending);
   - **T2 coordination: CONFIRMED** (relayed by planning, October 2). `999d716` ships **only** inside this release, and T2's sticky address follows it. If that sequencing ever changes, re-integrate `3ef4b62` on the actual baseline and send the delta back to T3.
   - **Recovery pin:** re-confirm at release that the live deploy is still `6abecfa88ba3c700072e1197`. T4 hasn't read Netlify (no production access in this step), so the deploy id is taken from the Stage 1 release record. If it differs, update §6 before publishing.

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

## 6. Recovery (frontend only; finding R1 fixed)
**Names:**
- **G** = the last verified good deploy before this release: `6abecfa88ba3c700072e1197` (`d9cdcb3`). Re-confirm at release (§4).
- **B** = this release's deploy (`3ef4b62`).
- **R** = the recovery deploy built from the scoped recovery commit.

**Never use `git revert -m 1 3ef4b62`.** This release fast-forwards through five merges. Reverting only the final merge undoes 6 of the 44 application files and leaves billing, most of tenant entry and the dropdown fix live (finding R1).

**Database:** this release changes none, so there's nothing to roll back. Tenancies, links, people and issuer choices created after the release are ordinary user data and are kept. The previous dashboard reads them (same schema).

Recovery is **one continuous procedure.** The production window stays held, and no other release proceeds until step 6 passes.

**A. Emergency republish** (only if the live site is broken by B, and only if nothing has shipped on top of B):
1. Republish **G**.
2. Verify: `published_deploy` = G; routes return 200; Property › Overview shows the previous Tenants box (no "+ Add tenant").
3. Record whether auto-publishing is now **locked**. In Netlify, republishing an older deploy locks auto-publishing.

**If a later release shipped on top of B** (for example T2's sticky address), don't republish an older site that would drop newer work. Go straight to B-recovery; G is then that later release's verified deploy.

**B. Scoped application recovery on `main`** (starts immediately after A, or directly):
1. In a clean checkout of current `origin/main`, run `docs/planning/agents/release/bt-scoped-recovery.sh <checkout> --dry-run`, check the plan (44 files), then run it without `--dry-run`. It makes **one** local commit that:
   - restores every application file changed in `d9cdcb3..3ef4b62` to `d9cdcb3`;
   - keeps `docs/**`, root `*.md` and `supabase/**`;
   - leaves newer unrelated work untouched.

   **If it refuses:**
   - **dirty tree, or release not in history:** fix the checkout and rerun;
   - **a later commit touched a release file (exit 3):** **stop**. Don't widen the scope or force it. Fix forward with a narrowly scoped change, reviewed by T3, and keep G live meanwhile;
   - **verification mismatch (exit 4):** nothing was committed. Stop and report.
2. **Prove the commit before pushing:**
   - `git diff --name-only HEAD~1 HEAD` lists only release application files, nothing under `docs/` or `supabase/`;
   - each listed file equals `d9cdcb3`, or is absent;
   - the application tree equals `d9cdcb3` plus any newer unrelated work (`bt-recovery-rehearsal.sh` shows the method);
   - a clean clone builds, and its tests equal live's set plus any newer work's.
3. **Name G and record the lock state** (locked after A, or unlocked). Push normally: `git push origin <recovery_sha>:refs/heads/main`, a fast-forward, **never forced**. Netlify builds **R**.
4. **Checks on R** (wait for `ready`, with `commit_ref` = the recovery commit):
   - **no later release:** R's files are identical to G's;
   - **later work exists:** R is byte-identical to a clean-clone production build of the recovery commit, and differs from the latest deploy only by this release's bundle changes;
   - routes return 200;
   - Tenants shows no "+ Add tenant", and Billing settings shows the previous issuer field.
5. **Publication: locked and unlocked are different paths**, each used only as authorized:
   - **Unlocked:** R publishes automatically, so the checks in step 4 run on the live site.
     - **Any check fails:** immediately republish G, verify `published_deploy` = G, record the lock this creates, stop all pushes to `main`, keep the window held and report.
     - **All pass:** go to step 6.
   - **Locked:** R builds but doesn't publish. Run step 4 on R's permalink (`https://<R>--zmr-real-estate.netlify.app`).
     - **Any check fails:** R stays unpublished, G stays live, and the lock and window stay held. Stop and report.
     - **All pass:** publish R, then **unlock auto-publishing**. Never unlock before R has passed.
6. **Verify:** `published_deploy` = R with `commit_ref` = the recovery commit; auto-publishing unlocked; routes return 200.
7. **Record and hand back:** the incident, G, R, the recovery commit and the lock handling, in the assignments file. Close the window, tell T1, T2 and T3, and reopen the release as a defect to fix forward.

**Reintroducing the release afterwards.** Re-merging `3ef4b62` or any of its branches does **nothing** ("Already up to date").
- On then-current `main`, run **`git revert <recovery commit>`**. That restores exactly the 44 application files to their `3ef4b62` versions on top of newer work. It conflicts if newer work has since edited those files; resolve that as a reviewed change.
- Then apply the defect fix as a separate commit.
- Then a full clean-clone verification, T3 review and a **new scoped release approval** against the then-live baseline.

**Rehearsed locally:** `release/bt-recovery-rehearsal.md`, 18/18 PASS. That covers the R1 gap demonstration, all refusals, the dry run, the scoped recovery with later unrelated work preserved, an application tree equal to base + U, docs/evidence/`supabase`/root `*.md` unchanged, the no-op re-merge, reintroduction by revert, and clean builds with test counts.

**Not rehearsed** (needs production or Netlify): A, the lock and unlock handling, deploy comparison and routes.
