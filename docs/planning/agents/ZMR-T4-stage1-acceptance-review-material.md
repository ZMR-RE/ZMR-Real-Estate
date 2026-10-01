# Stage 1 acceptance: review material for the planning conversation (T4)

Use this to inspect the evidence **before** asking the owner for visual and workflow acceptance. The owner-facing summary is `ZMR-T4-stage1-owner-acceptance.md`.

All paths are on branch `t4/stage1-on-a`. The worktree is `/Users/janki/Projects/ZMR-Real-Estate-T4-stage1-on-a/`, and the evidence folder is `docs/planning/agents/evidence/`.

**Code candidate:** `45d3eb5`. It is T3-cleared `03b3343` plus the F-1 panel fix; nothing else in the frontend or database differs.

## 1. Evidence index

| # | File (under `docs/planning/agents/`) | Candidate | Environment | Shows |
|---|---|---|---|---|
| P1 | `evidence/stage1-hosted/H1-tenancy-billing-after-reload.jpg` | `03b3343` | **Practice** (real backend), desktop | Tenant › Tenancy & billing after a reload |
| P2 | `evidence/stage1-hosted/H3-november-draft.jpg` | `03b3343` | Practice | Draft $1,045.00 in Rent ops; What prints |
| P3 | `evidence/stage1-hosted/H4-changed-since-approved.jpg` | `03b3343` | Practice | "Changed since you approved it", Approve again |
| P4 | `evidence/stage1-hosted/H5-issued-preview-shared-viewer.jpg` | `03b3343` | Practice | Issued S1T-INV-000001 and its stored-PDF preview |
| P5 | `evidence/stage1-hosted/H7a-store-pdf-after-reload.jpg` | `03b3343` | Practice | Issued without a PDF, "Store PDF" offered |
| P6 | `evidence/stage1-hosted/H7b-stored-after-relink.jpg` | `03b3343` | Practice | Recovered after a failed link |
| P7 | `evidence/stage1-hosted/H8a-revision-issue-refused.jpg` | `03b3343` | Practice | Revision refused (payment arrived) |
| P8 | `evidence/stage1-hosted/H8c-february-earlier-balances.jpg` | `03b3343` | Practice | Earlier unpaid listed, not charged again |
| P9 | `evidence/stage1-hosted/H11-financials.jpg` | `03b3343` | Practice | Financials unchanged |
| L1 | `evidence/stage1-hosted/F1-fixed-harness-after-cancel.jpg` | `45d3eb5` | **Local harness, simulated backend** | After Cancel: "Cancelled (number kept)", no actions |
| L2 | `evidence/stage1-local-harness/wide-1280-review-panel.jpg` | `45d3eb5` | Local harness, 1280 px | Review list and draft panel |
| L3 | `evidence/stage1-local-harness/wide-1280-pdf-and-issued-table.jpg` | `45d3eb5` | Local harness, 1280 px | Draft PDF preview; Issued invoices table |
| L4 | `evidence/stage1-local-harness/intermediate-900-review-table.jpg` | `45d3eb5` | Local harness, 900 px | Review table and panel header |
| L5 | `evidence/stage1-local-harness/phone-390-review-panel-and-tenant-billing.jpg` | `45d3eb5` | Local harness, **true 390 px** viewport (frame) | Left: Rent ops draft panel. Right: Tenancy & billing, Billing rules |
| L6 | `evidence/stage1-local-harness/phone-390-pdf-preview-and-tenant-billing.jpg` | `45d3eb5` | Local harness, 390 px | Draft PDF preview on a phone |
| L7 | `evidence/stage1-local-harness/window-500-min-chrome-width.jpg` | `45d3eb5` | Local harness, 500 px window (Chrome minimum) | Mobile header and review table |
| PDF1 | `samples/sample-1-issued-with-logo_A-INV-000001.pdf` | Re-rendered from `45d3eb5`: identical content (only the creation date and ID differ) | Local renderer, fictional data | **Representative issued invoice:** logo, lines, credit, how to pay |
| PDF2 | `samples/sample-2-draft-no-logo_co-tenants.pdf` | Same | Same | Draft, no logo, co-tenants, property-specific instructions, statement share, earlier unpaid |
| PDF3 | `samples/sample-3-issued-renewal-with-earlier-balance.pdf` | Same | Same | Renewal: this invoice versus total outstanding |
| PDF4 | `evidence/stage1-local-harness/pdf-long-labels-wrap-check.pdf` | `45d3eb5` | Same | Very long address, line and earlier-unpaid labels **wrap inside the margins** |

**About the screenshots and PDFs:**
- **The harness** is the real Rent ops and tenant screens in the real AppShell, with production CSS. Only `supabaseClient` and `AuthContext` are replaced by in-memory fictional data. It's the same frontend code, but not a real backend.
- **Practice screenshots P1–P9** were taken with a zoomed browser profile, so the app is drawn small in the top-left of each image. They're valid functional evidence but poor for judging appearance; use L2–L7 for that.
- **The issued PDFs on Practice** (S1T-INV-000001 to 000003) are in Practice Storage. Downloading one needs a coordinated Practice window. PDF1–PDF3 are the same renderer and layout.

## 2. Walkthrough

1. **Tenancy and billing setup** (tenant page; P1, L5 right):
   - Tenancy & billing sets the due day, who's billed (ticked recipients, one invoice per tenancy) and partial months (full, prorate, or entered by hand). Rent comes from the lease.
   - Billing rules hold recurring charges ("$25.00 monthly (50% of $50.00)"), a share of a variable bill (billed only from a statement you enter, never estimated) and one-time charges or credits.
   - Before that, the entity needs an invoice code (Entity › Invoicing), and the property needs its invoicing entity (Property › Billing settings).
