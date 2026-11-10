#!/usr/bin/env bash
# Compiles every Rust sample in the rust-conventions skill and runs the skill's own CI gates on them.
#   run.sh                 run the check
#   run.sh --self-test     prove the check fails on a broken sample
#   run.sh --update-lock   re-resolve dependencies and write Cargo.lock back here
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
build="$here/.build"
ws="$build/ws"
mode="${1:-check}"

for dir in /opt/homebrew/opt/rustup/bin "$HOME/.cargo/bin"; do
    [ -d "$dir" ] && PATH="$dir:$PATH"
done
export PATH

need() { # need <command...> -- <what to install>
    local what="${*: -1}"
    "${@:1:$#-2}" >/dev/null 2>&1 || { echo "missing: $what" >&2; missing=1; }
}
missing=0
need python3 --version -- "python3"
need cargo --version -- "cargo (install rustup, then: rustup default stable)"
need cargo fmt --version -- "rustfmt (rustup component add rustfmt)"
need cargo clippy --version -- "clippy (rustup component add clippy)"
need cargo nextest --version -- "cargo-nextest (cargo install --locked cargo-nextest)"
need cargo audit --version -- "cargo-audit (cargo install --locked cargo-audit)"
need cargo deny --version -- "cargo-deny (cargo install --locked cargo-deny)"
need psql --version -- "psql (PostgreSQL client)"
[ "$missing" = 0 ] || exit 1

mkdir -p "$build/logs"

start_database() {
    if [ -z "${DATABASE_URL:-}" ]; then
        if ! command -v initdb >/dev/null || ! command -v pg_ctl >/dev/null; then
            echo "No DATABASE_URL, and initdb/pg_ctl aren't on PATH. Set DATABASE_URL to a Postgres" >&2
            echo "where this user can create databases, or install PostgreSQL." >&2
            exit 1
        fi
        local data="$build/pgdata" port="${CHECK_PG_PORT:-54329}"
        [ -d "$data" ] || initdb -D "$data" -U postgres --auth=trust >/dev/null
        # TCP only: the socket path under .build can exceed the Unix socket length limit.
        pg_ctl -D "$data" -w -l "$build/logs/postgres.log" \
            -o "-p $port -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" start >/dev/null
        trap 'pg_ctl -D "$build/pgdata" -m fast stop >/dev/null 2>&1 || true' EXIT
        export DATABASE_URL="postgres://postgres@127.0.0.1:$port/postgres"
    fi
    PGOPTIONS="--client-min-messages=warning" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$here/schema.sql" >/dev/null
}

generate() { # generate [--inject kind]
    rm -rf "$ws/crates" "$ws/.cargo"
    python3 "$here/gen.py" "$@"
    cp "$here/Cargo.lock" "$ws/Cargo.lock"
}

gate() { # gate <label> <command>
    local log="$build/logs/$(echo "$1" | tr -c 'a-z0-9\n' '-').log"
    if (cd "$ws" && eval "$2") >"$log" 2>&1; then
        echo "ok    $1"
    else
        echo "FAIL  $1"
        tail -n 40 "$log"
        return 1
    fi
}

run_gates() {
    # Samples must already be rustfmt-clean: format a throwaway copy and check no sample line moved.
    gate "samples are rustfmt-clean" "cargo fmt --all && python3 '$here/gen.py' --verify-fmt"
    while IFS= read -r cmd; do
        gate "$cmd" "$cmd"
    done <"$build/gates.txt"
}

expect_failure() { # expect_failure <inject kind> <text the failure must contain>
    generate --inject "$1" >/dev/null
    local cmd log="$build/logs/self-test-$1.log"
    cmd="$(sed -n 2p "$build/gates.txt")" # the clippy gate
    if (cd "$ws" && eval "$cmd") >"$log" 2>&1; then
        echo "FAIL  self-test: a sample with a $1 error passed the clippy gate"
        return 1
    fi
    grep -q "$2" "$log" || { echo "FAIL  self-test: $1 failed for the wrong reason"; tail -n 20 "$log"; return 1; }
    echo "ok    self-test: a $1 error fails the check"
}

case "$mode" in
check)
    start_database
    generate
    run_gates
    echo "rust-conventions: all gates passed"
    ;;
--self-test)
    start_database
    expect_failure compile "mismatched types"
    expect_failure clippy "used \`unwrap()\` on an \`Option\` value"
    generate >/dev/null
    echo "rust-conventions: self-test passed"
    ;;
--update-lock)
    start_database
    python3 "$here/gen.py"
    (cd "$ws" && rm -f Cargo.lock && cargo generate-lockfile)
    cp "$ws/Cargo.lock" "$here/Cargo.lock"
    echo "wrote $here/Cargo.lock"
    ;;
*)
    echo "usage: run.sh [--self-test | --update-lock]" >&2
    exit 2
    ;;
esac
