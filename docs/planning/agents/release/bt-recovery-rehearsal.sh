#!/bin/bash
# Local rehearsal of bt-scoped-recovery.sh (T4). Scratch clone only: never pushes,
# fetches or touches any remote, deploy, account or database.
#
# usage: bt-recovery-rehearsal.sh <source-repo> <scratch-dir> [--with-build]
#   <source-repo> must contain d9cdcb3 and 179e56b. <scratch-dir> must not exist.
#   --with-build also runs npm ci, build and vitest at base, recovery and reintroduction.
set -uo pipefail
SRC=${1:?source repo}; S=${2:?scratch dir}; BUILD=${3:-}
HERE=$(cd "$(dirname "$0")" && pwd); TOOL=$HERE/bt-scoped-recovery.sh
BASE=d9cdcb3aa4aec84c68c78b183593b2a130ede3d7
RELEASE=179e56b747ef8284cd24af8339a34bb6a3c04470
[ -e "$S" ] && { echo "scratch dir exists: $S" >&2; exit 1; }
git clone -q "$SRC" "$S" && cd "$S" && git remote remove origin
git config user.name "T4 rehearsal"; git config user.email "noreply@example.test"
PASS=0; FAILN=0
ok()  { echo "PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "FAIL  $1"; FAILN=$((FAILN+1)); }
check() { if eval "$2"; then ok "$1"; else bad "$1"; fi; }
keep() { [[ "$1" == supabase/* || "$1" == docs/* || ( "$1" != */* && "$1" == *.md ) ]]; }
blob() { git rev-parse -q --verify "$1:$2" 2>/dev/null || echo absent; }
FILES=(); while IFS= read -r f; do keep "$f" || FILES+=("$f"); done < <(git diff --name-only --no-renames "$BASE" "$RELEASE")
echo "release application files: ${#FILES[@]}"

# Released main = RELEASE (fast-forward from BASE), then later unrelated work U.
git checkout -q -b rehearsal-main "$RELEASE"
UNREL=src/shared/usStates.ts
printf '%s\n' "${FILES[@]}" | grep -qxF "$UNREL" && { echo "pick another unrelated file" >&2; exit 1; }
mkdir -p src/rehearsal docs/rehearsal
cat > src/rehearsal/u.test.ts <<'EOF'
import { expect, it } from 'vitest'
it('later unrelated work U survives the recovery', () => expect(1 + 1).toBe(2))
EOF
echo '// rehearsal: later unrelated edit (U)' >> "$UNREL"
echo '-- rehearsal only: fictional later migration, never applied anywhere' > supabase/migrations/20261006000000_rehearsal_unrelated.sql
echo 'Rehearsal: later docs note (U).' > docs/rehearsal/u.md
git add -A && git commit -q -m "U: later unrelated work (rehearsal)"; U=$(git rev-parse HEAD)

# 1. Show the R1 gap: reverting only the final merge misses most release files.
FINAL_ONLY=$(git diff --name-only "$RELEASE^1" "$RELEASE" | while read -r f; do keep "$f" || echo "$f"; done | wc -l | tr -d ' ')
check "R1 gap: final merge alone covers $FINAL_ONLY of ${#FILES[@]} application files" '[ "$FINAL_ONLY" -lt "${#FILES[@]}" ]'

# 2. Refusals (each leaves HEAD unchanged).
git checkout -q -b refuse-dirty "$U"; echo x >> "$UNREL"
bash "$TOOL" "$S" >/dev/null 2>&1; rc=$?; git checkout -q -- "$UNREL"
check "refuses a dirty tree (exit 2, HEAD unchanged)" '[ $rc -eq 2 ] && [ "$(git rev-parse HEAD)" = "$U" ]'
git checkout -q -b refuse-norelease "$BASE"
bash "$TOOL" "$S" >/dev/null 2>&1; rc=$?
check "refuses a HEAD without the release (exit 2)" '[ $rc -eq 2 ] && [ "$(git rev-parse HEAD)" = "$BASE" ]'
git checkout -q -b refuse-later "$U"; echo '// later edit to a release file' >> src/modules/leases/LeaseForm.tsx
git commit -qam "later edit to a release application file"; L=$(git rev-parse HEAD)
OUT=$(bash "$TOOL" "$S" 2>&1); rc=$?
check "refuses a later edit to a release file (exit 3, names the commit, HEAD unchanged)" '[ $rc -eq 3 ] && echo "$OUT" | grep -q "${L:0:7}" && [ "$(git rev-parse HEAD)" = "$L" ]'
git checkout -q rehearsal-main

# 3. Dry run changes nothing.
bash "$TOOL" "$S" --dry-run >/dev/null; check "dry run leaves HEAD and tree unchanged" '[ "$(git rev-parse HEAD)" = "$U" ] && [ -z "$(git status --porcelain)" ]'

