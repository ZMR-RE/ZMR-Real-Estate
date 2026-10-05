# rc2-readable-simulated-r3 — readable integrity captures (2026-10-02, T1) — REFERENCED by the review page

**Backend: SIMULATED** (dev harness `src/devHarness/mortgageB1`, no Supabase). The real Mortgage tab and Action
Queue code of candidate **6d9bd62** run against an in-memory mock; server refusals are injected with their codes
and exact server text. This is new simulated evidence, not hosted evidence.

- Browser: headless Chromium 147 (Playwright), light scheme, deviceScaleFactor 2.
- Viewports: desktop 1280×900; phone **390×844 true viewport** (no desktop page behind it).
- Each image = a crop of the page from the first element of the state through its last action button, inside a
  labelled frame (header strip: simulated backend · candidate · viewport · state). The fixed harness banner is
  hidden only inside the crop because the frame header carries the same label. `raw/` holds the unframed crops.
- The harness has no app sidebar, so desktop shows the content column only; the real app frame is in the reused
  hosted captures.

| Id | State | How produced |
|---|---|---|
| I1 | Refused save: future statement date (2099-01-01); message in place, entries kept | Mock applies the server's future-date rule (22023) |
| I2 | Balance changed elsewhere (ZM5M5): complete message, Save and Cancel | `__b1.fail('reset', {code:'ZM5M5', message:<server text>})` |
| I3 | Partial save: balance saved, details not (40P01 on the details update) | `__b1.fail('update', {code:'40P01'})` |
| I4 | Action Queue: refusal explanation still shown after the list refreshed | ZM5M5 on confirm; ops log shows `load-review-list` after `reset` |

`capture-results.json` records each crop's CSS size and the alert text as rendered.
Script: T1 scratchpad `pw/integrity.mjs` + `pw/capture-lib.mjs` (not committed; harness on port 5186).
