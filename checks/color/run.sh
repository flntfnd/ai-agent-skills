#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"

if [[ "${1:-}" == "--self-test" ]]; then
    exec node "$here/check.mjs" --self-test --repo "$repo" --build "$here/.build"
fi

exec node "$here/check.mjs" --repo "$repo"
