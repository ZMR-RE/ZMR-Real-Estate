# Stage 1 invoicing: hosted Practice results (T4, 2026-10-01)

**Candidate tested:** `03b334387b8c4afdc552bc263319452bd2dcb0c5`, exactly as T3 cleared it. It ran from a scratch clone on port 5191, linked to Practice (`gxgv…`, never production `jsro…`).

- **Window:** 16:14–16:46 UTC, recorded in the shared assignments file. It followed T1's handoff (`ZMR-T1-to-T4-practice-handoff.txt` at `11b3fce`).
- **Sign-in:** the test login `zmr-test-practice@example.test`. The owner typed its password in the browser.
- **Not done:** no production access, no sending or scheduling, no fixes during the window.

**Overall:** H1–H9 and H11 **PASS**. H10 can't be exercised on Practice (by design). There is one Stage 1 display defect (F-1, below). No check failed, so the window never had to stop.

## Migrations (exact set)

**Practice before:** 110 applied, including T1's mortgage migration `20260930200000` and B's entity migration `20261003100000`.

**Assemble step:** it matched both to the exact content Practice had applied.

| Migration | Content Practice applied | Source | Note |
|---|---|---|---|
| mortgage | `a3a1b908…` | `62eff87` | |
| entity | `8b476fda…` (the current version) | `a452a87` | Same file as production's 1e4e640 |

**Pending and apply:**
- Pending was exactly the 9 Stage 1 versions `20261002100000…20261002160000`, with none missing locally. It needed `--include-all`.
- The dry run listed only those 9.
- **Applied 16:15:18 UTC.** Practice now has **119**, and the new versions are exactly the 9.

## Results

**Fixtures:** all created through the dashboard: `1 ZMR-TEST-S1 Invoice Check Way`, `ZMR-TEST-S1 Invoicing LLC` (100%, code `S1T`), the tenant, the lease at $1,000 from 2026-10-01, the terms and the rules.

**Deviation (F5):** the Add-property wizard had already created `Unit 1`, so no second unit was added.

**Failure injection:** a one-shot wrapper on the page's `window.fetch`; the page code wasn't edited. I confirmed first that the app's Supabase calls go through the global fetch.

| # | Result | Evidence |
|---|---|---|
| H1 | PASS | **Request:** the `lease_billing_terms!lease_billing_terms_lease_id_fkey` embed returned 200 on the real API.<br>**Display:** terms show $1,000.00, due on the 1st, billed to the tenant. "Billing continues from" lists only the two earlier tenancies.<br>**Persistence:** the values were kept after a reload. |
| H2 | PASS | **Rules:** "$25.00 monthly (50% of $50.00)" and "50% of each statement entered".<br>**Statement:** "$40.00 → $20.00 · not billed yet".<br>**Empty one-time rule:** 3 required-field errors. |
| H3 | PASS | **Lines (SQL):** Rent $1,000.00 + pest share $25.00 + water $20.00 = **$1,045.00**.<br>**Prints:** bill to the tenant with email and phone; How to pay is F3's, labelled as the entity default. |
| H4 | PASS | After F3's phone changed: "Changed since you approved it: branding…". Only "Approve again" is offered; Issue is hidden. |
| H5 | PASS | **Issued:** `S1T-INV-000001`, with "Stored PDF — matches the fingerprint…".<br>**Fingerprint:** `pdf_attached` sha256 `ed09f006…dc721` equals the SHA-256 of the downloaded object (6,021 bytes).<br>**Path:** `<account>/<property>/Invoices/S1T-INV-000001_2026-11_Unit-1.pdf`.<br>**Preview:** drawn by the shared viewer, showing the re-approved phone. |
| H6 | PASS | Tried as the owner through the Storage API:<br>• **Delete:** returned `[]`, and the object is still present and byte-identical.<br>• **Upsert (POST `x-upsert`) and PUT:** 403, refused by RLS.<br>• **Move to `Other/`:** refused, and nothing appeared at the destination.<br>The SHA-256 was unchanged after each attempt. **Control:** the `Other/ZMR-TEST-S1-control.txt` object uploaded, deleted and is confirmed gone. |
| H7a | PASS | **Injected failure:** a Storage POST to `/Invoices/`.<br>**SQL:** `S1T-INV-000002` is issued, with 0 `documents` rows and 0 objects.<br>**UI:** the page says "…is issued, but its PDF isn't stored yet… Store PDF", and still does after a reload.<br>**Retry:** the PDF is stored; sha `ddacfbf2…304d` equals the object; the number is unchanged. |
| H7b | PASS (T3 blocker 2) | **Injected failure:** `rpc/attach_invoice_pdf`.<br>**SQL:** `S1T-INV-000003` is issued; the object exists (6,375 bytes, sha `11f36478…c02e8`); 0 `documents` rows; events end at `issued`.<br>**Retry:** the upload got 400 because the object already exists; the existing object was read and verified, then linked.<br>**After:** 1 `documents` row and `pdf_attached` with the same sha; still exactly 1 object, with the same `created_at` and bytes. |
| H8a | PASS (T3 blocker 1) | **Steps:** revise 000002, approve the revision, record $1.00 on 000002, then Issue the revision.<br>**Refused:** "A payment has been recorded against S1T-INV-000002 since this revision was opened…".<br>**SQL:** 000002 is still issued with its payment; revision 2 was approved but not issued.<br>**Then:** rejected the revision (SQL: `rejected`). |
| H8b | PASS | **After recording $100 on 000001:** Revise is refused (payments explanation), and Cancel is refused ("Payments are recorded against this invoice…").<br>**000003 (no payments):** cancelled, with "Cancelled (number kept)". |
| H8c | PASS | **February 2027 draft:** $1,025.00.<br>**Earlier unpaid:** `S1T-INV-000001` $945.00 and `S1T-INV-000002` $1,024.00, total **$2,994.00**. Cancelled 000003 isn't counted.<br>**Then:** rejected. |
| H9 | PASS | **Results:**<br>• `rpc/create_draft_core`: PGRST202 (not found);<br>• with `Content-Profile: invoicing_internal`: PGRST106;<br>• `create_invoice_draft` + `p_created_via`: PGRST202;<br>• `POST agent_runs`: **ZM356**. (My first attempt used a wrong column; the valid-shape retry got ZM356.)<br>**Counts:** invoices 5 / runs 0 / events 20, the same before and after. |
| H10 | Not exercisable | There's no non-owner on Practice, and no membership was created. The evidence is the database owner-only checks. |
| H11 | PASS | **Rendering:** the Financials page, bank reconciliation panel and tax-year switch all render. 2026 and 2025 show as open, and there are no console errors.<br>**SQL:** `financial_transactions` 30 and `financial_periods` 0, the same as the baseline. Nothing was locked, reopened or created. |