2. **Draft and PDF review** (P2, L2, L3, L6, PDF2):
   - Rent ops › + New invoice: choose the tenancy and the month. Blockers show with fix links.
   - Save makes a draft: rent plus each rule's line.
   - The panel shows the facts, **What prints** (bill to, how to pay with its source, this invoice versus total outstanding, earlier unpaid not charged again) and the PDF preview, marked "DRAFT — NOT ISSUED".
3. **Approval and issuance** (P3, P4, PDF1):
   - **Approve** records exactly what prints. If branding or instructions change afterwards, the panel says what changed and needs **Approve again** (Issue is hidden).
   - **Issue…** asks for confirmation, assigns the next number and stores the PDF with a fingerprint. Nothing is sent.
   - If storing fails, the invoice stays issued with **Store PDF** (P5, P6).
4. **Cancelled and rejected states** (L1; P7):
   - **Reject…** (optional reason) removes a draft from review; the panel closes.
   - **Cancel…** (reason required) keeps the number. The panel and list show "Cancelled (number kept)" with no actions.
   - Revise and cancel are refused once payments exist (P7, H8b).

## 3. Owner acceptance versus completed engineering

**Already done; don't ask the owner to repeat any of it:**
- hosted H1–H9 and H11 on Practice;
- F-1 tests;
- clean-clone build and tests, and the database suites (167/167 and payment races);
- the old-dashboard compatibility checks;
- H10 local permission tests (32 assertions). H10 is **not** a hosted pass, because Practice has no non-owner.

**Needs owner acceptance (appearance and workflow choices):**

| # | Choice | Evidence |
|---|---|---|
| A1 | Invoice PDF layout and wording: header, Bill to / Rental, line style, "Amount due — this invoice" versus the long "Total outstanding — this tenancy and the one it continues…" line, the earlier-unpaid block, How to pay, Note, footer | PDF1–PDF3 |
| A2 | The workflow: draft → approve → issue, Approve again after changes, reject and cancel (with reasons), no editing after issue | §2 |
| A3 | What the review panel shows ("What prints") and its wording | P2, L2 |
| A4 | Review panel actions: Approve, Reject… and Edit in the header. They wrap to two rows on desktop (L2, L4) and stack vertically on a phone (L5). | L2, L4, L5 |
| A5 | Tables on narrower screens. Both tables scroll sideways **inside their box**, with no visible cue that more columns exist (G1, G2). | L2–L5, L7 |
| A6 | The phone PDF preview is a full-page thumbnail; reading it needs Open in new tab | L6 |
| A7 | Where things live: Entity › Invoicing, Property › Billing settings, Tenant › Tenancy & billing and Billing rules, Rent ops (no new menu item) | §2 |

## 4. Visual gaps found

| # | Gap | Origin | Measured |
|---|---|---|---|
| G1 | The "Invoices to review" table is wider than its box at common widths. | Stage 1 | 1280 px: From is cut by 14 px. 900 px: only Tenancy and Month visible. 390 px: only Tenancy (table 1016 px in a 358 px box). |
| G2 | The Issued invoices table hides Status and **Record payment** off to the right even at 1280 px (1284 px in a 950 px box). Stage 1 added the Number column; amounts show `$1450.00` (F-4). | Stage 1 column on an existing table | L3 |
| G3 | The review panel's header actions wrap: Edit drops below Approve/Reject on desktop, and all three stack on a phone, making the header taller (Box interaction standard: secondary actions shouldn't make the box grow). | Stage 1 | L2, L4, L5 |
| G4 | On the tenant page at 390 px, the shared **Edit** buttons are 34 px tall and the Documents dropdowns 41 px, below the 44 px used elsewhere. Rent ops itself has no control under 44 px and no sideways page scroll. | Shared, existing | Measured in the 390 px frame |
| G5 | **No screenshot exists** of Entity › Invoicing or Property › Billing settings. The harness has no route to them; on Practice they were used (F2, F4) but not captured, and F-2 (a collapsed box hides the form after Edit) affects Entity › Invoicing. | Access dependency | Needs a coordinated Practice window (not authorized now) or the owner's review after release |
| G6 | Practice screenshots are distorted in scale (zoomed profile). | Capture | Use L2–L7 for appearance |

**Not a gap:** PDF overflow. Long labels wrap inside the margins (PDF4).

**What the phone evidence actually shows:**
- **Earlier claim:** the implementation record's text said "390 px: no sideways scroll; every control ≥ 44 px" (Rent ops), plus 500 px checks of the billing rules. No images were kept.
- **L5–L6 now show a true 390 px viewport,** using a 390 px frame because Chrome's window can't go below 500 px:
  - Rent ops: no sideways page scroll, all controls ≥ 44 px, tables scroll inside their boxes;
  - the tenant billing boxes read well;
  - G4 applies on the tenant page.
- It's not a real phone or touch device, and Practice's mobile header isn't shown. MOB-1 (T2) is changing that header separately.

## 5. Recommendation
- **Ask the owner to accept A1–A7 using PDF1–PDF3 and L2–L6.** Use P1–P9 only as proof that the flows worked on Practice.
- **Ask whether G1–G3 should be fixed before release** (Stage 1 layout, small CSS/layout scope). T4's recommendation is to fix G1 and G2, because Record payment and Status are hidden on a laptop-width screen.
- **G4 and F-2 to F-4** stay with the separate shared-UI backlog.
- **G5** needs either a Practice window or the owner's acceptance by description.
