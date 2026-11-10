# Kotlin sample check

Every ```` ```kotlin ```` fence under `skills/claude` gets compiled. For real, against the library versions `android-platform` teaches. If a sample uses a deprecated API, misses an opt-in, or names something that doesn't exist, this fails.

## What it checks

- **Samples compile.** `gen.py` reads the fences out of the markdown on every run and wraps each one in its own file and package. Nothing is copied into the repo. Deprecations are errors.
- **Tokens are real.** `Motion`, `Spacing`, the typography objects, and `AppTheme` are compiled from the fences that define them. A sample that uses a token name its owner doesn't define fails.
- **Prose APIs exist.** `project/lib/src/main/kotlin/probes/Probes.kt` calls the APIs the skills name only in tables and sentences.
- **Lint is clean.** Warnings are errors. The suppressions are in `project/lib/lint.xml`, each with its reason.
- **Versions match.** `check_versions.py` compares `project/gradle/libs.versions.toml` against the Version Snapshot table in `android-platform/SKILL.md` and fails on any difference.

## What it needs

- A JDK, 17 or newer. `JAVA_HOME`, or anything `/usr/libexec/java_home` finds. `brew install openjdk@21` works.
- The Android SDK with the platform for the catalog's `compileSdk`. `ANDROID_HOME` or `ANDROID_SDK_ROOT`. Falls back to `/opt/homebrew/share/android-commandlinetools` and `~/Library/Android/sdk`.

```sh
brew install --cask android-commandlinetools
sdkmanager --licenses
sdkmanager "platforms;android-37.0"
```

- Python 3. No packages.
- Network on the first run. Gradle downloads itself and the libraries.

No emulator, no Android Studio.

## Run it

```sh
checks/kotlin/run.sh              # generate, compile, lint
checks/kotlin/run.sh --self-test  # prove a missing opt-in and a deprecated call both fail
```

One summary line. Non-zero exit on any failure. Logs are in `.build/logs/`.

## When a sample changes

Each fence has a row in `wrappers.py`, keyed `<skill>__<file>__<n>`, where n is the fence's position in its file from 0. The row holds only what the sample leaves out: parameters, a stub screen, an import. Add a fence, add a row. Remove or reorder fences and the keys after it shift. `gen.py` tells you which rows are off.

Don't loosen a wrapper to make a sample pass. Fix the sample.

The two Gradle-script fences in `android-platform/reference/theme-and-color.md` are listed under `SKIP`. They aren't library source. `project/lib/build.gradle.kts` carries the same lines.

## When the Version Snapshot changes

1. Edit the Version Snapshot in `skills/claude/android-platform/SKILL.md`.
2. Put the same versions in the first block of `project/gradle/libs.versions.toml`.
3. If `compileSdk` moved, install that platform with `sdkmanager`.
4. Run `run.sh`. Whatever breaks is what the skills now teach wrong. Fix the skills.

The second block of the catalog (Android Gradle Plugin, serialization, the wrapper's Gradle version) isn't in the snapshot. Bump those when the build asks for it.