Screenshots are in `evidence/stage1-hosted/`.

## Findings (no fixes during the window)

| # | Finding | Origin | Recommendation |
|---|---|---|---|
| **F-1** | After **Reject draft** or **Cancel invoice**, the Rent ops detail panel keeps showing the old state (e.g. "Approved — ready to issue" with **Issue…**, or "Issued" with **Revise / Cancel…**) until a reload. The database and list are correct. | Stage 1 (`useInvoiceWorkflow`: the action refreshes without re-reading or clearing the selected invoice) | Fix in the next candidate, since misleading actions show on a finished invoice. Needs a new fixed hash and T3 re-review. I didn't click the stale **Issue…**, to avoid consuming a number if that path were wrong. |
| F-2 | On a collapsed box (e.g. entity › Invoicing), **Edit** enters edit mode but the box stays closed, so the form is hidden. | Pre-existing shared `EditableSection` (in production `1e4e640`) | Log for the owner's decision; not Stage 1 scope. |
| F-3 | Button labels "Add tenant" and "Save payment" don't follow the universal "Save" rule. | Pre-existing (`TenantForm`, `PaymentForm`) | Log; not Stage 1 scope. |
| F-4 | The Issued invoices table shows `$1045.00` (no thousands separator); the rest of the page shows `$1,045.00`. | Pre-existing `rentOps/InvoiceList` | Log; not Stage 1 scope. |

**Tooling note (not an app defect):** the shared Chrome profile reports a 2034-px viewport at DPR 1.33, so clicks by screen position and by element reference missed. Interaction went through the page's own handlers instead: standard input events and button clicks.

## Cleanup and residue

**Archived or ended through the app:**
- F1 is set to **Inactive**.
- Both rules are **ended**.
- The H8a revision and the February draft are **rejected**.
- The H6 control object was deleted and is confirmed gone.

**Permanent by design (reported, not deleted):**

| Kind | Records |
|---|---|
| Invoices | `S1T-INV-000001` (issued, $100 payment); `S1T-INV-000002` (issued, $1 payment); `S1T-INV-000003` (cancelled) |
| Rejected invoice rows | The 000002 revision; the February draft |
| Invoice events | 20 |
| Sequence | `document_sequences` S1T row (next 4) |
| Stored PDFs (3) | `…/Invoices/S1T-INV-000001_2026-11_Unit-1.pdf` (6,021 B, `ed09f006…`)<br>`…000002_2026-12_Unit-1.pdf` (6,316 B, `ddacfbf2…`)<br>`…000003_2027-01_Unit-1.pdf` (6,375 B, `11f36478…`) |
| Documents rows | 3 |
| Entity and setup | The entity (code locked) and its branding row (no logo); its 100% ownership interest; the unit, tenant, lease and terms |
| Rules and statements | 2 ended rules; 1 statement |
| Payments | 2 rows |

**Pre-existing records (before 16:14 UTC):** I took fingerprints (md5 of full rows) for 13 tables: accounts, members, llcs, properties, units, leases, tenants, documents, Storage objects, financial transactions, financial periods, audit_log and payments.

- **Identical** before and after.
- Stage 1's new trailing columns (`llcs.invoice_code`, the two `properties` billing columns, `documents.invoice_id`) are excluded, and are null on every pre-existing row.
- **No** pre-existing tenancy gained a billing recipient.
- **Only new audit rows:** the 2 field changes on my own S1 entity and property.
- **Every row created in the window** is a `ZMR-TEST-S1` fixture, listed individually.

**Closed out:**
- The test login was signed out; no auth token is left in the browser.
- The port-5191 server was stopped (that port only).
- The scratch clone's Practice link and env file were removed; the runner now refuses.

**Final migration list:** Practice 119 = the previous 110 + the 9 Stage 1 versions.

**Production:** unchanged at `1e4e640`. Hosted clearance isn't production approval. A deployment candidate must merge the live baseline and needs the owner's scoped release approval.
