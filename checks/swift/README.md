# Swift Sample Check

Type-checks every ` ```swift ` sample in `skills/claude/**/*.md`. If a sample doesn't compile, it doesn't ship.

## What It Checks

- Every Swift fence, read from the markdown on each run. Nothing is copied into this folder.
- Token names. `Motion` comes from `motion-design/reference/cross-platform-tokens.md`. `Spacing`, `Radius`, and `Typography` come from `apple-platform/reference/color-typography.md`. `GlassTokens` and `GlassLevel` come from `apple-platform/reference/liquid-glass.md`. `Color.Semantic` is built from the roles in `figma-design-system/reference/token-architecture.md`. A sample that uses a name its owner doesn't define fails.
- iOS simulator SDK first. Swift 6 mode, warnings as errors. Every sample passes.
- Then the macOS SDK. Samples that use iOS-only API are listed in `macos-ios-only.txt`. A sample that fails and isn't listed fails the check. A listed sample that passes fails the check too, so the list stays honest.

## What It Needs

Xcode 27 or later, selected with `xcode-select` or `DEVELOPER_DIR`. Python 3, standard library only.

## Run It

```sh
checks/swift/run.sh              # the check
checks/swift/run.sh --self-test  # proves it's live: a broken sample has to fail
```

It runs from any directory, takes about ten seconds, prints one summary line per SDK, and exits non-zero on any failure. Generated files go in `checks/swift/.build/`.

## When It Fails

Fix the sample in the skill. Don't add the missing name to `stubs.swift`.

- **A token name fails.** The sample uses a name the owning skill doesn't define. Use the owner's name, or add the token to the owner.
- **A new sample fails on macOS only.** If the API really is iOS-only, add the sample id to `macos-ios-only.txt`. The id is `<skill>/<file>#<fence index>`, counting from 0.
- **A fragment needs a view, a model, or some state that isn't there.** That's the one thing `stubs.swift` is for. Keep it small.

## Files

- `run.sh`: finds the SDKs, compiles in parallel, compares macOS failures with the allowlist.
- `extract.py`: pulls the fences and the owners' token definitions out of the markdown and wraps each fragment so it compiles on its own.
- `stubs.swift`: scaffolding only. Placeholder views, style-local tokens from `visual-styles`, and the state fragments assume.
- `macos-ios-only.txt`: the macOS allowlist.
