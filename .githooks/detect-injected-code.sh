#!/bin/sh
#
# Scans files for signs of the obfuscated payload that has been injected into
# this repo's source more than once (see the "fix:malware" commit, and the
# vite.config.js recurrence where a 637-byte config arrived as 32,964 bytes).
#
# Usage:
#   .githooks/detect-injected-code.sh <file> [<file>...]   # scan specific files
#   .githooks/detect-injected-code.sh --tracked            # scan the whole tree
#
# Exits 0 when everything looks clean, 1 when something is flagged.
# Called by .githooks/pre-commit; safe to call from CI too.

set -u

findings=$(mktemp) || exit 2
trap 'rm -f "$findings"' EXIT INT TERM

# Only source-ish text files. Build output and dependencies are excluded:
# minified bundles legitimately look like obfuscated code.
is_scannable() {
    case "$1" in
        */node_modules/*|node_modules/*) return 1 ;;
        */dist/*|dist/*|*/build/*|build/*) return 1 ;;
        *.min.js|*.min.css|*.bundle.js) return 1 ;;
        *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs|*.json|*.html|*.css) return 0 ;;
        *) return 1 ;;
    esac
}

# $1 = file, $2 = what tripped, $3 = detail
report() {
    printf '\n  %s\n    %s\n    %s\n' "$1" "$2" "$3" >>"$findings"
}

scan_file() {
    file="$1"
    [ -f "$file" ] || return 0
    is_scannable "$file" || return 0

    # Skip binaries. grep -I would ignore them anyway; this avoids the read.
    grep -Iq . "$file" 2>/dev/null || return 0

    # 1. The loader marker. The payload opens by assigning an opaque campaign
    #    id to a very short global, e.g.  global.i = 'A8-7369-2';
    if grep -qE "global\.[A-Za-z_$][A-Za-z0-9_$]{0,2} *= *['\"][A-Za-z0-9+/=_-]{6,}['\"]" "$file" 2>/dev/null; then
        report "$file" \
            "opaque value assigned to a short global" \
            "matches the injected loader's entry line (e.g. global.i = 'A8-7369-2')"
    fi

    # 2. Hex-mangled identifier density. One or two could be honest; the payload
    #    carries hundreds.
    hexcount=$(grep -oE '_0x[0-9a-f]{4,6}' "$file" 2>/dev/null | wc -l | tr -d ' ')
    if [ "${hexcount:-0}" -ge 20 ]; then
        report "$file" \
            "$hexcount hex-mangled identifiers (_0xNNNN)" \
            "typical of an obfuscator; hand-written source does not do this"
    fi

    # 3. Code hidden behind a long whitespace run, so it sits far off-screen and
    #    the file looks untouched in an editor. This is how the vite.config.js
    #    payload stayed unnoticed.
    if grep -qE '[[:blank:]]{200,}[^[:blank:]]' "$file" 2>/dev/null; then
        report "$file" \
            "code preceded by 200+ blank characters on one line" \
            "content pushed off-screen to hide it from casual review"
    fi
}

if [ "$#" -eq 0 ]; then
    echo "usage: $0 <file>... | --tracked" >&2
    exit 2
fi

if [ "$1" = "--tracked" ]; then
    # NUL-delimited so paths with spaces survive.
    git ls-files -z >"$findings.list" || exit 2
    while IFS= read -r f; do
        [ -n "$f" ] && scan_file "$f"
    done <<EOF
$(tr '\0' '\n' <"$findings.list")
EOF
    rm -f "$findings.list"
else
    for f in "$@"; do scan_file "$f"; done
fi

if [ -s "$findings" ]; then
    echo "Possible injected code:" >&2
    cat "$findings" >&2
    cat >&2 <<'MSG'

------------------------------------------------------------------
This repo has been hit before: an obfuscated payload was appended to
frontend/vite.config.js, removed, and then came back. It returns
because a contributor's machine reinfects the file on save or build,
so cleaning the repo alone does not end it.

Before you do anything else:
  1. Open the flagged file and look at the very end, and at any line
     that runs unusually long.
  2. If you did not write it, do not commit. Restore the file:
       git checkout -- <file>
  3. Run a malware scan on this machine. If the file keeps coming
     back dirty, this machine is the source.

If you are certain this is a false positive (a vendored minified
file, say), add it to the exclusions in
.githooks/detect-injected-code.sh, or bypass once with:
    git commit --no-verify
------------------------------------------------------------------
MSG
    exit 1
fi

exit 0