# 4. Recovery.
bash "$TOOL" "$S" || { echo "recovery failed" >&2; exit 1; }; R=$(git rev-parse HEAD)
check "one recovery commit on top of U" '[ "$(git rev-parse "$R^")" = "$U" ]'
check "recovery commit touches only release application files" \
  '[ -z "$(comm -23 <(git diff --name-only --no-renames "$U" "$R" | sort) <(printf "%s\n" "${FILES[@]}" | sort))" ]'
check "nothing under docs/, supabase/ or root *.md changed" \
  '[ -z "$(git diff --name-only "$U" "$R" -- docs supabase "*.md" | grep -v "/" ; git diff --name-only "$U" "$R" -- docs supabase)" ]'
MIS=0; for f in "${FILES[@]}"; do [ "$(blob "$R" "$f")" = "$(blob "$BASE" "$f")" ] || MIS=$((MIS+1)); done
check "all ${#FILES[@]} release application files equal $BASE (or absent)" '[ $MIS -eq 0 ]'
# Application tree (everything outside kept paths) = BASE + U's application changes, exactly.
APPMIS=$(comm -3 \
  <(git ls-tree -r "$R" | awk '{print $4"\t"$3}' | while IFS=$'\t' read -r p b; do keep "$p" || echo "$p $b"; done | sort) \
  <( { git ls-tree -r "$BASE" | awk '{print $4"\t"$3}' | while IFS=$'\t' read -r p b; do keep "$p" || [ "$p" = "$UNREL" ] || echo "$p $b"; done; \
       echo "$UNREL $(blob "$U" "$UNREL")"; echo "src/rehearsal/u.test.ts $(blob "$U" src/rehearsal/u.test.ts)"; } | sort) | wc -l | tr -d ' ')
check "application tree = base + later unrelated work U, exactly (0 differing paths)" '[ "$APPMIS" -eq 0 ]'
KEEPMIS=$(comm -3 <(git ls-tree -r "$R" -- docs supabase | sort) <(git ls-tree -r "$U" -- docs supabase | sort) | wc -l | tr -d ' ')
check "docs/ (incl. all evidence) and supabase/ identical to pre-recovery main" '[ "$KEEPMIS" -eq 0 ]'
check "root *.md (CLAUDE.md, DESIGN-SYSTEM.md, ...) identical to pre-recovery main" \
  '[ -z "$(git diff --name-only "$U" "$R" -- $(git ls-tree --name-only "$R" | grep "\.md$"))" ]'
check "U's unrelated edit and test still present" '[ "$(blob "$R" "$UNREL")" = "$(blob "$U" "$UNREL")" ] && [ "$(blob "$R" src/rehearsal/u.test.ts)" != absent ]'

# 5. Re-merging the release is a no-op (so it can't reintroduce it).
MOUT=$(git merge --no-edit "$RELEASE" 2>&1); check "re-merging $RELEASE is a no-op (Already up to date)" 'echo "$MOUT" | grep -q "Already up to date" && [ "$(git rev-parse HEAD)" = "$R" ]'

# 6. Reintroduce: later work U2, then revert the recovery commit.
echo '// rehearsal: second later edit (U2)' >> "$UNREL"; git commit -qam "U2: later unrelated work (rehearsal)"; U2=$(git rev-parse HEAD)
git revert --no-edit "$R" >/dev/null; RI=$(git rev-parse HEAD)
MIS2=0; for f in "${FILES[@]}"; do [ "$(blob "$RI" "$f")" = "$(blob "$RELEASE" "$f")" ] || MIS2=$((MIS2+1)); done
check "reintroduced: all release application files equal $RELEASE again" '[ $MIS2 -eq 0 ]'
check "reintroduced tree differs from $RELEASE only by U/U2 paths" \
  '[ -z "$(git diff --name-only "$RELEASE" "$RI" | grep -vxF -e "$UNREL" -e src/rehearsal/u.test.ts -e supabase/migrations/20261006000000_rehearsal_unrelated.sql -e docs/rehearsal/u.md)" ]'

if [ "$BUILD" = "--with-build" ]; then
  tests() { npx vitest run 2>&1 | sed -n 's/.*Tests *\([0-9]*\) passed.*/\1/p' | tail -1; }
  npm ci --silent >/dev/null 2>&1
  git checkout -q "$BASE"; TB=$(tests)
  git checkout -q "$R";    npm run build >/dev/null 2>&1; BR=$?; TR=$(tests)
  git checkout -q "$RI";   npm run build >/dev/null 2>&1; BI=$?; TI=$(tests)
  git checkout -q "$RELEASE"; TL=$(tests)
  check "recovery builds; tests = base $TB + U 1 (got $TR)" '[ $BR -eq 0 ] && [ "$TR" -eq $((TB+1)) ]'
  check "reintroduced builds; tests = release $TL + U 1 (got $TI)" '[ $BI -eq 0 ] && [ "$TI" -eq $((TL+1)) ]'
  git checkout -q rehearsal-main
fi
echo "summary: $PASS passed, $FAILN failed (base $BASE, release $RELEASE, U $U, recovery $R, reintroduced $RI)"
[ $FAILN -eq 0 ]
