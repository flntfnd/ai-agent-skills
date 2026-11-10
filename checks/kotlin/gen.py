#!/usr/bin/env python3
"""Turns every ```kotlin fence under skills/claude into a Kotlin source file in .build/generated/kotlin.

Sample text is copied verbatim from the markdown on every run. The only things added are the
package line, imports, and the scaffolding named in wrappers.py.

  gen.py                 generate
  gen.py --inject NAME   generate, then add a deliberately broken sample (optin | deprecated)
"""
import glob, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SKILLS = os.path.join(REPO, 'skills', 'claude')
OUT = os.path.join(HERE, '.build', 'generated', 'kotlin')

STAR = """android.os.Build
androidx.annotation.RequiresApi
androidx.annotation.StringRes
androidx.compose.animation.*
androidx.compose.animation.core.*
androidx.compose.foundation.*
androidx.compose.foundation.interaction.*
androidx.compose.foundation.layout.*
androidx.compose.foundation.lazy.*
androidx.compose.foundation.lazy.grid.*
androidx.compose.foundation.shape.*
androidx.compose.foundation.text.*
androidx.compose.foundation.text.input.*
androidx.compose.material.icons.Icons
androidx.compose.material.icons.filled.*
androidx.compose.material3.*
androidx.compose.material3.adaptive.*
androidx.compose.material3.adaptive.navigationsuite.*
androidx.compose.runtime.*
androidx.compose.runtime.saveable.*
androidx.compose.ui.*
androidx.compose.ui.draw.*
androidx.compose.ui.geometry.*
androidx.compose.ui.graphics.*
androidx.compose.ui.graphics.drawscope.*
androidx.compose.ui.graphics.painter.*
androidx.compose.ui.graphics.vector.*
androidx.compose.ui.hapticfeedback.*
androidx.compose.ui.input.nestedscroll.*
androidx.compose.ui.layout.*
androidx.compose.ui.platform.*
androidx.compose.ui.res.*
androidx.compose.ui.semantics.*
androidx.compose.ui.text.*
androidx.compose.ui.text.font.*
androidx.compose.ui.text.style.*
androidx.compose.ui.unit.*
kotlinx.coroutines.*
skills.samples.R""".split('\n')

BROKEN = {
    'optin': ('This material3 API is experimental',
              'package selftest\nimport androidx.compose.material3.LoadingIndicator\n'
              'import androidx.compose.runtime.Composable\n'
              '@Composable fun MissingOptIn() { LoadingIndicator() }\n'),
    'deprecated': ('is deprecated',
                   'package selftest\nimport androidx.compose.material3.adaptive.currentWindowAdaptiveInfo\n'
                   'import androidx.compose.runtime.Composable\n'
                   '@Composable fun DeprecatedCall() { currentWindowAdaptiveInfo() }\n'),
}

ns = {}
exec(open(os.path.join(HERE, 'wrappers.py')).read(), ns)
SPEC, TOKENS, SKIP = ns['SPEC'], ns['TOKENS'], ns['SKIP']


def fences():
    for path in sorted(glob.glob(os.path.join(SKILLS, '**', '*.md'), recursive=True)):
        text = open(path, encoding='utf-8').read()
        rel = os.path.relpath(path, SKILLS)
        skill = rel.split(os.sep)[0].replace('-', '_')
        name = os.path.basename(rel)[:-3].replace('-', '_')
        for i, m in enumerate(re.finditer(r'```kotlin\n(.*?)```', text, flags=re.S)):
            line = text[:m.start()].count('\n') + 2
            yield f'{skill}__{name}__{i}', f'{rel}:{line}', m.group(1)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    found = list(fences())
    keys = {k for k, _, _ in found}
    known = set(SPEC) | set(SKIP)
    problems = [f'no wrapper row for {k} ({src})' for k, src, _ in found if k not in known]
    problems += [f'wrapper row {k} matches no fence' for k in sorted(known - keys)]
    if problems:
        sys.exit('wrappers.py is out of step with the skills:\n  ' + '\n  '.join(problems))

    compiled = 0
    for key, source, body in found:
        if key in SKIP:
            continue
        sp = SPEC[key]
        pkg = TOKENS.get(key) or f's.{key}'
        own = [l for l in body.split('\n') if l.startswith('import ')]
        body = '\n'.join(l for l in body.split('\n') if not l.startswith('import '))
        imports = [f'import {i}' for i in STAR + sp.get('imports', [])] + own
        imports += [f'import {t}.*' for t in sp.get('tokens', []) if t != pkg]
        top, stmts = '', body
        mode = sp.get('mode', 'body')
        if mode == 'top':
            top, stmts = body, ''
        elif mode == 'split':
            i = body.index(sp['split'])
            top, stmts = body[:i], body[i:]
        if 'wrap_from' in sp:
            marker, opener, closer = sp['wrap_from']
            i = stmts.index(marker)
            stmts = stmts[:i] + opener + '\n' + stmts[i:] + '\n' + closer
        out = [f'// SOURCE {source}', f'package {pkg}', ''] + sorted(set(imports)) + ['', sp.get('top', ''), top]
        if stmts.strip():
            out.append(f"@Composable\nfun Sample({sp.get('params', '')}) {{\n{sp.get('pre', '')}\n{stmts}\n}}")
        write(os.path.join(OUT, *pkg.split('.'), f'{key}.kt'), '\n'.join(out) + '\n')
        compiled += 1

    if '--inject' in sys.argv:
        name = sys.argv[sys.argv.index('--inject') + 1]
        write(os.path.join(OUT, 'selftest', f'{name}.kt'), BROKEN[name][1])
        print(BROKEN[name][0])
        return
    print(f'{compiled} samples generated, {len(SKIP)} skipped')


if __name__ == '__main__':
    main()
