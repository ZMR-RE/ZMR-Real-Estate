#!/bin/bash
# usage: build.sh <migrations-dir> -> fresh disposable db "zmr" on 127.0.0.1:55438 with every
# migration in <migrations-dir> applied in order. Local throwaway Postgres only — never Practice or production.
set -u
PG=/opt/homebrew/opt/postgresql@17/bin; D=$(cd "$(dirname "$0")" && pwd); M=$1
$PG/pg_ctl -D $D/data stop -m fast >/dev/null 2>&1; rm -rf $D/data
$PG/initdb -D $D/data -U postgres --auth=trust >/dev/null && $PG/pg_ctl -D $D/data -o "-p 55438 -k '' -c listen_addresses=127.0.0.1" -l $D/pg.log start >/dev/null && sleep 1
P="$PG/psql -h 127.0.0.1 -p 55438 -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "create database zmr" && $P -d zmr -f $D/bootstrap.sql || exit 1
for f in $M/*.sql; do
  $P -d zmr -f "$f" >/dev/null 2>$D/err.txt || { echo "FAILED: $f"; cat $D/err.txt; exit 1; }
done
echo "applied $(ls $M/*.sql | wc -l) migrations"
