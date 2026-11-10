#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"

if [[ ! -d "$here/node_modules" ]]; then
    (cd "$here" && npm ci --no-audit --no-fund --silent)
fi

if [[ "${1:-}" == "--self-test" ]]; then
    exec node "$here/check.mjs" --self-test --repo "$repo" --build "$here/.build"
fi

exec node "$here/check.mjs" --repo "$repo" --build "$here/.build"
