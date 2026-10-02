#!/bin/bash
# ZMR — mortgage balance integrity: GUARDED PRODUCTION MIGRATION (T1; for T3 review; run only in an approved window).
# Run by the OWNER in their own Terminal, AFTER the fresh verified backup:
#   bash ~/ZMR-Backups-Private/mortgage-integrity-release.sh <clean-clone-path>
# <clean-clone-path>: a fresh clone T1 prepares at exactly the release commit, linked to PRODUCTION (no secrets in it).
# Applies exactly one migration, 20261004100000, as a plain push (it is the newest). Stops before any change unless every
# check passes. The password is typed at a hidden prompt, kept only in this process, never printed or stored.
# Does NOT deploy the frontend (that is T1's separate exact-commit push after this script reports DONE).
set -euo pipefail
umask 077
REF=jsrovnaxrtllvvavfqvq
BIN=/opt/homebrew/opt/postgresql@17/bin
DIR=~/ZMR-Backups-Private
RELEASE=6d9bd623558725a2aa8cc19b6d8610663df9c219
MIG=20261004100000
MIGFILE=supabase/migrations/20261004100000_mortgage_balance_integrity.sql
MIG_BLOB=b279fcb47bf4ed0fae53e6872918ac6084fe97d1          # identical to T3-cleared abf2b35
PRE_SHA=5503e14ecc00f0258a6bf613a96ab6a0005ae507d9093ce2d4e49a0603fb4469
POST_SHA=cfcd2585d20b1de1f4dfdef06600125e55c969794a370e20162f76eef8afa7a9
FP_SHA=cf8d0bc05bd426e8f6cdd125f885216eb5c9da8db19bc00c4016bdfcf31e9788
CLONE=${1:?usage: mortgage-integrity-release.sh <clean-clone-path>}
TS=$(date +%Y%m%d-%H%M%S)
OUT="$DIR/integrity-release-$TS"
[ -e "$OUT" ] && { echo "STOP: $OUT exists — wait a second and run again"; exit 1; }
mkdir -m 700 "$OUT"
exec > >(tee "$OUT/release.log") 2>&1
trap 'unset SUPABASE_DB_PASSWORD PGPASSWORD' EXIT
echo "== Mortgage integrity migration (guarded) — evidence: $OUT"

