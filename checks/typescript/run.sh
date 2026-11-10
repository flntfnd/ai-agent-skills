#!/usr/bin/env bash
# Type-checks every TypeScript and TSX sample in skills/claude. See README.md.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
bin="$PWD/node_modules/.bin"
mode="${1:-}"

if [[ -n "$mode" && "$mode" != "--self-test" ]]; then
    echo "usage: run.sh [--self-test]" >&2
    exit 2
fi

[[ -d node_modules ]] || npm ci --no-audit --no-fund

check() {
    node extract.mjs "$@"

    # PageProps and LayoutProps only exist after Next generates route types from app/.
    (cd .build/web && "$bin/next" typegen >typegen.log 2>&1) || { cat .build/web/typegen.log; return 1; }

    local status=0 args=()
    for project in web backend; do
        (cd ".build/$project" && "$bin/tsc" --noEmit -p . >tsc.log 2>&1) || status=1
        cat ".build/$project/tsc.log"
        args+=("$project=.build/$project/tsc.log")
    done
    node report.mjs "${args[@]}" || status=1
    return "$status"
}

if [[ "$mode" == "--self-test" ]]; then
    if check --self-test; then
        echo "self-test: FAIL (a broken sample got through)"
        exit 1
    fi
    echo "self-test: PASS (the broken sample was caught)"
    exit 0
fi

check
