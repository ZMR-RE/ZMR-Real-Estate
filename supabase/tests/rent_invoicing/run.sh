#!/bin/bash
# usage: run.sh <repo>  -> build fresh DB, load fixtures, run rule checks.
set -u
D=$(cd "$(dirname "$0")" && pwd)
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql -h 127.0.0.1 -p 55434 -U postgres -d zmr -X -t"
$D/build.sh "$1" || exit 1
$PSQL -v ON_ERROR_STOP=1 -q -f $D/setup.sql >/dev/null || exit 1
( $PSQL -q -f $D/tests.sql; $PSQL -q -f $D/storage.sql; $PSQL -q -f $D/old_client.sql ) 2>&1 | sed -E 's/^psql:[^ ]+ (NOTICE|ERROR): +//' | grep -vE '^\s*$'
