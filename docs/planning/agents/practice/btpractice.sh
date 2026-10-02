#!/bin/bash
# T4 READ-ONLY Practice runner for the billing + tenant hosted checks.
# There is no push, apply or write mode. Runs only in T4's own scratch clone of
# the test build; refuses unless that clone is linked to PRACTICE's ref
# (never production's) and is at exactly BT_BUILD. Prints no secrets.
#
#   ledger   read Practice's actual migration list (saved to bt-ledger.txt) and
#            compare it with the build: every build migration must already be
#            applied (pending must be none); Practice-only versions are listed.
#   select   one read-only SELECT/WITH statement
# Test hook (offline only): BT_FAKE_LEDGER=<file> replaces the live read.
set -u
S=${BT_SCRATCH:?set BT_SCRATCH to T4 session scratchpad}
A=${BT_CLONE:-$S/bt_practice}
MAIN=/Users/janki/Projects/ZMR-Real-Estate
BUILD=${BT_BUILD:?set BT_BUILD to the full test-build hash}
LEDGER=$S/bt-ledger.txt

guard() {
  [ -n "${BT_FAKE_LEDGER:-}" ] && return 0
  PRAC=$(grep -o 'https://[a-z0-9]*' "$MAIN/envs/practice/.env" | head -1 | sed 's#https://##')
  PROD=$(grep -o 'https://[a-z0-9]*' "$MAIN/.env" | head -1 | sed 's#https://##')
  LINK=$(cat "$A/supabase/.temp/project-ref" 2>/dev/null)
  [ -n "$PRAC" ] && [ -n "$PROD" ] && [ "$PRAC" != "$PROD" ] || { echo "REFUSED: cannot establish refs" >&2; exit 2; }
  [ "$LINK" = "$PRAC" ] || { echo "REFUSED: clone is not linked to Practice" >&2; exit 3; }
  [ "$LINK" != "$PROD" ] || { echo "REFUSED: clone is linked to PRODUCTION" >&2; exit 3; }
}
head_ok() { [ "$(git -C "$A" rev-parse HEAD)" = "$BUILD" ] || { echo "REFUSED: clone is not at $BUILD" >&2; exit 3; }; }
clean() { sed -E 's#(postgres(ql)?://)[^@ ]*@#\1***@#g' | grep -v -e 'new version of Supabase CLI' -e 'recommend updating regularly'; }
remote_versions() { awk -F'|' '/^ +[0-9 ]*\|/ {r=$2; gsub(/ /,"",r); if (r!="") print r}' "$LEDGER" | sort -u; }
local_versions() { ls "$A/supabase/migrations" | grep -oE '^[0-9]{14}' | sort -u; }

guard; head_ok
case "${1:-}" in
  ledger)
    if [ -n "${BT_FAKE_LEDGER:-}" ]; then cp "$BT_FAKE_LEDGER" "$LEDGER"
    else supabase migration list --linked --workdir "$A" </dev/null 2>&1 | clean > "$LEDGER"; fi
    L=$(comm -13 <(remote_versions) <(local_versions) | tr '\n' ' ' | sed 's/ $//')
    R=$(comm -23 <(remote_versions) <(local_versions) | tr '\n' ' ' | sed 's/ $//')
    echo "remote applied: $(remote_versions | wc -l | tr -d ' ')  build migrations: $(local_versions | wc -l | tr -d ' ')"
    echo "build-not-applied (must be none): ${L:-none}"
    echo "practice-only (listed, assessed, never touched): ${R:-none}"
    [ -z "$L" ] || { echo "STOP: the build needs a migration Practice lacks; this plan applies none" >&2; exit 6; } ;;
  select)
    q="$2"
    echo "$q" | grep -qiE '^[[:space:]]*(select|with)[[:space:]]' || { echo "REFUSED: SELECT/WITH only" >&2; exit 7; }
    echo "$q" | grep -qiE ';|\b(insert|update|delete|alter|drop|create|grant|revoke|truncate|copy|call|do)\b' && { echo "REFUSED: write keyword" >&2; exit 7; }
    supabase db query --linked --workdir "$A" "$q" </dev/null 2>&1 | clean ;;
  *) echo "usage: ledger | select <sql>"; exit 1 ;;
esac
