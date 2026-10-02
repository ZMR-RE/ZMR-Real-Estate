# Release packet: billing issuer + tenant entry (T4)

**Status: PREPARED. Deployment NOT authorized.** Updated October 2 for the owner-review fixes. Still needed: T3's review of the owner-review delta `3ef4b62..179e56b` and of the recovery correction (`d280c61`, re-pinned here), the owner's visual acceptance of the refreshed review page, and an explicit scoped release approval.

## 1. What ships
| | Hash |
|---|---|
| **Application candidate** | **`179e56b747ef8284cd24af8339a34bb6a3c04470`** (branch `t4/practice-billing-tenant`): the last commit that changes application files |
| **Release candidate (what is pushed)** | the branch tip reported with this packet: `179e56b` plus **docs-only** commits (review page, this packet, recovery scripts). They ship too, so `docs/planning/agents/release/bt-scoped-recovery.sh` is on `main` when §6 needs it. Check at release: `git diff --name-only 179e56b <tip>` lists only `docs/` paths. |
| Superseded candidates | `3ef4b62` (before the owner-review fixes), then `1bdd478`, `7c71776` (intermediate, never handed over for acceptance) |
| Production baseline (`origin/main` re-checked October 2, 02:32 UTC: `d9cdcb3aa4aec84c68c78b183593b2a130ede3d7`) | `d9cdcb3aa4aec84c68c78b183593b2a130ede3d7` (deploy `6abecfa88ba3c700072e1197`, 119 migrations) |
| Billing | `588388f` (T3-cleared), plus owner-review fixes `1f0d41f`, `b98fae0`, `9c36aca` → **`9c36aca`** (fixes: **T3 review pending**) |
| Tenant entry | `2d8aa76` and the F-P1/empty-state delta to `5692647` (**T3-cleared**), plus owner-review fixes `8c3f882`, `04be3e7`, `16a99ed` → **`16a99ed`** (fixes: **T3 review pending**) |
| Dropdown fix (T2) | `999d716238a71c4bd06e9eb5851f62f6535f31b2`, merged unchanged |

- **Frontend only: no migrations** (119 files, the same as live) and no database change. `179e56b` descends directly from `d9cdcb3`, so the push is a fast-forward. 48 application files change (`d9cdcb3..179e56b`).
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
  - **Owner-review fixes (October 2; owner chose "fix now"):**
    - **one Save and one Cancel at a time:** the new-tenant step is its own "New tenant" panel with "Save tenant"/Cancel, and the lease form's Save/Cancel sit together at the end, hidden while that panel is open. Billing's + Add person likewise hides the Billing settings Save/Cancel while open. Both same-name prompts offer "Edit name";
    - a unit with only a future tenancy shows "Upcoming from <date>: <tenants>" and its rent, not "Rent: $0 — Not set up";
    - "Manage tenants in Units ↓" → "Units and lease history ↓";
    - readable payment instructions (full row, normal weight, line breaks kept);
    - shorter explanations (choice, unfinished tenancy, prompts, issuer hints);
    - readable dates: unit cards "December 31, 2026"; Lease history "Dec 31, 2026" with wrapping tenant names, so the table fits its card at desktop width; an open-ended tenancy reads "Ongoing".
  - **Picker menus** are no longer cut off at a box's edge.
  - **CLAUDE.md** notes the owner-approved Tenants "+ Add tenant" exception.

## 2. Evidence: reused from Practice vs changed after
**Hosted Practice test on `3e75bcd`:** PASS (`ZMR-T4-practice-results-billing-tenant.md`, evidence `practice-billing-tenant/`). B1–B5, T1–T7, R1–R3 and D1 at 1280/900/390. Preservation 436/436 unchanged; 34/34 new rows are fixtures; 0 reminders; 0 migrations.

