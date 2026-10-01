Run 2026-10-01 from a fresh --no-local clone of t1/mortgage-integrity at e13340e2cfd28400bd5f2d3fff43959d7f563fee
(disposable local Postgres 17; fictional data; no Practice or production access).
Also from that clone: tsc -b clean, npm run build clean, vitest 19 files / 208 tests passed.
t3-original-rerun-live.txt = T3's unchanged script on live code (its pinned c15733c; same database as live 4f696c3).
