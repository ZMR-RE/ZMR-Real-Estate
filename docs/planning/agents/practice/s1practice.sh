#!/bin/bash
# T4 guarded PRACTICE runner for the Stage 1 hosted checks (S1_CANDIDATE = the T3-cleared hash).
# Runs only in T4's own scratch clone of the candidate; refuses unless that
# clone is linked to PRACTICE's ref (never production's). Prints no secrets.
#
#   ledger   read Practice's actual migration list (saved to s1-ledger.txt)
#   assemble mirror every Practice-applied migration the candidate lacks into
#            the scratch clone, pinned to the EXACT content Practice applied
#            (its recorded statements vs every local historical version;
#            s1_pin_versions.py); no match / ambiguity / no statements → STOP.
#            Then print local-not-remote / remote-not-local
#   dryrun   supabase db push --dry-run (with --include-all when required)
#   apply    push ONLY if local-not-remote is exactly the 9 Stage 1 versions and
#            remote-not-local is empty after assembly
#   select   one read-only SELECT/WITH statement
# Test hooks (offline only): S1_FAKE_LEDGER=<file> / S1_FAKE_APPLIED=<json> replace the live reads.
set -u
S=/private/tmp/claude-501/-Users-janki-Projects-ZMR-Real-Estate/d3dd1ee3-628f-4351-b22c-bb42a5b1b96e/scratchpad
A=${S1_CLONE:-$S/s1_practice_apply}
MAIN=/Users/janki/Projects/ZMR-Real-Estate
CANDIDATE=${S1_CANDIDATE:?set S1_CANDIDATE to the full T3-cleared candidate hash}
STAGE1="20261002100000 20261002110000 20261002115000 20261002120000 20261002125000 20261002130000 20261002140000 20261002150000 20261002160000"
LEDGER=$S/s1-ledger.txt

guard() {
  [ -n "${S1_FAKE_LEDGER:-}" ] && return 0
  PRAC=$(grep -o 'https://[a-z0-9]*' "$MAIN/envs/practice/.env" | head -1 | sed 's#https://##')
  PROD=$(grep -o 'https://[a-z0-9]*' "$MAIN/.env" | head -1 | sed 's#https://##')
  LINK=$(cat "$A/supabase/.temp/project-ref" 2>/dev/null)
  [ -n "$PRAC" ] && [ -n "$PROD" ] && [ "$PRAC" != "$PROD" ] || { echo "REFUSED: cannot establish refs" >&2; exit 2; }
  [ "$LINK" = "$PRAC" ] || { echo "REFUSED: clone is not linked to Practice" >&2; exit 3; }
  [ "$LINK" != "$PROD" ] || { echo "REFUSED: clone is linked to PRODUCTION" >&2; exit 3; }
}
head_ok() { [ "$(git -C "$A" rev-parse HEAD)" = "$CANDIDATE" ] || { echo "REFUSED: clone is not at $CANDIDATE" >&2; exit 3; }; }
clean() { sed -E 's#(postgres(ql)?://)[^@ ]*@#\1***@#g' | grep -v -e 'new version of Supabase CLI' -e 'recommend updating regularly'; }
remote_versions() { awk -F'|' '/^ +[0-9 ]*\|/ {r=$2; gsub(/ /,"",r); if (r!="") print r}' "$LEDGER" | sort -u; }
local_versions() { ls "$A/supabase/migrations" | grep -oE '^[0-9]{14}' | sort -u; }

guard; head_ok
case "${1:-}" in
  ledger)
    if [ -n "${S1_FAKE_LEDGER:-}" ]; then cp "$S1_FAKE_LEDGER" "$LEDGER"
    else supabase migration list --linked --workdir "$A" </dev/null 2>&1 | clean > "$LEDGER"; fi
    echo "remote applied: $(remote_versions | wc -l | tr -d ' ')"; remote_versions | tail -6 ;;
  assemble)
    [ -s "$LEDGER" ] || { echo "Run ledger first" >&2; exit 4; }
    RO=$(comm -23 <(remote_versions) <(local_versions) | tr '\n' ' ' | sed 's/ $//')
    if [ -n "$RO" ]; then
      # Pin each Practice-only version to the exact content Practice applied
      # (its recorded statements), never just the first file in history.
      APPLIED=$S/s1-applied.json
      if [ -n "${S1_FAKE_APPLIED:-}" ]; then cp "$S1_FAKE_APPLIED" "$APPLIED"
      else
        IN=$(echo "$RO" | sed "s/[0-9]\{14\}/'&'/g; s/ /,/g")
        supabase db query --linked --workdir "$A" "select version, name, statements from supabase_migrations.schema_migrations where version in ($IN)" </dev/null 2>/dev/null \
          | sed -n '/^{/,$p' > "$APPLIED"
      fi
      python3 "$(dirname "$0")/s1_pin_versions.py" "$MAIN" "$A" "$APPLIED" $RO || exit 5
    fi
    L=$(comm -13 <(remote_versions) <(local_versions) | tr '\n' ' ' | sed 's/ $//')
    R=$(comm -23 <(remote_versions) <(local_versions) | tr '\n' ' ' | sed 's/ $//')
    echo "local-not-remote: ${L:-none}"
    echo "remote-not-local: ${R:-none}"
    later=$(remote_versions | awk -v m=20261002100000 '$1 > m' | tr '\n' ' ')
    echo "applied versions later than Stage 1's first: ${later:-none} → $( [ -n "$later" ] && echo 'needs --include-all' || echo 'plain push')" ;;
  dryrun|apply)
    [ -s "$LEDGER" ] || { echo "Run ledger and assemble first" >&2; exit 4; }
    L=$(comm -13 <(remote_versions) <(local_versions) | tr '\n' ' ' | sed 's/ $//')
    R=$(comm -23 <(remote_versions) <(local_versions) | tr '\n' ' ' | sed 's/ $//')
    [ "$L" = "$STAGE1" ] && [ -z "$R" ] || { echo "REFUSED: pending set is not exactly the 9 Stage 1 versions (local-not-remote: ${L:-none}; remote-not-local: ${R:-none})" >&2; exit 6; }
    later=$(remote_versions | awk -v m=20261002100000 '$1 > m')
    FLAG=""; [ -n "$later" ] && FLAG="--include-all"
    if [ "$1" = dryrun ]; then supabase db push --linked --dry-run $FLAG --workdir "$A" </dev/null 2>&1 | clean
    else supabase db push --linked --yes $FLAG --workdir "$A" </dev/null 2>&1 | clean; fi ;;
  select)
    q="$2"
    echo "$q" | grep -qiE '^[[:space:]]*(select|with)[[:space:]]' || { echo "REFUSED: SELECT/WITH only" >&2; exit 7; }
    echo "$q" | grep -qiE ';|\b(insert|update|delete|alter|drop|create|grant|revoke|truncate|copy|call|do)\b' && { echo "REFUSED: write keyword" >&2; exit 7; }
    supabase db query --linked --workdir "$A" "$q" </dev/null 2>&1 | clean ;;
  *) echo "usage: ledger|assemble|dryrun|apply|select <sql>"; exit 1 ;;
esac
