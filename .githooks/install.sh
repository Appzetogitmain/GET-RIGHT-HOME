#!/bin/sh
#
# Points this clone's git hooks at .githooks/ so the injected-code check runs
# before every commit. Run once per clone, from anywhere in the repo:
#
#   sh .githooks/install.sh
#
# Git hooks live in .git/hooks, which is never cloned or pushed. That is why
# each machine has to opt in -- and why it matters that everyone does: the
# payload this guards against keeps returning from a contributor's machine, so
# the check is only useful on the machine that is reinfecting the file.

set -e

root=$(git rev-parse --show-toplevel) || {
    echo "Not inside a git repository." >&2
    exit 1
}

cd "$root"
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/detect-injected-code.sh 2>/dev/null || true

echo "Hooks enabled: core.hooksPath -> .githooks"
echo ""
echo "Checking the current tree for injected code..."

if sh .githooks/detect-injected-code.sh --tracked; then
    echo "Clean. Nothing flagged."
else
    echo ""
    echo "The tree is already carrying something. Read the report above." >&2
    exit 1
fi
