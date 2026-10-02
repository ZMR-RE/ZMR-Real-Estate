# Billing + tenant entry: hosted Practice results (T4)

**Build tested:** exactly `3e75bcd72bd8bb944c7c5095b7c0296b14badae5`. It's live `d9cdcb3` plus billing `588388f`, tenant `2d8aa76` (T3-cleared) and T2 dropdown `999d716`, with no migrations. It ran from a scratch clone on port 5191, against Practice (`gxgv…`), never production (`jsro…`).

- **Window:** 01:46–02:09 UTC, October 2, 2026. Holder verified and recorded in the assignments file: no Practice holder since T1's 23:27 UTC handback; T1's 01:35 window was production maintenance, unrelated. Handback recorded.
- **Identity:** `zmr-test-practice@example.test` (owner, the only member of Practice account `2cc7edbb…`). The owner typed the password once. No account or membership was created or changed. Signed out at the end; no auth token remains.
- **Ledger** (read-only): 120 applied; build-not-applied **none**; Practice-only `20261004100000` (T1 mortgage, expected). **No migration was applied.**
- **Reminder precheck** (T3's warning, read-only): the account has **0** non-archived leases ending between today−1 and today+61 (UTC), so the account-wide renewal backfill (run from the property KPI tab and Units) had no existing lease to write for. The Action Queue page was not opened. Preservation stayed strict: **0** new `action_items` rows.

**Labels:**
- **[REAL]**: an outcome of the hosted app and database.
- **[SIMULATED]**: a one-time `window.fetch` wrapper returned 503 for the next `POST /rest/v1/lease_tenants` and was then restored. Request times: 01:59:12, 02:00:15, 02:02:02 UTC.
- **[INPUT BURST]**: repeated clicks or Enter dispatched in one burst; the outcome is [REAL].

All counts are from read-only SQL.

## Overall
**PASS.** All planned checks passed, with the deviations noted below. Preservation passed: **436/436** existing rows unchanged; 34 new rows, all identified `ZMR-TEST-BT` fixtures, **0 unexplained**.

## Results
| # | Result | Evidence |
|---|---|---|
| Fixtures | **[REAL]** | P1 `1 ZMR-TEST-BT Tenancy Check Way`, Testville (`227e42b7…`), via the wizard, with new owner `ZMR-TEST-BT Owner LLC` 100%, allocation complete. The wizard created `Unit 1`. **Deviation:** `Unit 2` was not created. The unit form requires a status, and this account's status pick-list is empty; adding an option would write account-wide settings outside the fixtures. Every unit-level check ran on Unit 1. |
| B1 | PASS **[REAL]** | + Add person `ZMR-TEST-BT Issuer Person`: `owner_kind = individual`, 0 ownership rows. P1 issuer = it (`42408381…`). P1 ownership unchanged (Owner LLC 100%). The view shows "ZMR-TEST-BT Issuer Person · Person". |
| B2 / R1 | PASS **[INPUT BURST]** | 3× Enter → exactly **1** `ZMR-TEST-BT Burst Person`; 3× Save person → exactly **1** `ZMR-TEST-BT Click Person`. |
| B3 | PASS **[REAL]** | The hint says the person is saved right away. `ZMR-TEST-BT Cancel Person` was saved, then Billing settings was **cancelled**: the person remains, and P1's issuer is still I1. |
| B4 | PASS **[REAL]** | `zmr-test-bt  issuer person` → prompt "Use existing: ZMR-TEST-BT Issuer Person — person" / "Add a different person". Choosing the latter gave 2 separate records. |
| B5 | PASS, partial **[REAL]** | I1's profile: "Individual", "No properties linked yet", "invoices from this issuer can be drafted but not issued", "invoices and receipts they issue". The remaining "this entity" is in the Contacts note, on the ownership screens excluded from the wording slice. **Not checked:** the Rent ops draft blocker wording, because drafting is out of scope. |
| T1 | PASS **[REAL]** | "+ Add tenant" sits beside Edit on the collapsed box; it opens the box and the form, with Unit 1 chosen automatically (only one unit). Cancel → view; Edit → the same form. |
| T2 | PASS **[REAL]** | New tenant A plus a $1,000 lease from 2026-11-01: leases 3→4 and links 3→4. The Tenants list, the Tenancy & billing link and Units › Lease history all refreshed. |
| T3 / R3a / R3b | PASS **[REAL] / [INPUT BURST]** | The choice shown was "co-tenant on Tenant A's tenancy ($1,000)" vs separate. Co-tenant chosen: A was not offered, and there were no rent fields. Inline "Add tenant" clicked 3× → exactly **1** Tenant B. Save clicked 3× → leases stayed at 4, links +1, rent still $1,000. |
| T4 | PASS **[SIMULATED → REAL]** | Separate tenancy, Tenant B, $500. The simulated link failure showed the partial message and locked the unit. [REAL]: lease `2407e38b` exists with 0 links. A **full reload** offered "Unfinished tenancy … ID 2407e38b … $500.00". Resume prefilled $500 and Nov 1; Save ×2 → still 5 leases, `2407e38b` linked to B. |
| T5 | PASS **[SIMULATED → REAL]** | Units › + Add lease › separate, Tenant A, $700, simulated failure. [REAL]: `8e71d37a` exists with 0 links. After leaving the page, and again after an explicit Cancel, "+ Add lease" offered "Unfinished tenancy … 8e71d37a … $700.00". Resume, Save ×3 → still 6 leases, linked to A. Then "+ Add lease" listed all three tenancies as co-tenant options plus separate; co-tenant on the $700 one (A not offered), Save ×3 → +1 link, no new lease, $700 unchanged. |
| T6 | PASS **[SIMULATED → REAL]** | Separate ended tenancy 2025-01-01 to 2025-06-30, $1, simulated failure. [REAL]: `b5953b81` exists with 0 links. Neither + Add tenant nor + Add lease offered it as unfinished or showed "rent twice" (also checked after reload). Lease history lists it as "Ended". Archived. |
| T7 | PASS **[REAL]** | Separate-tenancy picker: "zmr-test-bt same  name — zmr-test-bt-s2@example.test · added October 2, 2026" and "ZMR-TEST-BT Same Name — zmr-test-bt-s1@… · added October 2, 2026". A new "ZMR-TEST-BT  same name" (s3) prompted with **both** matches and their details, plus "You entered: zmr-test-bt-s3@example.test" and "Create a different person". Cancel → nothing created (2 same-name people, 8 leases, 10 links). |
| R2 | PASS **[INPUT BURST]** | Separate tenancy, `ZMR-TEST-BT Same Name`, $10, Save ×3 → exactly **1** lease (`61d216a5`) and **1** link. |
| R3 (same-name co-tenant) | PASS **[INPUT BURST]** | Co-tenant on the $10 tenancy with a second same-name person, Save ×3 → exactly 1 link, no lease, $10 unchanged. |
| D1 | PASS **[REAL]** | Same-origin frames of exactly 1280, 900 and 390 (the top window reports 1920 because of browser zoom, so frames were used for all three). Tenants and Units forms: the box is overflow `visible` while the menu is open; the menu extends 93–156 px past the Tenants box; "+ Add new tenant" is the element under its own centre; dispatching on it opened the new-tenant form; Specs and the nested Units boxes did not toggle; the box clips again after closing; no horizontal scroll; the tab bar is sticky. |

## Findings (not fixed during the window)
1. **F-P1 (minor; tenant candidate): no same-name prompt in co-tenant mode.** The co-tenant picker leaves out people already on that tenancy, and the same-name check uses that filtered list. Adding "zmr-test-bt same  name" as a co-tenant next to "ZMR-TEST-BT Same Name" created the second person **without** the prompt. No duplicate tenancy or rent results; it's a missed identity prompt. Suggested fix: run the name match against the full tenant list.
2. **Observation: Units doesn't refresh after a partial failure from Tenants.** Units › Lease history refreshes only after a successful Tenants add. After a simulated partial failure from Tenants, the unfinished lease appeared in Lease history only after a reload. No data effect.
3. **Observation: stale empty-state text.** With no tenants, the Tenants box says "add your first one in Units below", although "+ Add tenant" now exists.
4. **Tooling fix during the window (parse only; strictness unchanged):** `bt_preserve.py` assumed compact JSON. The CLI pretty-prints, so the first comparison listed all 34 new rows as "no row details" (FAIL). The parser now decodes the whole JSON document. An offline test was added for the real format (10 tests pass), and the comparison was re-run on the same saved files → PASS. Sent to T3 for focused review.

## Cleanup and residue
**Archived** (archive only; nothing hard-deleted):
- all 5 test leases: `72983d01` $1,000, `2407e38b` $500, `8e71d37a` $700, `61d216a5` $10, `b5953b81` $1;
- Unit 1;
- P1 set **Inactive**;
- the 6 test owner/person records (Settings › Organizations).

**Remaining by design, reported:**
- 4 tenants (no archive action in the app): A `a8b62dd8`, B, Same Name, and the second same-name person;
- 7 tenant links on the archived leases;
- P1's ownership interest and ownership version;
- P1's issuer setting (I1);
- 8 audit rows, all about P1 or the test owner records.

**Preservation:** the full-row fingerprints of all 436 pre-existing rows in 21 tables are identical before and after. Every pre-existing lease's rent, dates, archive flag and tenant links are unchanged, as are all action items (0 before and after) and audit rows. Every new row is an identified fixture: `evidence/practice-billing-tenant/03`, `04`, `07`, `08`.

**Evidence file 09** (`09-new-rows-fixtures-only.json`) is the window's saved `bt-new` output, committed after the window **without re-running Practice**:
- It's filtered to the 34 identified fixture rows. The 7 `property_ownership_versions` rows for pre-existing Practice properties are excluded; the query returns every row of that table because it has no timestamp, and their fingerprints were unchanged.
- It was checked for secrets (tokens, keys, passwords, connection strings) and none were found. The only emails are the four `zmr-test-bt-…@example.test` addresses.
- **T3 cleared the parser fix at `b31221d`.**

**Closed:**
- the test login is signed out;
- the scratch clone's Practice link and env file are removed (the runner now refuses: "clone is not linked to Practice");
- dashboard port 5191 is stopped;
- handback recorded.

**Not done:** no migration, account or membership change, production access, deployment, or invoice issuing, sending or scheduling.
