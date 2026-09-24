# Practice environment — owner review checklist

Version 1.0 · September 24, 2026. Covers the isolated hosted-integration verification (real Supabase project "ZMR Practice", separate from your live "ZMR Real Estate" project). This is real backend integration — not the earlier mock harness — but it is still not owner acceptance until you've gone through it yourself.

## Start here

1. Open **http://localhost:5190/** in your browser. A gold **"PRACTICE — fictional data, separate from your real portfolio"** banner should be visible at the top of every page. If you don't see it, stop — you may be looking at the wrong server.
2. Sign in with the disposable practice login: **email `zmr-test-practice@example.test`**. I generated its password and it's stored only in a local file on this machine, not in this chat — ask me (via the terminal) if you want to sign in yourself and I'll walk you through retrieving it, or I can reset it to one you choose.
3. This is a **separate Supabase project** from your real one. Nothing here is your real data, and nothing you do here reaches your real portfolio. Your real dashboard (port 5173, or the published one you use from other devices) is completely unaffected.

## What to check

1. **Property registry** — you should see one fictional property, "100 Practice Test Way." Click it.
2. **Ownership box** — confirm it shows "ZMR-TEST-PRACTICE Owner A" at 100%, "Complete allocation." Try editing it: add a note in Reason, change the percentage, Save, then reload the page — confirm your change stuck.
3. **Insurance box** — confirm one policy, "ZMR-TEST-PRACTICE Insurance Co," shows a green "Within recorded term" badge and has 2 documents listed. Click "View document" on one — it should open (a page of random fictional test bytes, not a real file, but the link itself proves real file storage and retrieval work).
4. **Property information → Edit** — start editing, then (just to see it) ask me to simulate "someone else saving first" again — you should see the same conflict notice a moment after clicking Save, with your typed text still there.
5. **Add a second fictional property** yourself, with any obviously-fake name and address, to get a feel for the real Add-property flow.
6. **Sign out**, then sign back in as **`zmr-test-practice-b@example.test`** (a second disposable login) — confirm the property registry is empty and going directly to the first property's URL says "Property not found." This proves your data would stay separated from anyone else's account too.
7. When you're done, sign back in as `zmr-test-practice@example.test` (or just leave it — this project has no real data to protect).

## What this does and doesn't prove

**Real evidence, not simulated:** every check above ran against the actual hosted Postgres database, actual Supabase Auth, and actual Supabase Storage in the separate practice project — the same code your real dashboard runs, just pointed elsewhere. Confirmed working this way: save/reload persistence, the ownership percentage/completeness rule, the stale-edit conflict guard (refuses to silently overwrite a concurrent edit), cross-account data isolation (Postgres row-level security), and real file upload/retrieval (tested up to ~8.8 MB; a much larger file wasn't tested — see below).

**Still not verified:**
- The **exact** hosted per-file upload size limit. I could confirm uploads work at a realistic real-world document size (~8.8 MB succeeded), but not exactly where it starts failing — that number is only visible on the Supabase dashboard's Storage settings page, which needs your login, not mine.
- Anything about your **real** account/data — this project has none of it, by design.
- Your own visual/workflow acceptance of any of this.

## Cleanup / ongoing use

This practice project is yours to keep using for testing going forward — I did not delete it after this check. If you'd rather I tear it down, tell me and I will (via the Supabase CLI, the same way it was created — nothing manual needed).
