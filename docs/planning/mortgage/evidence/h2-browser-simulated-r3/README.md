# h2-browser-simulated-r3 — H2 list correction captures (2026-10-02, T1) — REFERENCED by h2-history-visual-review.html

**Backend: SIMULATED** (dev harness `src/devHarness/mortgageB1`, copied temporarily from 9ea8ee3; no Supabase). Code: H2
**2d797fc** (`t1/mortgage-history-h2`). Headless Chromium 147, light scheme, deviceScaleFactor 2; viewports 1280, 768
(the Mortgage box is 704 px wide there — the width planning measured) and a true 390 px phone viewport.

State built through the real UI: two history payments (one then voided), one history escrow deposit; two voided normal
entries with the longest void-outcome note seeded in the mock. Each image is the section heading plus its table,
framed with a label strip (simulated backend · commit · viewport · state); `raw/` holds the unframed crops.

| File | Shows |
|---|---|
| H2r-P-* | Payments: one-word "History" badge; "Included in the opening balance."; voided history "History only; balance not affected." (current wording); long void note wraps |
| H2r-E-* | Escrow: same, in the Type column |

`measurements.json` — per width, per table: content width vs box width (overflow px), first-column width, badge fully
visible, page sideways scroll. Before/after at the same state (before = d1450c5 code):

| Width | Before: overflow payments / escrow | After | Badge before → after |
|---|---|---|---|
| 1280 | 0 / 0 | 0 / 0 | visible → visible |
| 768 (704 px box) | 310 / 360 px | 0 / 0 | visible → visible |
| 390 | 684 / 733 px | 219 / 269 px | **clipped** → visible |

At ≤600 px every app table scrolls sideways inside its box (existing approved behaviour, `.table-scroll`); the
remaining phone overflow is the money columns, not the notes, and the page itself never scrolls sideways.
Observation for T2 (shared table styles, not changed here): the global `table { display: block }` rule makes the inner
table shrink to its content, so when no cell forces the width the row lines stop short of the box's right border
(visible at 1280 and 768 here; before this fix the long notes happened to fill the width at 1280).
