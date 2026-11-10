#!/usr/bin/env python3
"""Turn every ```swift fence under skills/claude into a file swiftc can type-check.

Nothing is copied into the repo. Samples, and the tokens they use, are read from the
markdown on every run and written to .build/.

Usage: extract.py <repo-root> <out-dir> [--self-test]
"""
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1])
OUT = Path(sys.argv[2])
SELF_TEST = "--self-test" in sys.argv
HERE = Path(__file__).resolve().parent
SKILLS = ROOT / "skills" / "claude"

# Token type -> the markdown file that owns its definition.
OWNERS = {
    "Motion": "motion-design/reference/cross-platform-tokens.md",
    "Spacing": "apple-platform/reference/color-typography.md",
    "Radius": "apple-platform/reference/color-typography.md",
    "Typography": "apple-platform/reference/color-typography.md",
    "GlassTokens": "apple-platform/reference/liquid-glass.md",
    "GlassLevel": "apple-platform/reference/liquid-glass.md",
}
# Color.Semantic has no Swift definition anywhere. Its names are the semantic roles
# listed here, run through that file's Figma-to-Swift conversion rule.
COLOR_ROLES = "figma-design-system/reference/token-architecture.md"

FENCE = re.compile(r"```swift\n(.*?)```", re.S)
DECL = re.compile(
    r"^(?:(?:public|private|fileprivate|internal|final|nonisolated|indirect)\s+)*"
    r"(struct|enum|class|actor|protocol|typealias|extension)\s+([\w.]+)"
)
ATTRIBUTE_LINE = re.compile(r"^@\w+(\([^)]*\))?\s*(//.*)?$")
MEMBER = re.compile(
    r"^(@(State|Environment|Namespace|ScaledMetric|FocusState|Binding|GestureState|AppStorage|Bindable)\b"
    r"|(?:(?:private|fileprivate|nonisolated)\s+)*func\s"
    r"|(?:(?:private|fileprivate)\s+)*var\s+\w+\s*:[^=]*\{\s*$)"
)
STATEMENT = re.compile(r"^(let|var|if|for|guard|switch|while|do|defer|return)\b|^[\w.$\[\]]+\s*[-+*/]?=[^=]")
ANIMATION_VALUE = re.compile(
    r"^\.(smooth|snappy|bouncy|spring|interactiveSpring|interpolatingSpring|easeIn|easeOut|easeInOut|linear|default)\b"
)
ASSET_COLOR = re.compile(r"static let \S+ = (?:SwiftUI\.)?Color\(\.(\w+)\)")
MEMBER_NAME = re.compile(r"\b(?:var|let|func)\s+(\w+)")


def strip_noise(line):
    """Drop string literals and // comments so brace counting sees only code."""
    line = re.sub(r'"(?:\\.|[^"\\])*"', '""', line)
    return line.split("//")[0]


def segments(code):
    """Split code into top-level chunks. A chunk starts at an unindented line at brace depth 0."""
    chunks, current, depth = [], [], 0
    for line in code.splitlines():
        bare = strip_noise(line)
        starts = depth == 0 and bare.strip() and not line[0].isspace() and bare.strip()[0] not in "})]"
        if starts and any(strip_noise(l).strip() for l in current):
            first = next(strip_noise(l).strip() for l in current if strip_noise(l).strip())
            if not ATTRIBUTE_LINE.match(first) or len([l for l in current if strip_noise(l).strip()]) > 1:
                chunks.append("\n".join(current))
                current = []
        current.append(line)
        depth += sum(bare.count(c) for c in "{([") - sum(bare.count(c) for c in "})]")
    if any(strip_noise(l).strip() for l in current):
        chunks.append("\n".join(current))
    return chunks


def head(chunk):
    """First code line of a chunk, skipping comments and a leading attribute line."""
    lines = [strip_noise(l).strip() for l in chunk.splitlines()]
    lines = [l for l in lines if l]
    if len(lines) > 1 and ATTRIBUTE_LINE.match(lines[0]):
        return lines[1]
    return lines[0] if lines else ""


def declared(chunk):
    """Names a top-level chunk declares: `Motion`, or `Color.Semantic` for a nested type in an extension."""
    m = DECL.match(head(chunk))
    if not m:
        return set()
    kind, name = m.groups()
    if kind != "extension":
        return {name}
    nested = re.findall(r"^\s{4}(?:enum|struct|class)\s+(\w+)", chunk, re.M)
    return {f"{name}.{n}" for n in nested}


def fences(path):
    return FENCE.findall(path.read_text())


def owner_decl(name, rel):
    for code in fences(SKILLS / rel):
        for chunk in segments(code):
            if name in declared(chunk) and not head(chunk).startswith("extension"):
                return chunk
    sys.exit(f"extract.py: {rel} no longer defines `{name}`. Fix OWNERS in checks/swift/extract.py.")


def swift_name(role):
    parts = role.split("-")
    name = parts[0] + "".join(p.capitalize() for p in parts[1:])
    return f"`{name}`" if name in {"default", "in", "is", "as"} else name


