Run 2026-10-01 from a fresh --no-local clone of t1/mortgage-integrity-r2 at 4290a08142666101e844298e70b745d885a50268
(disposable local Postgres 17; fictional data; no Practice or production access).
Also from that clone: tsc -b clean, npm run build clean, vitest 20 files / 215 tests, oxlint 79 warnings (= live baseline 4f696c3).
control-run.txt applies supabase/recovery/mortgage_integrity/disable_draft.sql (pre-integrity triggers) — failures are expected.
t3-original-rerun-live.txt = T3's unchanged script on live code (pinned c15733c; same database as live 4f696c3).
Earlier evidence for the reviewed e13340e stays in ../integrity-tests-2026-10-01/.
