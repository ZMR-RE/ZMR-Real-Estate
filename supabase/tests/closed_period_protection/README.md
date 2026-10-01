# Closed-period protection — disposable-database checks (M6, T2)

Local, throwaway Postgres only. Never point these at Practice or production.

1. `./build.sh <repo-root>` — fresh cluster on 127.0.0.1:${ZMR_TEST_PGPORT:-55433} (refuses a port already in use) (data dir next to
   this file, `data/`, git-ignored by path), minimal stand-ins for Supabase's
   `auth`/`storage` schemas and roles (`bootstrap.sql`), then every file in
   `supabase/migrations/` in order.
2. `psql -h 127.0.0.1 -p ${ZMR_TEST_PGPORT:-55433} -U postgres -d zmr -f setup.sql` — fictional
   two-account fixtures and the `t(name, sql, expected_sqlstate)` helper.
3. `psql ... -f tests.sql` — rule checks run as the `authenticated` role with a
   simulated signed-in user (RLS applies). Every line prints PASS/FAIL.
4. `bash concurrency.sh` — lock-versus-write races between two sessions.
5. Tear down: `pg_ctl -D data stop -m fast && rm -rf data`.

Evidence recorded Sept 28, 2026 (local Postgres 17, not hosted Supabase):
35/35 PASS, 4/4 concurrency cases serialized correctly, and a control run
with the advisory locks removed reproduced the race (a write landed inside
a year being locked).
