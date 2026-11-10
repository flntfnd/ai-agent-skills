#!/usr/bin/env python3
"""Fails if project/gradle/libs.versions.toml and the Version Snapshot table in
skills/claude/android-platform/SKILL.md name different versions."""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SKILL = os.path.join(REPO, 'skills', 'claude', 'android-platform', 'SKILL.md')
CATALOG = os.path.join(HERE, 'project', 'gradle', 'libs.versions.toml')

V = r'(\d+(?:\.\d+)+(?:-[a-z]+\d+)?)'
# catalog key -> (table row label, pattern inside that row)
RULES = {
    'compileSdk': ('Platform', r'API (\d+)'),
    'kotlin': ('Kotlin', V),
    'composeBom': ('Compose BOM', V),
    'material3': ('`material3` with M3E', V),
    'navigation3': ('Navigation 3', V),
    'navigationevent': ('Other', r'`navigationevent` ' + V),
    'activity': ('Other', r'`activity` ' + V),
    'window': ('Other', r'`window` ' + V),
    'graphicsShapes': ('Other', r'`graphics-shapes` ' + V),
}

text = open(SKILL, encoding='utf-8').read()
start = text.find('## Version Snapshot')
if start < 0:
    sys.exit('No "## Version Snapshot" section in android-platform/SKILL.md')
section = text[start:text.find('\n## ', start + 1)]
rows = {}
for line in section.split('\n'):
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    if line.startswith('|') and len(cells) == 2:
        rows[cells[0]] = cells[1]

catalog = dict(re.findall(r'^(\w+) = "([^"]+)"', open(CATALOG, encoding='utf-8').read(), flags=re.M))

errors = []
for key, (label, pattern) in RULES.items():
    if label not in rows:
        errors.append(f'Version Snapshot has no "{label}" row')
        continue
    m = re.search(pattern, rows[label])
    if not m:
        errors.append(f'no version found in the "{label}" row for {key}')
    elif catalog.get(key) != m.group(1):
        errors.append(f'{key}: catalog has {catalog.get(key)}, Version Snapshot has {m.group(1)}')
if errors:
    sys.exit('Versions out of step. Fix libs.versions.toml or the Version Snapshot:\n  ' + '\n  '.join(errors))
print('versions match the Version Snapshot')