**Changed after hosted testing:** the 6 files of `2d8aa76..5692647` (T3-cleared), then the owner-review fixes `3ef4b62..179e56b`: display, layout and wording only, plus one new UI state flag (`onOpenChange`) that hides the Billing form's Save/Cancel. No query, write path, guard or duplicate check changed. All verified **locally only** (simulated backend, clean-clone build, tests 308 + 1 skipped, targeted browser checks). Not re-run on Practice.

| Area | Hosted evidence (on `3e75bcd`) | Status on `179e56b` |
|---|---|---|
| Billing B1–B5 (+ Add person, bursts, cancel, same name, wording) | PASS | **Reused** for saving, bursts, cancel and same name: billing queries and the Save person guard unchanged. Display, hints, Edit name and the hidden form Save/Cancel changed after (local only). |
| Tenants entry point, co-tenant/separate, resume after reload and Cancel, ended lease, R1–R3 bursts | PASS | **Reused.** Save, guard, choice, resume and query code unchanged; only the form's layout and wording changed after (local only). |
| Dropdown D1 (Tenants + Units, 3 widths) | PASS | **Reused.** CSS and picker unchanged. |
| Same-name prompt (T7 separate-tenancy prompt; F-P1 co-tenant case) | T7 PASS; F-P1 found | **Changed.** Name matching and prompt text now use the full list. Verified **locally only** (simulated backend, 3 new tests, browser checks). T3 review pending. Not re-run on Practice: matching and messaging only, no write-path change. |
| Tenants empty-state text | Old text observed | **Changed** (text only). Verified locally. |
| Owner-review fixes (actions layout, upcoming wording, link text, instructions display, copy, dates) | n/a | **Changed after hosted testing; local only.** Simulated slow-save and link-failure checks: 3× Save tenant → 1 tenant; burst + failure → 1 lease, 0 links; resume Save ×3 → same lease, 1 link; Save person ×3 → 1 person. T3 review pending. |
| Preservation of existing records | PASS | **Reused** (the delta adds no reads or writes). |

## 3. Known items kept out of this release (recorded separately)
1. **Unit status setup:** adding a unit requires a status. An account with an empty unit-status list can't add a unit until an option exists. This was seen on Practice and is not changed here.
2. **Units › Lease history after a partial failure from Tenants:** it shows the unfinished lease only after a reload or remount. No data effect.
3. **Durable fix:** one atomic, idempotent database operation for a lease and its tenants. It needs its own migration review and approval.
4. **Not hosted-checked:** the Rent ops draft blocker wording ("…on their profile"). Drafting was out of the Practice scope; it's covered locally.
5. **Observation (pre-existing, found during the review captures):** between roughly 601 and 1100 px windows, a unit's 7-column Lease history is wider than its card and the right-hand columns are clipped. Desktop `.table-scroll` deliberately has no sideways scroll (the approved sticky-header trade-off). At 900 px: live `d9cdcb3`'s cell text measures 760/801 px in a 420 px card; this candidate 726/684. It improves but doesn't fix it. Needs a global table decision; not changed here.
6. **Observation (pre-existing):** the Tenants box labels a not-yet-started tenancy "Current" (live behaviour), while Units and Lease history say "Upcoming". Not changed here.

