# JavaScript check

Checks every JavaScript sample in the skills against real packages, and checks the motion tokens the CSS samples use. Samples are pulled out of the markdown when it runs.

## What it checks

- Every `js`, `javascript` and `jsx` fence under `skills/claude` parses. Modules go through `node --check`, JSX through esbuild.
- Every import resolves in the pinned packages, and every imported name exists. Members read off a namespace import, like `THREE.Timer`, have to exist too.
- `package.json` pins the versions the Status blocks in `motion-design` name. If a Status block changes and the pin doesn't, it fails.
- Each `linear()` spring token in `cross-platform-tokens.md` matches the spring in the comment above it to within 0.004, the comment's stiffness and damping ratio agree with its duration and bounce, and the paired duration is the settle time.
- Every `--spring-*`, `--duration-*`, `--ease-*` and `--motion-distance-*` used in a `css` fence anywhere in the skills is defined in `cross-platform-tokens.md`, or declared in the same file as a style-local token.
- No `css` fence has a raw `cubic-bezier()` or a bare duration in a `transition` or `animation` outside a token definition. Zero is fine.

TypeScript and TSX samples aren't covered here. They have their own check.

## Exceptions

`exceptions.json`. It's empty. If a sample ever needs one, add it there with a reason.

## What it needs

Node 22 or newer and npm. `run.sh` runs `npm ci` the first time, from the committed `package-lock.json`.

## Run it

```bash
checks/javascript/run.sh
checks/javascript/run.sh --self-test
```

It prints one summary line and exits non-zero on any failure. `--self-test` copies `motion-design` into `.build/`, misspells an import in the copy, and confirms the check catches it.

## When a library moves

Change the Status block in the skill and the version in `package.json` together, run `npm install` here to update the lockfile, then run the check. Whatever it reports is what changed in the library.
