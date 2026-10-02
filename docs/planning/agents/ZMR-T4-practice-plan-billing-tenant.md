# Billing + tenant entry: hosted Practice test plan (T4)

**Status: PREPARED, NOT RUN.** Nothing has been written to Practice. No window has been claimed, no migration applied, no account or membership changed, and nothing deployed.

## 0. What is tested

| | Hash | Notes |
|---|---|---|
| **Test build** | **`3a7534012e69b242856e42a11dc60c7f775f874e`** | branch `t4/practice-billing-tenant`; a test build only, never a deployment candidate |
| Base: live production | `d9cdcb3aa4aec84c68c78b183593b2a130ede3d7` | 119 migrations |
| Billing candidate | `588388f4b6ad5ee1588d02821f6875d84fa0b323` | merged as-is |
| Tenant candidate | `d4dc66477f3a1bf1f5ea14293588cb089b23629d` | merged as-is |
| T2 dropdown fix | `999d716238a71c4bd06e9eb5851f62f6535f31b2` | merged as-is (a merge, not a cherry-pick, so the exact commit is in the history) |

- **Integration conflicts resolved:** one, in a harness-only file (`src/modules/rentInvoices/review/reviewSupabaseClient.ts`, not in the app bundle). Both candidates added insert defaults for the simulated backend; both were kept. Nothing else conflicted.
- **Migrations:** none added; the build has the same 119 files as live.
- **Local verification of `3a75340`** (clean clone):
  - type-check (`tsc -b --noEmit`) clean;
  - `npm run build` OK;
  - vitest 295 passed, 1 skipped;
  - oxlint 83 warnings, unchanged from baseline.