## 4. Gates before publication (all required)
1. **T3:** cleared `2d8aa76..5692647` (relayed by planning). **Pending:** the owner-review delta `3ef4b62..179e56b` (tenant `5692647..16a99ed`, billing `588388f..9c36aca`, merges only otherwise) and the recovery correction (`d280c61`, re-pinned to `179e56b` in this update).
2. The owner accepts the visual review: page `docs/planning/agents/owner-review-billing-tenant/index.html`, rebuilt for `179e56b` (light-theme captures in `img/c3/`; the earlier `3ef4b62` images are superseded and not up for acceptance). Visual acceptance is **not** release approval.
3. **Owner's explicit scoped release approval** for exactly the reported release candidate (`179e56b` + docs-only commits).
4. **At release time:**
   - re-check that `origin/main` is still `d9cdcb3` and the live deploy is still `6abecfa8…`. If either moved, **stop**: re-integrate on the actual baseline, re-verify, and send any new delta to T3. Never ship over unreleased work;
   - clean-clone build of exactly the release candidate, and `git diff --name-only 179e56b <candidate>` shows only `docs/`;
   - `git ls-files` covers every import;
   - migrations compared exactly (expected: none pending);
   - **T2 coordination: CONFIRMED** (relayed by planning, October 2). `999d716` ships **only** inside this release, and T2's sticky address follows it. If that sequencing ever changes, re-integrate the candidate on the actual baseline and send the delta back to T3.
   - **Recovery pin:** re-confirm at release that the live deploy is still `6abecfa88ba3c700072e1197`. T4 hasn't read Netlify (no production access in this step), so the deploy id is taken from the Stage 1 release record. If it differs, update §6 before publishing.

## 5. Publication (only after gate 3)
1. Record a production window in the assignments file. There's no database change, so no editing pause or backup is needed for data; note that.
2. Push exactly the release candidate to `main` as a fast-forward from `d9cdcb3`. Never force-push.
3. Wait for Netlify. Confirm that the published deploy's commit is the release candidate and that the built files match the clean-clone build.
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
- **B** = this release's deploy (the release candidate; application content `179e56b`).
- **R** = the recovery deploy built from the scoped recovery commit.

**Never use `git revert -m 1` on the release.** It fast-forwards through a chain of merges. Reverting only the final merge (`179e56b`) undoes 2 of the 48 application files and leaves nearly all of billing, tenant entry and the dropdown fix live (finding R1).

**Database:** this release changes none, so there's nothing to roll back. Tenancies, links, people and issuer choices created after the release are ordinary user data and are kept. The previous dashboard reads them (same schema).

Recovery is **one continuous procedure.** The production window stays held, and no other release proceeds until step 6 passes.

**A. Emergency republish** (only if the live site is broken by B, and only if nothing has shipped on top of B):
1. Republish **G**.
2. Verify: `published_deploy` = G; routes return 200; Property › Overview shows the previous Tenants box (no "+ Add tenant").
3. Record whether auto-publishing is now **locked**. In Netlify, republishing an older deploy locks auto-publishing.

**If a later release shipped on top of B** (for example T2's sticky address), don't republish an older site that would drop newer work. Go straight to B-recovery; G is then that later release's verified deploy.

**B. Scoped application recovery on `main`** (starts immediately after A, or directly):
1. In a clean checkout of current `origin/main`, run `docs/planning/agents/release/bt-scoped-recovery.sh <checkout> --dry-run`, check the plan (48 files), then run it without `--dry-run`. It makes **one** local commit that:
   - restores every application file changed in `d9cdcb3..179e56b` to `d9cdcb3`;
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

**Reintroducing the release afterwards.** Re-merging `179e56b` or any of its branches does **nothing** ("Already up to date").
- On then-current `main`, run **`git revert <recovery commit>`**. That restores exactly the 48 application files to their `179e56b` versions on top of newer work. It conflicts if newer work has since edited those files; resolve that as a reviewed change.
- Then apply the defect fix as a separate commit.
- Then a full clean-clone verification, T3 review and a **new scoped release approval** against the then-live baseline.

**Rehearsed locally against `179e56b`:** `release/bt-recovery-rehearsal.md`, 18/18 PASS (48 files; tests 280+1 after recovery, 308+1 after reintroduction). That covers the R1 gap demonstration, all refusals, the dry run, the scoped recovery with later unrelated work preserved, an application tree equal to base + U, docs/evidence/`supabase`/root `*.md` unchanged, the no-op re-merge, reintroduction by revert, and clean builds with test counts.

**Not rehearsed** (needs production or Netlify): A, the lock and unlock handling, deploy comparison and routes.