# 1. Pinned files and the clone (no database access yet)
for f in pre:$PRE_SHA post:$POST_SHA fingerprint:$FP_SHA; do
  n=${f%%:*}; want=${f#*:}
  [ "$(shasum -a 256 "$DIR/integrity-release-$n.sql" | cut -d' ' -f1)" = "$want" ] || { echo "STOP: integrity-release-$n.sql is not the reviewed version"; exit 1; }
done
cd "$CLONE"
[ "$(git rev-parse HEAD)" = "$RELEASE" ] || { echo "STOP: clone is not at $RELEASE"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "STOP: clone has local changes"; exit 1; }
[ "$(git rev-parse HEAD:$MIGFILE)" = "$MIG_BLOB" ] || { echo "STOP: migration file differs from the reviewed one"; exit 1; }
[ "$(cat supabase/.temp/project-ref 2>/dev/null)" = "$REF" ] || { echo "STOP: clone is not linked to production"; exit 1; }
LOCAL=$(ls supabase/migrations/*.sql | sed -E 's#.*/([0-9]{14})_.*#\1#' | sort)
[ "$(echo "$LOCAL" | grep -c .)" = 120 ] || { echo "STOP: expected 120 local migration files"; exit 1; }

# 2. Window confirmations and backup gate
read -r -p "Dashboard editing is paused (no one is entering data)? Type yes: " ok; [ "$ok" = yes ] || { echo "Stopped."; exit 1; }
read -r -p "Name of the backup verified in this window (e.g. 20261003-101500.tar.gz.enc): " BK
BKF="$DIR/$(basename "$BK")"
[ -f "$BKF" ] && [ -f "$BKF.sha256" ] || { echo "STOP: backup or its .sha256 not found"; exit 1; }
( cd "$DIR" && shasum -a 256 -c "$(basename "$BKF").sha256" >/dev/null 2>&1 ) || { echo "STOP: backup checksum does not match"; exit 1; }
AGE=$(( $(date +%s) - $(stat -f %m "$BKF") )); [ "$AGE" -le 10800 ] || { echo "STOP: backup older than 3 hours"; exit 1; }
echo "backup: $(basename "$BKF") — checksum OK, $AGE s old"

# 3. Connect (no password is sent if the server is unreachable)
"$BIN/pg_isready" -h "db.$REF.supabase.co" -p 5432 -t 8 >/dev/null 2>&1 || { echo "STOP: database not reachable (no password sent)"; exit 1; }
read -r -s -p "Production database password (hidden): " SUPABASE_DB_PASSWORD; echo
export SUPABASE_DB_PASSWORD PGPASSWORD="$SUPABASE_DB_PASSWORD" PGHOST="db.$REF.supabase.co" PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGSSLMODE=require
RO() { PGOPTIONS='-c default_transaction_read_only=on' "$BIN/psql" -X -q -v ON_ERROR_STOP=1 "$@"; }
if ! RO -t -c "select 1" >/dev/null 2>&1; then echo "STOP: connection failed. Do NOT retry the password. Tell T1."; exit 1; fi

# 4. Exact pending set (read-only)
REMOTE=$(RO -t -A -c "select version from supabase_migrations.schema_migrations order by version")
PENDING=$(comm -23 <(echo "$LOCAL") <(echo "$REMOTE" | sort))
REMOTE_ONLY=$(comm -13 <(echo "$LOCAL") <(echo "$REMOTE" | sort))
echo "remote: $(echo "$REMOTE" | grep -c .) ; pending: [$PENDING] ; remote-only: [$REMOTE_ONLY]"
[ "$(echo "$REMOTE" | grep -c .)" = 119 ] && [ "$PENDING" = "$MIG" ] && [ -z "$REMOTE_ONLY" ] || { echo "STOP: pending set is not exactly $MIG"; exit 1; }

# 5. Preflight + fingerprint of every existing field (read-only)
RO -f "$DIR/integrity-release-pre.sql" || { echo "STOP: preflight failed (nothing changed)"; exit 1; }
RO -f "$DIR/integrity-release-fingerprint.sql" > "$OUT/fingerprint-before.txt"
echo "fingerprint before: $(wc -l < "$OUT/fingerprint-before.txt") lines, sha256 $(shasum -a 256 "$OUT/fingerprint-before.txt" | cut -c1-16)…"

# 6. Dry run must list only the migration
DRY=$(supabase db push --linked --dry-run 2>&1 | sed -E 's#(postgres(ql)?://)[^@ ]*@#\1***@#g'); echo "$DRY"
LISTED=$(echo "$DRY" | grep -oE '[0-9]{14}_[a-z0-9_]+\.sql' | sort -u)
[ "$LISTED" = "20261004100000_mortgage_balance_integrity.sql" ] || { echo "STOP: dry run lists something else (nothing changed)"; exit 1; }

# 7. Apply (plain push: no --include-all)
echo "== Applying $MIG at $(date -u +%H:%M:%S) UTC"
supabase db push --linked --yes 2>&1 | sed -E 's#(postgres(ql)?://)[^@ ]*@#\1***@#g'

# 8. Post-apply checks (read-only). A failure here is reported, never auto-reverted (the database is never rolled back).
RO -f "$DIR/integrity-release-post.sql" || { echo "STOP-AFTER-APPLY: post-apply checks failed. Keep editing paused; tell T1 (recovery per packet §5)."; exit 2; }
RO -f "$DIR/integrity-release-fingerprint.sql" > "$OUT/fingerprint-after.txt"
if diff "$OUT/fingerprint-before.txt" "$OUT/fingerprint-after.txt" > "$OUT/fingerprint-diff.txt"; then
  echo "existing fields: IDENTICAL before/after (every table)"
else
  echo "STOP-AFTER-APPLY: existing data changed (see fingerprint-diff.txt). Keep editing paused; tell T1."; exit 2
fi
echo "== DONE: migration $MIG applied (119 -> 120), checks passed. Tell T1: 'migration finished'. Editing stays paused for the frontend step."
