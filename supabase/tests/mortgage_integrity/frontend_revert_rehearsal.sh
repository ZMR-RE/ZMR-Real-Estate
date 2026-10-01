#!/bin/bash
# Rehearsal of supabase/recovery/mortgage_integrity/frontend_scoped_revert.sh (T1) on a throwaway clone. Never pushes.
#   ./frontend_revert_rehearsal.sh [release_commit] [live_base]   (defaults: this checkout's HEAD, live 4f696c3)
# Simulates main = the release + later unrelated work, runs the scoped revert, checks preservation, checks the
# refusals, then reintroduces the application by reverting the revert. Type-checks both states (needs node_modules).
set -u
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../../.." && pwd)
RELEASE=${1:-$(git -C "$REPO" rev-parse HEAD)}
BASE=${2:-4f696c3f4f60cc5df6807d37f3790ec7c2f99ff8}
SCRIPT="$REPO/supabase/recovery/mortgage_integrity/frontend_scoped_revert.sh"
WORK=$(mktemp -d /tmp/zmr-mortgage-revert.XXXXXX); trap 'rm -rf "$WORK"' EXIT
FAIL=0; r() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  [expected '$3' got '$2']"; FAIL=1; fi; }
NM=$(cd "$REPO" && pwd)/node_modules; [ -d "$NM" ] || NM=$(ls -d "$REPO"/../ZMR-Real-Estate-T1-MortgageReleaseB/node_modules 2>/dev/null)

C="$WORK/main"; git clone -q --no-local "$REPO" "$C" && cd "$C" && git remote set-url --push origin DISABLED
git checkout -q -B main "$RELEASE"
git config user.email t1-rehearsal@example.test; git config user.name "T1 rehearsal"
# later unrelated work after the release (an app file the release didn't touch + a record)
echo "// later unrelated change (rehearsal)" >> src/modules/automations/Automations.tsx
echo "later unrelated note (rehearsal)" >> docs/planning/mortgage/ZMR-mortgage-integrity-implementation.md
git commit -qam "later unrelated work (rehearsal)"; LATER=$(git rev-parse HEAD)
APP=$(git diff --name-only "$BASE" "$RELEASE" | grep -v -E '^(supabase|docs)/' | grep -v -E '^[^/]+\.md$')
echo "release application files: $(echo "$APP" | wc -l | tr -d ' ')"

# refusal: dirty tree
echo x >> package.json; out=$("$SCRIPT" "$C" "$RELEASE" "$BASE" 2>&1); r "refuses a dirty tree" "$(echo "$out" | grep -c 'not clean')" "1"; git checkout -q package.json
# refusal: a later commit touching a release application file (on a side branch)
git checkout -q -b side; F1=$(echo "$APP" | head -1); echo "// touched later" >> "$F1"; git commit -qam "later edit of a release file"
out=$("$SCRIPT" "$C" "$RELEASE" "$BASE" 2>&1); r "refuses when a later commit touched a release application file" "$(echo "$out" | grep -c 'later commits touch')" "1"
git checkout -q main; git branch -q -D side

# the scoped revert itself
"$SCRIPT" "$C" "$RELEASE" "$BASE" >/dev/null || { echo "FAIL  scoped revert did not run"; exit 1; }
REV=$(git rev-parse HEAD)
r "one commit on top of the later work" "$(git rev-parse HEAD~1)" "$LATER"
r "supabase/** unchanged (applied migration, tests, recovery drafts kept)" "$(git diff --name-only "$RELEASE" HEAD -- supabase | wc -l | tr -d ' ')" "0"
r "applied migration file still present" "$(test -f supabase/migrations/20261004100000_mortgage_balance_integrity.sql && echo yes)" "yes"
r "docs/** kept (including the later note)" "$(git diff --name-only "$LATER" HEAD -- docs | wc -l | tr -d ' ')" "0"
r "every release application file is back to the live base" "$(git diff --name-only "$BASE" HEAD -- $APP | wc -l | tr -d ' ')" "0"
r "later unrelated app change preserved" "$(grep -c 'later unrelated change (rehearsal)' src/modules/automations/Automations.tsx)" "1"
if [ -d "$NM" ]; then ln -s "$NM" node_modules; r "reverted application type-checks" "$(npx tsc -b --noEmit >/dev/null 2>&1 && echo ok)" "ok"; rm -f node_modules; fi

# reintroduction by reverting the revert
git revert --no-edit "$REV" >/dev/null 2>&1 || { echo "FAIL  revert of the revert did not apply"; exit 1; }
r "reintroduced: application files equal the release again" "$(git diff --name-only "$RELEASE" HEAD -- $APP | wc -l | tr -d ' ')" "0"
r "reintroduced: supabase/** still unchanged" "$(git diff --name-only "$RELEASE" HEAD -- supabase | wc -l | tr -d ' ')" "0"
r "reintroduced: later unrelated change still there" "$(grep -c 'later unrelated change (rehearsal)' src/modules/automations/Automations.tsx)" "1"
if [ -d "$NM" ]; then ln -s "$NM" node_modules; r "reintroduced application type-checks" "$(npx tsc -b --noEmit >/dev/null 2>&1 && echo ok)" "ok"; rm -f node_modules; fi
r "nothing was pushed (push URL disabled)" "$(git remote get-url --push origin)" "DISABLED"
exit $FAIL