def color_semantic():
    text = (SKILLS / COLOR_ROLES).read_text()
    groups = re.findall(r"^color/semantic/([a-z]+)/([a-z\- |]+)$", text, re.M)
    if not groups:
        sys.exit(f"extract.py: no `color/semantic/<group>/<roles>` lines in {COLOR_ROLES}.")
    roles_by_group = {}
    for group, roles in groups:
        seen = roles_by_group.setdefault(group, [])
        seen += [r.strip() for r in roles.split("|") if r.strip() not in seen]
    out = ["extension Color {", "    enum Semantic {"]
    for group, roles in roles_by_group.items():
        out.append(f"        enum {group.capitalize()} {{")
        out += [f"            static let {swift_name(role)} = Color.primary" for role in roles]
        out.append("        }")
    return "\n".join(out + ["    }", "}"])


def load_pool():
    """Everything a sample may lean on: owner tokens, generated Color.Semantic, committed stubs."""
    pool = [({name}, f"// from {rel}\n{owner_decl(name, rel)}") for name, rel in OWNERS.items()]
    pool.append(({"Color.Semantic"}, f"// from {COLOR_ROLES}\n{color_semantic()}"))
    stubs = (HERE / "stubs.swift").read_text()
    members_block = re.search(r"#if SAMPLE_MEMBERS\n(.*?)#endif", stubs, re.S)
    members = [l for l in members_block.group(1).splitlines() if l.strip() and not l.strip().startswith("//")]
    stubs = stubs.replace(members_block.group(0), "")
    for chunk in segments(stubs):
        if not head(chunk).startswith("import"):
            # An extension in stubs is never dropped; a type is dropped when the sample declares it.
            names = set() if head(chunk).startswith("extension") else declared(chunk)
            pool.append((names, chunk))
    return pool, members


def wrap(code):
    """Sort a fence's chunks into file-scope declarations, struct members, and function-body lines."""
    imports, decls, members, body = [], [], [], []
    last_was_expression = False
    for chunk in segments(code):
        first = head(chunk)
        if not first:
            continue
        if first.startswith("import "):
            imports.append(chunk)
        elif DECL.match(first):
            decls.append(chunk)
        elif MEMBER.match(first):
            members.append(chunk)
        elif first.startswith("."):
            if ANIMATION_VALUE.match(first):
                body.append("let _: Animation = (\n" + chunk + "\n)")
                last_was_expression = False
                continue
            if last_was_expression:
                body[-1] += "\n" + chunk          # a modifier chain that continues the view above it
            else:
                body.append("Color.clear\n" + chunk)
            last_was_expression = True
            continue
        elif STATEMENT.match(first):
            body.append(chunk)
        else:
            body.append(chunk)                    # a bare expression; run.sh allows unused results
            last_was_expression = True
            continue
        last_was_expression = False
    return imports, decls, members, body


def build(sample_id, code, pool, shared_members):
    imports, decls, members, body = wrap(code)
    own = set().union(*(declared(d) for d in decls)) if decls else set()
    own_members = set(MEMBER_NAME.findall("\n".join(members)))
    assets = sorted(set(ASSET_COLOR.findall(code)))

    support = ["import SwiftUI", "import DeveloperToolsSupport", ""]
    support += [text + "\n" for names, text in pool if not (names & own)]
    if assets:
        support.append("// stands in for the symbols Xcode generates from the asset catalog")
        support.append("extension ColorResource {")
        support += [f'    static let {a} = ColorResource(name: "{a}", bundle: .main)' for a in assets]
        support.append("}")

    words = set(re.findall(r"\w+", code))
    injected = [m for m in shared_members
                if MEMBER_NAME.search(m).group(1) in words and MEMBER_NAME.search(m).group(1) not in own_members]

    out = [f"// {sample_id}", "import SwiftUI", *imports, "", *decls, ""]
    if members or body:
        out += ["@MainActor struct Sample: View {", *injected, *members,
                "    var body: some View { Color.clear }",
                "    func sample() {", *body, "    }", "}"]
    return "\n".join(out) + "\n", "\n".join(support) + "\n"


def main():
    pool, shared_members = load_pool()
    samples = []
    for path in sorted(SKILLS.rglob("*.md")):
        rel = path.relative_to(SKILLS)
        skill = rel.parts[0]
        for i, code in enumerate(fences(path)):
            samples.append((f"{skill}/{path.stem}#{i}", code))
    if SELF_TEST:
        samples = [("self-test/good#0", 'Text("ok").padding(Spacing.s5)\n'),
                   ("self-test/broken#0", 'Text("no such token").padding(Spacing.base)\n')]
    if not samples:
        sys.exit(f"extract.py: no swift fences found under {SKILLS}.")

    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for sample_id, code in samples:
        stem = sample_id.replace("/", "__").replace("#", "__")
        source, support = build(sample_id, code, pool, shared_members)
        (OUT / f"{stem}.swift").write_text(source)
        (OUT / f"{stem}.support.swift").write_text(support)
        manifest.append(f"{sample_id}\t{stem}")
    (OUT / "manifest.tsv").write_text("\n".join(manifest) + "\n")
    print(f"{len(samples)} swift samples")


main()