- **Smoke test** on the review page with the simulated backend, fictional data, 1280px:
  - **Billing:** + Add person passes the three-Enter burst (1 record), and "Quinn Fictional · Person" is chosen and saved.
  - **Tenants:** "+ Add tenant" sits beside Edit, and the co-tenant/separate choice appears.
  - **Dropdown:** the box shows the whole menu (overflow `visible`), and "+ Add new tenant" is clickable (it's the element under its own center point).

### Known defect found while preparing (affects the pinned tenant code)

**Repeated Save on the lease form creates duplicate tenancies.** On `3a75340`, using the review page with the simulated backend, three Save clicks in one burst on a new separate tenancy at $777 created **three leases**. The rent would then be counted three times.

- **Cause:** `LeaseForm`'s Save is guarded only by `disabled={saving}`. That's React state, so it updates too late to stop clicks in the same burst.
- **Same pattern, not reproduced:** `handleCreateTenant` (the inline new tenant) uses that same state-only guard, so I expect it to behave the same.
- **Units path:** the d9cdcb3 lease form behind Units › "+ Add lease" had the same state-only Save guard (not re-run here), so the defect likely predates this candidate.
- **Billing is not affected:** Save person is already guarded in `588388f`.

**Recommendation:** fix this in the tenant candidate first, with the same in-flight guard as Save person, then send the delta to T3 and rebuild the test build. Run the Practice window on the fixed build, not on `3a75340`. Check R2 below is expected to **fail** on `3a75340`.

## 1. Coordination: one window, one sign-in
- **Practice holder:** T1 ended its window at 23:27 UTC. T1 applied `20261004100000` (mortgage balance integrity), so Practice should be at 120. **No holder is assumed.** T4 asks, via the owner or planning, for one written line: *"T4 holds Practice from <time>; no other terminal writes to Practice until T4's handback."* Without it, T4 does nothing, not even a read-only listing.
- **One window**, about 75 minutes (§7). No fixes are made during the window. A failure stops the window: record it, clean up, report.
- **Handback line:** *"Practice returned, <time>"*, with results, residue ids and the unchanged migration list.

## 2. Access and identity
- **Dashboard:** T4's scratch clone at exactly `BT_BUILD`, run with `npx vite --config vite.practice.config.ts --port 5191`.
  - That config reads only `envs/practice`, and `supabaseClient` refuses production's ref.
  - Never port 5190 (T1's). A real browser.
- **Identity:** the Practice test login `zmr-test-practice@example.test` (owner role in the Practice test account).
  - **The owner types its password once**, at the start. It's the only owner action needed.
  - All checks, including billing, run in that one session.
  - **No account or membership is created or changed.**
  - T4 signs out at the end.
- **Database reads:** `docs/planning/agents/practice/btpractice.sh`, which is **read-only**:
  - `ledger` reads the migration list;
  - `select` runs one SELECT/WITH statement;
  - it has no push, apply or write mode.
  - It refuses unless the clone is linked to Practice's ref (never production's) and is at exactly `BT_BUILD`. No database password is handled.
  - **Offline tests (done):**
    - the expected Practice state (119 + `20261004100000`) gives build-not-applied **none** and Practice-only `20261004100000`;
    - Practice missing a build migration → STOP;
    - wrong hash, a write statement, or an unlinked clone → refused.
- **Start of window:** `ledger` must show build-not-applied = **none**.
  - **Practice-only versions** are listed and assessed, never touched. `20261004100000` is expected; T1's hosted O1–O4 checks covered older pages against it.
  - **Anything unexpected → STOP** and report.

## 3. Existing-data preservation
**Baseline (read-only, before any write):** counts and the latest `updated_at`/`created_at` for:
- `llcs`, `ownership_interests`, `properties`, `units`, `leases`, `lease_tenants`, `tenants`;
- `invoices`, `payments`, `documents`, `financial_transactions`, `financial_periods`, `audit_log`, `account_members`.

Also recorded:
- the ids of every pre-existing `ZMR-TEST-S1` and mortgage-test record;
- for each pre-existing lease: rent, end date and tenant links.

**After cleanup:**
- every count equals the baseline plus only the listed `ZMR-TEST-BT` additions;
- no pre-existing row's timestamp has moved;
- pre-existing leases' rent and links are unchanged, checked one by one, not by count;
- `account_members` is unchanged.

## 4. Fictional records
All are created through the dashboard and named `ZMR-TEST-BT`.

| # | What | Values |
|---|---|---|
| P1 | Property (Add property wizard) | `1 ZMR-TEST-BT Tenancy Check Way`, Testville; new owner `ZMR-TEST-BT Owner LLC` 100% |
| P2 | Units | `Unit 1`, `Unit 2` |
| T-A, T-B | Tenants (created inside the flows) | `ZMR-TEST-BT Tenant A` (`zmr-test-bt-a@example.test`), `ZMR-TEST-BT Tenant B` (`zmr-test-bt-b@example.test`) |
| T-S1, T-S2 | Same-name pair | `ZMR-TEST-BT Same Name` with `zmr-test-bt-s1@example.test`; `zmr-test-bt same  name` with `zmr-test-bt-s2@example.test` |
| I1 | Person issuer (+ Add person) | `ZMR-TEST-BT Issuer Person` |

## 5. Checks
**Labels:**
- **[REAL]**: an outcome of the real hosted app and database.
- **[SIMULATED]**: a deliberately injected failure. T4 wraps `window.fetch` from the page console to fail **one** matching request once, then restores it; the page's code is never edited. What actually committed is then read with read-only SQL and reported as [REAL].
- **[INPUT BURST]**: repeated Enter or clicks fired in one burst from the console. The outcome is [REAL].

### Billing (P1 › Overview › Billing settings)
| # | Check | Expected |
|---|---|---|
| B1 | **[REAL]** Edit › + Add person `ZMR-TEST-BT Issuer Person` › Save person › Billing Save | View: "Invoice issuer ZMR-TEST-BT Issuer Person · Person" and the "no invoice code yet" note. SQL: one `llcs` row, `owner_kind = 'individual'`, **zero** `ownership_interests` for it; P1's ownership unchanged. |
| B2 | **[INPUT BURST]** + Add person `ZMR-TEST-BT Burst Person`: three Enter, then (new name `ZMR-TEST-BT Click Person`) three Save person clicks | SQL: exactly **1** row each. |
| B3 | **[REAL]** Hint and cancel: + Add person `ZMR-TEST-BT Cancel Person` › Save person › **Cancel** Billing settings | The hint reads "…saved right away — they stay in your records even if you then cancel Billing settings." SQL: the person exists; P1's `billing_entity_id` is still I1. |
| B4 | **[REAL]** Same name: `zmr-test-bt  issuer person` | The prompt offers "Use existing: ZMR-TEST-BT Issuer Person — person"; "Add a different person" leaves 2 rows. |
| B5 | **[REAL]** Wording | Rent ops review blocker for I1: "…add one on their profile (Invoicing)"; Branding & documents: "Open their profile". No invoice is drafted or issued. |

### Tenant entry (P1)
| # | Check | Expected |
|---|---|---|
| T1 | **[REAL]** Entry point | "+ Add tenant" sits beside Edit on the collapsed Tenants box and opens it straight into the form; Edit opens the same form; Cancel returns to the view. |
| T2 | **[REAL]** New tenancy, Unit 1: new T-A, $1,000, from 2026-11-01 | SQL: +1 lease and +1 link. The Tenants list and the Units box both refresh, and the "Tenancy & billing" link opens T-A. |
| T3 | **[REAL]** Co-tenant, Unit 1 › "Add co-tenant", new T-B | The choice is shown, and T-A isn't offered. SQL: **no** new lease; +1 link to T-A's lease; rent still $1,000. |
| T4 | **[SIMULATED → REAL]** Separate tenancy, Unit 1, T-B, $500; fail the next `POST /rest/v1/lease_tenants` | The partial-failure message appears. SQL [REAL]: a $500 lease with **0** links. **Reload [REAL]** → + Add tenant › Unit 1 offers "Unfinished tenancy … ID …, rent $500.00". Resume, pick T-B, Save. SQL: still one $500 lease, 1 link, no extra lease. |
| T5 | **[SIMULATED → REAL]** Units › Unit 2 › + Add lease: the same choice step | Unit 2 is empty, so this is a plain new tenancy: T-A at $700 with one failed link. **Cancel** → "+ Add lease" offers the unfinished tenancy → Resume → Save. SQL: one $700 lease, 1 link. Then "+ Add lease" again shows the co-tenant/separate choice → "Add co-tenant" with T-B → SQL: no new lease, rent still $700. |
| T6 | **[SIMULATED → REAL]** Ended lease with no tenants: Unit 2 separate tenancy 2025-01-01 to 2025-06-30, $1, with one failed link | SQL: an ended lease with 0 links. + Add tenant and + Add lease on Unit 2 show **no** "Unfinished tenancy" and no "rent twice" text. Lease history lists it as Ended. Then **Archive** it (cleanup). |
| T7 | **[REAL]** Same name: + Add new tenant `zmr-test-bt same  name` (`…s2…`) after T-S1 exists | The prompt shows "Use existing: ZMR-TEST-BT Same Name — zmr-test-bt-s1@example.test · added …" and "You entered: zmr-test-bt-s2@example.test". "Create a different person" leaves 2 rows, and the picker labels both with their details. Then Cancel the lease form. |
| R1 | **[INPUT BURST]** Save person (B2) | 1 row each, as above. |
| R2 | **[INPUT BURST]** Lease Save: a separate tenancy on Unit 1 with T-S1 at $10, three Save clicks | **Expected to FAIL on `3a75340`** (see §0: 3 leases). On a fixed build: exactly 1. Any extra leases are archived and listed as residue. |
| R3 | **[INPUT BURST]** "Add co-tenant" Save with T-S2, clicked three times | SQL: 1 link. A unique-constraint message, if one appears, is recorded as is. |

### Dropdown (999d716 in the hosted build)
| # | Check | Expected |
|---|---|---|
| D1 | **[REAL]** The Tenants form (T4's state) and the Units form (T5's state), with the empty tenant picker opened by a real click, at **1280, 900 and 390** | The whole menu shows past the box edge; "+ Add new tenant" is the element under its own center point; a real click opens the new-tenant form; the box below doesn't toggle; no horizontal scroll; the sticky tab bar stays pinned; the box clips again once the menu closes. 900 and 390 are checked in same-origin frames of exactly that width, as in the local evidence. |

**Recorded for every check:** pass/fail, the exact error text, SQL before/after, and screenshots. Screenshots go to `docs/planning/agents/evidence/practice-billing-tenant/`, a new folder; earlier evidence is never overwritten.

## 6. Cleanup and residue
- **Archive:**
  - every `ZMR-TEST-BT` lease, through Lease history › Archive;
  - P1's units, then P1 (set Inactive/archive as the app allows);
  - each `ZMR-TEST-BT` person/owner record that the app can archive.
- **Not deleted (no hard delete), reported with ids:**
  - tenants T-A, T-B, T-S1, T-S2;
  - the `llcs` rows I1, Burst, Click, Cancel and the second same-name person;
  - `ZMR-TEST-BT Owner LLC`;
  - the archived leases and their links.
- **Confirmed when:**
  - §3 holds;
  - each `ZMR-TEST-BT` row is enumerated individually;
  - the test login is signed out;
  - the scratch clone's Practice link has been removed (the runner then refuses);
  - the handback line is sent.

## 7. Window estimate
About 75 minutes: ledger and baseline 10, records 10, billing 15, tenant and resume 25, dropdown 10, cleanup and verification 15.

## 8. Approval requested (scope)
**Yes authorizes:** one Practice window, coordinated as in §1, on the **fixed** test build (`3a75340` rebuilt with the repeated-Save guard, after T3's delta review). It includes:
- one owner sign-in for `zmr-test-practice@example.test`;
- `ZMR-TEST-BT` dashboard writes in the Practice test account only;
- read-only SQL;
- archive-only cleanup.

**Not included:** migrations, account or membership changes, production, deployment, invoice issuing, sending or scheduling.
