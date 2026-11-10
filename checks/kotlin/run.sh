#!/usr/bin/env bash
# Compiles every Kotlin sample in skills/claude against the versions android-platform teaches.
#   run.sh              generate, compile (deprecations are errors), lint
#   run.sh --self-test  prove the check fails on a missing opt-in and on a deprecated call
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$HERE/.build/logs"
mkdir -p "$LOG"

fail() { echo "kotlin check: FAIL - $*" >&2; exit 1; }

command -v python3 >/dev/null || fail "python3 not found"

# JDK
if [[ -z "${JAVA_HOME:-}" || ! -x "${JAVA_HOME:-}/bin/java" ]]; then
  JAVA_HOME=""
  if [[ -x /usr/libexec/java_home ]]; then JAVA_HOME="$(/usr/libexec/java_home 2>/dev/null || true)"; fi
  if [[ -z "$JAVA_HOME" ]]; then
    for d in /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home /usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home; do
      if [[ -x "$d/bin/java" ]]; then JAVA_HOME="$d"; break; fi
    done
  fi
  [[ -n "$JAVA_HOME" ]] || fail "no JDK. Set JAVA_HOME to a JDK 17 or newer (brew install openjdk@21)."
fi
export JAVA_HOME

# Android SDK
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$SDK" || ! -d "$SDK" ]]; then
  SDK=""
  for d in /opt/homebrew/share/android-commandlinetools "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
    if [[ -d "$d/platforms" ]]; then SDK="$d"; break; fi
  done
  [[ -n "$SDK" ]] || fail "no Android SDK. Set ANDROID_HOME (brew install --cask android-commandlinetools, then sdkmanager)."
fi
export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK"

gradle() { (cd "$HERE/project" && ./gradlew --console=plain -q "$@"); }

errors() { grep -E '^e: ' "$1" | sed -E 's|file://.*/generated/kotlin/||; s|file://.*/src/main/kotlin/||' | cut -c1-300 || true; }

if [[ "${1:-}" == "--self-test" ]]; then
  for case in optin deprecated; do
    expect="$(python3 "$HERE/gen.py" --inject "$case")"
    if gradle :lib:compileDebugKotlin >"$LOG/selftest-$case.log" 2>&1; then
      fail "self-test: the broken '$case' sample compiled. The check isn't strict."
    fi
    grep -q "selftest/$case.kt.*$expect" "$LOG/selftest-$case.log" \
      || fail "self-test: '$case' failed for the wrong reason. See $LOG/selftest-$case.log"
    echo "self-test: '$case' sample rejected, as it should be"
  done
  python3 "$HERE/gen.py" >/dev/null
  echo "kotlin check: self-test OK - missing opt-in and deprecated call both fail the build"
  exit 0
fi

python3 "$HERE/check_versions.py" || fail "version catalog and Version Snapshot disagree"
GEN="$(python3 "$HERE/gen.py")" || fail "sample generation failed"

if ! gradle :lib:compileDebugKotlin >"$LOG/compile.log" 2>&1; then
  errors "$LOG/compile.log" >&2
  n="$(grep -E '^e: ' "$LOG/compile.log" | sed -E 's|:[0-9]+:[0-9]+ .*||' | sort -u | wc -l | tr -d ' ')"
  fail "$n sample file(s) don't compile. Full log: $LOG/compile.log"
fi

if ! gradle :lib:lintDebug >"$LOG/lint.log" 2>&1; then
  grep -E '(Error|Warning):' "$HERE/project/lib/build/reports/lint-results-debug.txt" 2>/dev/null | sed -E 's|.*/generated/kotlin/||' | cut -c1-300 >&2 || true
  fail "lint found problems. Report: project/lib/build/reports/lint-results-debug.txt"
fi

echo "kotlin check: OK - $GEN, compiled with deprecations as errors, lint clean"
