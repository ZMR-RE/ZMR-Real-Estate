Run 2026-10-01 from a fresh --no-local clone of t1/mortgage-integrity-r2 at 935c96aa9e22348773ac5544cccb986b94e9a74d (base live 4f696c3).
Disposable local Postgres 17; fictional data; no Practice or production access.
App: tsc -b clean, build clean, vitest 20 files / 215, oxlint 79 (= baseline).
control-run.txt applies the DRAFT disable migration: failures expected.
