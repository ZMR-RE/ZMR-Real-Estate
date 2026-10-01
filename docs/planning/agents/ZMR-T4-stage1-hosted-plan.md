# Stage 1 invoicing — hosted Practice check plan (T4)

**Candidate:** `03b334387b8c4afdc552bc263319452bd2dcb0c5` (branch `t4/stage1-on-a`, built on Release A `ba2c9b1`). It includes the fixes for T3's two production blockers on `921324e`. T3 has cleared it for hosted Practice testing. Practice runs use exactly this hash (`S1_CANDIDATE`). Later commits on the branch that change only documentation don't change what is tested.

**Status:** prepared; nothing has run on Practice. It starts only after both:

1. **T3 clears** this candidate. T3 has permitted Practice testing, and has also listed the two blockers fixed here.
2. **T1 hands over Practice in writing,** after T1's mortgage follow-up checks are complete (see §1).

Not in scope: Agents features, sending, mailbox, scheduling, any production step.

## 1. Coordination

- **T1 holds Practice.** T4 asks T1 (via the owner) for one written line covering:
  - *"T4 holds Practice from <time>"*;
  - that T1's mortgage follow-up checks are complete;
  - that no other terminal will write to Practice during the window.
- Without that line, T4 does nothing, including no read-only listing.
- **Handback:** *"Practice returned to T1"*, with the results, residue and the final migration list.
- **Production baseline (corrected 2026-10-01):** Release B `1e4e640` is live (Netlify `6abddd26d6f44eedbd77d2c1`, 109 migrations, since 04:10 UTC). The earlier "not confirmed live" note was stale. This doesn't change the Practice procedure: Practice's actual state is still read, never assumed.
- **Hosted clearance is not production approval.** The eventual deployment candidate must merge the live baseline as it actually is at release time (currently `1e4e640`), with that checked again then. Without B, the candidate would remove B's entity field, filter and Action Queue item.

## 2. Access and identity

- **Database:** T4's scratch clone of the candidate, given only Practice's non-secret link metadata.
  - The runner refuses any link but Practice's ref, refuses production's, and refuses a clone that isn't at `S1_CANDIDATE`.
  - No database password is handled.
