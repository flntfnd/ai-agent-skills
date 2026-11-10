#!/usr/bin/env bash
# Type-check every ```swift sample under skills/claude against the iOS and macOS SDKs.
# Usage: checks/swift/run.sh [--self-test]
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
build="$here/.build"
min_sdk=27
jobs="$(sysctl -n hw.ncpu 2>/dev/null || echo 4)"

command -v xcrun >/dev/null || { echo "swift check: xcrun not found. Install Xcode $min_sdk or later." >&2; exit 2; }
ios_sdk="$(xcrun --sdk iphonesimulator --show-sdk-path)"
ios_version="$(xcrun --sdk iphonesimulator --show-sdk-version)"
mac_sdk="$(xcrun --sdk macosx --show-sdk-path)"
mac_version="$(xcrun --sdk macosx --show-sdk-version)"
if [ "${ios_version%%.*}" -lt "$min_sdk" ]; then
  echo "swift check: iOS SDK $ios_version is too old. The samples need the iOS $min_sdk SDK (Xcode $min_sdk or later)." >&2
  echo "Select a newer Xcode with xcode-select or DEVELOPER_DIR." >&2
  exit 2
fi

# compile <out-dir> <sdk> <target>: type-check every sample in the manifest, in parallel.
# A sample that fails leaves <stem>.<platform>.log behind. No log is a pass.
# Samples are fragments, so a view expression nobody uses is fine: NoUsage stays a warning.
compile() {
  local dir="$1" sdk="$2" target="$3" platform="${3#*-apple-}"
  platform="${platform%%[0-9]*}"
  # The stem arrives as the last argument, $5.
  cut -f2 "$dir/manifest.tsv" | xargs -P "$jobs" -n 1 sh -c '
    log="$3/$5.$4.log"
    if xcrun swiftc -typecheck -swift-version 6 -warnings-as-errors -Wwarning NoUsage \
      -sdk "$1" -target "$2" "$3/$5.support.swift" "$3/$5.swift" >"$log" 2>&1; then rm -f "$log"; fi
  ' _ "$sdk" "$target" "$dir" "$platform"
}

# failed <out-dir> <platform>: print the id of every sample that left a log.
failed() {
  while IFS=$'\t' read -r id stem; do
    [ -e "$1/$stem.$2.log" ] && echo "$id"
  done <"$1/manifest.tsv"
  return 0
}

show_errors() {  # <out-dir> <platform> <id>
  local stem
  stem="$(awk -F'\t' -v id="$3" '$1 == id { print $2 }' "$1/manifest.tsv")"
  grep -E "^[^ ].*error:" "$1/$stem.$2.log" | sed -e 's|^.*/\.build/[^/]*/||' -e 's/^/    /' | head -5
}

if [ "${1:-}" = "--self-test" ]; then
  out="$build/self-test"
  rm -rf "$out"
  python3 "$here/extract.py" "$root" "$out" --self-test >/dev/null
  compile "$out" "$ios_sdk" "arm64-apple-ios$ios_version-simulator"
  result="$(failed "$out" ios)"
  if [ "$result" = "self-test/broken#0" ]; then
    echo "self-test: ok. The broken sample failed and the good one passed."
    exit 0
  fi
  echo "self-test: FAILED. Expected only self-test/broken#0 to fail, got: ${result:-nothing}" >&2
  exit 1
fi

out="$build/samples"
rm -rf "$out"
python3 "$here/extract.py" "$root" "$out"
total="$(wc -l <"$out/manifest.tsv" | tr -d ' ')"
status=0

# iOS: everything passes.
compile "$out" "$ios_sdk" "arm64-apple-ios$ios_version-simulator"
ios_failed="$(failed "$out" ios)"
ios_count="$(printf '%s' "$ios_failed" | grep -c . || true)"
for id in $ios_failed; do
  echo "FAIL ios  $id"
  show_errors "$out" ios "$id"
  status=1
done

# macOS: the allowlist names the samples that use iOS-only API. It has to match exactly.
compile "$out" "$mac_sdk" "arm64-apple-macos$mac_version"
mac_failed="$(failed "$out" macos)"
mac_count="$(printf '%s' "$mac_failed" | grep -c . || true)"
allowed="$(sed -e 's/#[^0-9].*$//' -e 's/[[:space:]]*$//' "$here/macos-ios-only.txt" | grep . || true)"
unexpected="$(comm -23 <(printf '%s\n' "$mac_failed" | sort) <(printf '%s\n' "$allowed" | sort) | grep . || true)"
stale="$(comm -13 <(printf '%s\n' "$mac_failed" | sort) <(printf '%s\n' "$allowed" | sort) | grep . || true)"
for id in $unexpected; do
  echo "FAIL macos  $id  (not in macos-ios-only.txt)"
  show_errors "$out" macos "$id"
  status=1
done
for id in $stale; do
  echo "FAIL macos  $id  (listed in macos-ios-only.txt but it passes, or no longer exists. Remove it.)"
  status=1
done

echo "iOS $ios_version: $((total - ios_count)) passed, $ios_count failed, $total samples"
unexpected_count="$(printf '%s' "$unexpected" | grep -c . || true)"
stale_count="$(printf '%s' "$stale" | grep -c . || true)"
echo "macOS $mac_version: $((total - mac_count)) passed, $((mac_count - unexpected_count)) iOS-only as listed, $unexpected_count failed, $stale_count stale allowlist entries, $total samples"
exit "$status"
