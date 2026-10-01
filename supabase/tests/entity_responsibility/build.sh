#!/bin/bash
# usage: build.sh <repo> [extra migration files...]  -> fresh db "zmr" on $ZMR_TEST_PGPORT (default 55433)
set -u
PG=/opt/homebrew/opt/postgresql@17/bin; D=$(dirname "$0"); REPO=$1; shift
PORT=${ZMR_TEST_PGPORT:-55433}
$PG/pg_ctl -D $D/data stop -m fast >/dev/null 2>&1; rm -rf $D/data
# Never reuse a port another session's server holds: connecting to it would
# run this suite against someone else's database.
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port $PORT is in use by another server; set ZMR_TEST_PGPORT to a free port" >&2; exit 1
fi
$PG/initdb -D $D/data -U postgres --auth=trust >/dev/null && $PG/pg_ctl -D $D/data -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l $D/pg.log start >/dev/null && sleep 1
P="$PG/psql -h 127.0.0.1 -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "create database zmr" && $P -d zmr -f $D/bootstrap.sql || exit 1
for f in $REPO/supabase/migrations/*.sql "$@"; do
  $P -d zmr -f "$f" >/dev/null 2>$D/err.txt || { echo "FAILED: $f"; cat $D/err.txt; exit 1; }
done
echo "applied $(ls $REPO/supabase/migrations/*.sql | wc -l) repo migrations + $# extra"
