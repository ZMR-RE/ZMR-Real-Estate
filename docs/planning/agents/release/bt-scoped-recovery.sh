#!/bin/bash
# Billing issuer + tenant entry release: scoped application recovery (T4).
# Local git only: it never pushes, fetches or touches any remote or deploy.
#
# The release fast-forwards main from BASE (live d9cdcb3) to RELEASE (3ef4b62)
# through a CHAIN of merges (billing 588388f, tenant 2d8aa76/5692647, T2
# dropdown 999d716, docs). Reverting only the final merge would undo just the
# last delta (finding R1), so this restores EVERY application file changed
# anywhere in BASE..RELEASE to its BASE content, on top of current main, and
# keeps:
#   - documentation, evidence and project records (docs/**, root *.md);
#   - migrations and database tests (supabase/**; this release has none);
#   - all newer unrelated work.
#
# usage: bt-scoped-recovery.sh <repo-checkout-on-current-main> [--dry-run]
#   Creates ONE commit on the checked-out branch, or with --dry-run only prints
#   the plan. It refuses, changing nothing, if:
#   - the working tree isn't clean (exit 2);
#   - RELEASE isn't in HEAD's history, or BASE isn't RELEASE's ancestor (exit 2);
#   - any file to restore was changed by a commit after RELEASE (exit 3).
#     Then stop and fix forward with the same scope; don't widen it.
#   It verifies the staged result before committing (exit 4 on mismatch,
#   leaving HEAD unchanged and the index reset).
set -euo pipefail
REPO=${1:?usage: bt-scoped-recovery.sh <repo> [--dry-run]}
DRY=${2:-}
BASE=d9cdcb3aa4aec84c68c78b183593b2a130ede3d7     # live production before this release
RELEASE=3ef4b6273ec0457a90082a3069aa38520c353187  # billing + tenant + dropdown release candidate
cd "$REPO"

[ -z "$(git status --porcelain)" ] || { echo "REFUSED: working tree not clean" >&2; exit 2; }
git cat-file -e "$RELEASE^{commit}" 2>/dev/null || { echo "REFUSED: $RELEASE not present" >&2; exit 2; }
git merge-base --is-ancestor "$RELEASE" HEAD || { echo "REFUSED: $RELEASE is not in HEAD's history" >&2; exit 2; }
git merge-base --is-ancestor "$BASE" "$RELEASE" || { echo "REFUSED: $BASE is not an ancestor of $RELEASE" >&2; exit 2; }

keep() { [[ "$1" == supabase/* || "$1" == docs/* || ( "$1" != */* && "$1" == *.md ) ]]; }
FILES=()
while IFS= read -r f; do keep "$f" || FILES+=("$f"); done < <(git diff --name-only --no-renames "$BASE" "$RELEASE")
[ ${#FILES[@]} -gt 0 ] || { echo "REFUSED: no application files in $BASE..$RELEASE" >&2; exit 2; }

# Any commit after RELEASE touching a file to restore? Stop: no silent loss of newer work.
LATER=$(git log --format=%h "$RELEASE"..HEAD -- "${FILES[@]}" | tr '\n' ' ')
[ -z "$LATER" ] || { echo "REFUSED: later commits touch release application files: $LATER" >&2; exit 3; }

ADDED=0; RESTORED=0
for f in "${FILES[@]}"; do
  if git cat-file -e "$BASE:$f" 2>/dev/null; then RESTORED=$((RESTORED+1)); else ADDED=$((ADDED+1)); fi
done
echo "plan: ${#FILES[@]} application files from $BASE..$RELEASE ($RESTORED restored to base, $ADDED added by the release and removed)"
if [ "$DRY" = "--dry-run" ]; then printf '  %s\n' "${FILES[@]}"; exit 0; fi

for f in "${FILES[@]}"; do
  if git cat-file -e "$BASE:$f" 2>/dev/null; then git checkout -q "$BASE" -- "$f"; else git rm -q -- "$f"; fi
done

# Verify the staged tree before committing.
fail() { echo "VERIFY FAILED: $1" >&2; git reset -q --hard HEAD; exit 4; }
STAGED=$(git diff --cached --name-only --no-renames)
while IFS= read -r s; do
  [ -z "$s" ] && continue
  keep "$s" && fail "kept path staged: $s"
  printf '%s\n' "${FILES[@]}" | grep -qxF -- "$s" || fail "unexpected path staged: $s"
done <<< "$STAGED"
for f in "${FILES[@]}"; do
  if git cat-file -e "$BASE:$f" 2>/dev/null; then
    [ "$(git rev-parse ":$f")" = "$(git rev-parse "$BASE:$f")" ] || fail "$f differs from $BASE"
  else
    git cat-file -e ":$f" 2>/dev/null && fail "$f should be absent"
  fi
done

git commit -q -m "Recover: restore the billing issuer + tenant entry release's application files to $BASE (scoped)

Restores all ${#FILES[@]} application files changed anywhere in $BASE..$RELEASE
($RESTORED restored, $ADDED release-added files removed): billing 588388f,
tenant entry 2d8aa76/5692647 and T2 dropdown 999d716 together, not just the
final merge. Keeps docs/**, root *.md and supabase/**; newer unrelated work is
untouched. Reintroduce the release only by reverting THIS commit."
echo "recovery commit: $(git rev-parse HEAD) (${#FILES[@]} files)"
