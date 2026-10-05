# H1 Reports: integrated on live `90abc8a`, delta for T3 and draft release packet (T2, 2026-10-02)

**Status:**
- **Done:** built and technically verified locally.
- **Awaiting:**
  - T3's delta review;
  - the planner's audit of the visual review;
  - owner visual acceptance;
  - **separate** release approval.
- **No release is authorized.**

## Exact candidate
| | |
|---|---|
| **Candidate** | **`d3009a9ca6bff808a03c56bfd64280a8a32d096b`** on `t2/h1-reports-history-r2` |
| Built as | `90abc8a` (live: deploy `6abf2f38db19970008251e2c`, 119 migrations) + `--no-ff` merge of **`5b00554`** (`bee4e3a`, clean) + one **test-only** commit bringing in the real-migration P2 suite from `0c44896` (`d3009a9`, which also removes the old stand-in table file) |
| **Production-code delta** | `git patch-id --stable` of the non-test `src` diff is **`c83a8efc1f9c` for both `d9cdcb3..5b00554` and `90abc8a..d3009a9`**, so it's identical to the reviewed candidate |
| **Test files** | Identical to `0c44896` (T3-reviewed P2 suite on T1's real H2 migration) |
| **Overlap with live's billing/tenant changes** | **None:** `d9cdcb3..90abc8a` touches no `reports/*`, query or Supabase-client file |
| Database | **No migration** |

## Checks on the exact candidate
**Clean clone of `d3009a9`:**
- type-check (`tsc -b`) clean;
- `npm run build` OK;
- **bundle check with dummy, non-secret env values:** the entry chunk contains the `mortgage_history_payments` read. A build without env values is a stub; see the sticky packet's build caveat.
- vitest **333 passed, 4 skipped**: the 3 environment-gated real-row checks, plus the existing skip;
- lint 0 errors (83 baseline warnings);
- 119 migrations.

**P2 on T1's real H2 migration** (`4317d43`, applied to this candidate's own live-schema migrations): **20/20**.
- Live schema: `42P01` with the exact text H1 classifies.
- **Real migration:**
  - member-created rows through T1's trigger;
  - account isolation (read and write), void filtering, no delete, anon refused;
  - disclosure totals of 601.00 / 150.50 through H1's real report functions;
  - cash unchanged;
  - no loan figure changed.
- Evidence: `evidence/h1-r2-d3009a9/p2-real-h2-4317d43/`.

**Browser checks** (targeted; review page, simulated backend, fictional data), compared with live `90abc8a`:
| Scenario | Result at 1440/768/390 |
|---|---|
| Table missing (before H2) | Balance Sheet and Cash Flow text **identical to live**; no disclosure, memo or alert |
| History rows (after H2) | Figures identical to live; disclosure 000 Fictional Test Way $669.31 / 200 ZMR-TEST-T2 Second St $150.50 (voided excluded); Cash Flow memo $369.31 |
| Other error / hint-only | Shown as an error, as designed |

- No horizontal page overflow.
- No console errors except a favicon 404 on the first load, which live has too.
- Evidence: `evidence/h1-r2-d3009a9/browser/`.

**Why the 190 Practice views weren't repeated:**
- **Same code:** the integration changes no Reports, query or client code (identical patch-id, no file overlap).
- **Already covered:** the hosted answer and figure identity were established by P3, which T3 cleared at `b69f650`.

## Accepted temporary effect (owner decision; recorded in the P3 results, `c873fdb`)
- **Console lines:** until H2 is applied, every Reports load and every filter/year change logs a browser "Failed to load resource: 404" line for each of H1's two `mortgage_history_payments` requests. The answer is `PGRST205`.
- **No user effect:** the app shows no error, and the figures are unaffected.
- **Missing-table handling unchanged; no session caching.**
- The lines end when H2 creates the table.

## Release order and recovery (draft)
- **Order:**
  - H1 must be live **before** H2.
  - H1 doesn't depend on, or delay, T1's integrity release.
  - **Sticky `76b6402` is built on the same baseline**, so whichever of sticky and H1 ships second is re-merged onto the then-live commit (a merge-only re-verification).
- **Rollback target:** the immediately prior verified deploy at release time. Today that's `6abf2f38db19970008251e2c` (`90abc8a`). It's re-pinned in the final packet.
- **Recovery:** a scoped `git revert -m 1 bee4e3a` on `main` (plus `d3009a9`'s test-only commit if desired). No database change.
- **Republishing a deploy older than H1:** no extra deduction, but it loses the disclosure. That's stated, not hidden.
- **Post-deploy check:**
  - the served bundle contains `mortgage_history_payments`;
  - Reports figures equal the pre-release figures for the same account;
  - the history requests answer `PGRST205`, as recorded in P3.

## Visual review (ready for the planner's audit before owner acceptance)
- **Link:** https://claude.ai/artifact/3yBtDQpCeo2fxh5uGiWkoA. The production code is unchanged since those captures.
- **Shows:**
  - the disclosure and memo at desktop and phone width;
  - **the pre-existing phone table problems, unchanged on live `90abc8a`:**
    - Cash Flow amounts cut by 8–9 px;
    - Balance Sheet shows 2 of 5 columns;
    - a first row 26 px under the header, which sticky `76b6402` fixes.

## Request to T3
- A delta review of **`d3009a9` vs live `90abc8a`:**
  - the merge of `5b00554`, whose production code is the identical patch;
  - plus the test-only commit, whose files are identical to the `0c44896` you reviewed.
- Please confirm the evidence above.
