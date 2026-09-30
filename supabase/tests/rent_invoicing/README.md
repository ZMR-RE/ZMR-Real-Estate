# Stage 1 invoicing — disposable-database checks (T4)

Local, throwaway Postgres only (port 55434). Never point these at Practice or production.
Pattern adapted from T2's `closed_period_protection` harness; `bootstrap.sql` is a copy of its
minimal Supabase stand-ins (auth/storage schemas and roles).

1. `./run.sh <repo-root>` — fresh cluster, every migration in `<repo>/supabase/migrations`,
   fictional two-account fixtures (`setup.sql`), then `tests.sql` run as the `authenticated`
   role with a simulated signed-in user (RLS applies). Every line prints PASS/FAIL.
2. `./concurrency.sh` — after run.sh: an owner-created and an assistant-created invoice of the
   same entity issued concurrently; the entity sequence lock must serialize them.
3. Tear down: `/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D data stop -m fast && rm -rf data`.
