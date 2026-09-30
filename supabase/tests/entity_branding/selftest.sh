#!/bin/bash
# Proves run.sh detects failure: an intentional failing check must make it
# exit non-zero. Exits 0 when detection works.
D=$(cd "$(dirname "$0")" && pwd)
SELF_TEST=1 "$D/run.sh" "$1" >/dev/null 2>&1
code=$?
if [ $code -eq 1 ]; then echo "SELF-TEST OK: intentional failure detected (exit $code)"; exit 0; fi
echo "SELF-TEST BROKEN: runner exited $code with an intentional failure"; exit 1