- **Dashboard:** run from the same clone (`vite.practice.config.ts`, port 5191; never T1's 5190).
- **Sign-in:** `zmr-test-practice@example.test` (`owner`). **The owner types its password.**
- **No membership is created or changed.**

## 3. Migration inventory assembly

Runner `docs/planning/agents/practice/s1practice.sh` and helper `docs/planning/agents/practice/s1_pin_versions.py` (copies of the tested scripts).

| Step | Command (`S1_CANDIDATE=<hash>`) | Rule |
|---|---|---|
| 1 | `ledger` | Practice's **actual** list, saved verbatim. Never inferred from production. |
| 2 | `assemble` | For each Practice-applied version the candidate lacks, read Practice's recorded `statements`/`name` (read-only), and compare them, ignoring comments, whitespace and statement splits, with **every** distinct historical content of that file in local git. Mirror only the **single** content that matches exactly. No match, more than one match, or no recorded statements → **STOP**, nothing mirrored, report to T1. |
| 3 | (printed) | `local-not-remote` must be **exactly** `20261002100000 … 20261002160000` (9); `remote-not-local` must be **none**. |
| 4 | `dryrun` | Must list only those 9. `--include-all` is added only if a later version (e.g. `20261003100000`) is already applied. |
| 5 | `apply` | Re-checks the exact set, pushes, and re-reads the list: before + the 9, nothing else. |

**Offline evidence** (no Practice access):

| Scenario | Result |
|---|---|
| Recorded post-R2 list | Pending = exactly the 9 → plain push |
| Plus mortgage and entity, where Practice applied the **older** of two entity versions | Pinned to that older content (`237ac971`, not the newest `8b476fda`); mortgage pinned; pending = exactly the 9; `--include-all` |
| Applied content matching no local version | STOP, nothing mirrored (all-or-nothing) |
| No recorded statements | STOP |
| Two local contents differing only in a comment both match | STOP (ambiguous) |
| Unknown version with no local file | STOP |
| One Stage 1 version already applied | Apply refused |

**Baseline snapshot before applying** (read-only, numbers only), re-checked after cleanup:

- accounts, members, llcs, properties, units, leases, tenants;
- documents and Storage objects (with their latest timestamps);
- financial_transactions, financial_periods (including the locked years), audit_log (count and latest);
- invoices, payments.

## 4. Fictional fixtures

All are created through the dashboard, in the Practice test account, named `ZMR-TEST-S1`.

| # | What | Values |
|---|---|---|
| F1 | Property + owner entity (Add property wizard) | `1 ZMR-TEST-S1 Invoice Check Way`, Testville; new owner `ZMR-TEST-S1 Invoicing LLC` at 100%, allocation complete |
| F2 | Entity › Invoicing | Code `S1T`; first number left at the default |
| F3 | Settings › Entities › Branding & documents | Payment instructions `ZMR-TEST-S1: Zelle to zmr-test-s1@example.test`; no logo |
| F4 | Property › Billing settings | Invoicing entity = F1's entity |
| F5 | Property › + Add unit | `Unit 1` |
| F6 | Add tenant | `ZMR-TEST-S1 Tenant One`, `zmr-test-s1-tenant@example.test`, `(555) 010-0101` |
| F7 | + Add lease | Unit 1, F6, rent $1,000.00, start 2026-10-01, open-ended |
| F8 | Tenant › Tenancy & billing | Due day 1; billing recipient; "Charge the full month" |
| F9 | Tenant › Billing rules | Fixed `ZMR-TEST-S1 pest share` $25.00 (50% of $50.00) from 2026-11-01; variable `ZMR-TEST-S1 water` 50% from 2026-11-01; October 2026 statement $40.00 |

## 5. Checks and expected results

**Failure injection method.** On the Practice dashboard tab, T4 wraps `window.fetch` from the page console to fail **one** matching request once, then restores it. The page's code is never edited. Before each retry, read-only SQL confirms what actually committed. Going offline before Issue proves nothing about whether issuance committed, so it is **not** used.

| # | Check | Steps | Expected |
|---|---|---|---|
| H1 | **Tenancy billing through the real API** | Open F6 after F8. | Terms show (rent $1,000.00, due on the 1st, billed tenant). There is no PostgREST embed error (`lease_billing_terms!lease_billing_terms_lease_id_fkey` with two foreign keys to `leases`). "Billing continues from" lists only earlier tenancies. Save → reload keeps the values. |
| H2 | Billing rules | F9. | "$25.00 monthly (50% of $50.00)", "50% of each statement entered"; the statement shows "$40.00 → $20.00 · not billed yet". An empty one-time rule shows three required-field errors. |
| H3 | Draft | Rent ops › + New invoice › F7, November 2026. | Rent $1,000.00 + pest share $25.00 + water $20.00 = $1,045.00. What prints: F6 with email and phone; How to pay = F3, the entity default. |
| H4 | Approval covers print | Approve; change F3's phone; reopen. | "Changed since you approved it: branding…", Approve again; Issue hidden until re-approved. |
| H5 | **Issue + stored-PDF integrity** | Issue November. | `S1T-INV-000001`; "Stored PDF — matches the fingerprint recorded at issue". SQL: the `pdf_attached` SHA-256 equals the SHA-256 of the downloaded object, and the `documents.invoice_id` path is `<account>/<property>/Invoices/S1T-INV-000001_2026-11_Unit-1.pdf`. The preview draws through the shared viewer. |
| H6 | **Stored-PDF protection: delete / overwrite / move** | As the owner, through the Storage API from the page: delete; upload with `x-upsert: true` to the same path; `object/move` to `…/Other/…`. | Delete removes nothing (the object is still present and byte-identical); overwrite is refused (RLS); move is refused (still at its path, nothing under `Other/`). After each, the SHA-256 is unchanged. **Control:** an ordinary `ZMR-TEST-S1` object under `Other/` uploads and deletes. |
| H7a | **Failure after confirmed issuance, before upload** | December draft ($1,025.00: rent + pest; water flagged unresolved) → approve → arm: fail the next Storage `POST …/object/documents/…/Invoices/…` → Issue. | SQL confirms the invoice is **issued** as `S1T-INV-000002` (issuance committed) and has no `documents` row and no object at its path. The page shows "…is issued, but its PDF isn’t stored yet… Store PDF". **Reload** → "Store PDF" still offered. Retry → stored; fingerprint matches; same number. |
| H7b | **Upload succeeded, linking failed** (T3 blocker 2) | January 2027 draft → approve → arm: fail the next `rpc/attach_invoice_pdf` → Issue. | SQL confirms: issued `S1T-INV-000003`; the **object exists** at its path (SHA-256 recorded by T4); **no** `documents` row; no `pdf_attached` event. The page offers "Store PDF". Retry → the existing object is verified and linked: a `documents` row and `pdf_attached` with the same SHA-256 the object had; still exactly one object; its bytes unchanged. (A mismatched existing object is covered by the local tests and isn't staged on Practice, to avoid leaving a permanently unlinked invoice.) |
| H8a | **Payment arrives after a revision was opened** (T3 blocker 1) | Revise `S1T-INV-000002` → approve the revision → Rent ops › Record payment $1.00 on `S1T-INV-000002` → Issue the revision. | Issue refused: "A payment has been recorded against S1T-INV-000002 since this revision was opened…". SQL: `S1T-INV-000002` still issued with its payment; the revision unissued. Reject the revision. |
| H8b | Revise / cancel with payments | Record $100 on `S1T-INV-000001` → Revise; Cancel. Cancel `S1T-INV-000003` (no payments). | Revise refused (ZM349 explanation); cancel refused; `S1T-INV-000003` cancelled, number kept. |
| H8c | Earlier balances | February 2027 draft. | $1,025.00 (rent + pest; water unresolved). Earlier unpaid, already billed and not charged again: `S1T-INV-000001` $945.00 and `S1T-INV-000002` $1,024.00. Total outstanding $2,994.00. The cancelled `S1T-INV-000003` is not counted. Then Reject. |
| H9 | **Internal-schema API refusal** | From the page, with the signed-in owner token: `POST /rest/v1/rpc/create_draft_core`; the same with `Content-Profile: invoicing_internal`; `rpc/create_invoice_draft` with an extra `p_created_via: "assistant"`; direct `POST /rest/v1/agent_runs`. | Each is refused: function not found (the internal schema isn't exposed); the schema not allowed (PGRST106); no function with that signature; ZM356. No invoice or run row is created (SQL counts unchanged). |
| H10 | Owner-only | — | **Not exercisable** (no non-owner on Practice; no membership created). Evidence: the DB owner-only checks (31), including the manager-payment control. |
| H11 | **Financials preserved** (A's M6 on the combined build) | Financials page; Bank reconciliation; tax year; read-only SQL on `financial_periods`. | They render; the lock state is as before. **Nothing is locked, reopened or created** (shared state). `financial_transactions` and `financial_periods` counts equal the baseline. |

**Recorded for every check:** pass/fail, screenshots (H1, H3, H4, H5, H7a, H7b, H8a, H11) and the exact error text. A failure stops the window: record it, clean up, report. **No fixes are made during the window.**

## 6. Cleanup and residue

Remove or archive what the app allows:

- F1 → **Inactive**;
- rules → **End rule**;
- the February draft and the H8a revision → **Reject**;
- the H6 control object → deleted and confirmed gone.

**Permanent by design. Reported with ids, not deleted:**

- `S1T-INV-000001` (issued, $100 payment), `S1T-INV-000002` (issued, $1 payment), `S1T-INV-000003` (cancelled); their numbers are never reused;
- three stored invoice PDFs (path, size, SHA-256 each);
- `invoice_events`, the `document_sequences` S1T row, the `documents` rows;
- the entity (code locked), its branding row (no logo, so no logo file), unit, tenant, lease and terms;
- the two `payments` rows.

**Cleanup is confirmed when:**

- every §3 baseline count is unchanged except for the listed `ZMR-TEST-S1` additions;
- no pre-existing row's timestamp has moved;
- the test login is signed out;
- the scratch clone's Practice link has been removed (the runner refuses);
- the handback line has gone to T1.

## 7. Estimated window

About 90 minutes: inventory and apply 10, fixtures 15, checks 45, cleanup 20.
