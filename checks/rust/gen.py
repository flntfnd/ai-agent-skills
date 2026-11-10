#!/usr/bin/env python3
"""Builds a Cargo workspace in .build/ws from the rust-conventions skill's markdown.

Every manifest, config file and Rust sample is read out of the skill at run time.
The only text this file adds is the scaffolding a sample leaves out (stub types and
functions) and the concessions listed below.
"""
import glob
import os
import re
import sys
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(f'{HERE}/../../skills/claude/rust-conventions')
WS = f'{HERE}/.build/ws'

# Everything the generator changes in, or wraps around, the skill's own text.
CONCESSIONS = {
    'dead_code': {
        'where': 'crates/samples/src/lib.rs and crates/my-api/src/main.rs',
        'change': '#![allow(dead_code)]',
        'why': 'Fragments define items that nothing in a harness calls.',
    },
    'pub_error': {
        'where': 'web-stack.md, the AppError sample',
        'change': ('enum AppError', 'pub(crate) enum AppError'),
        'why': 'The server sample and the error sample are compiled into one binary as separate modules.',
    },
    'pub_tracing': {
        'where': 'observability.md, the subscriber sample',
        'change': ('fn init_tracing', 'pub(crate) fn init_tracing'),
        'why': 'Same reason: the server sample calls it from another module.',
    },
    'wrong_half': {
        'where': 'performance-and-ffi.md, the half of the iterator sample labelled "Wrong"',
        'change': '#[allow(clippy::needless_range_loop)]',
        'why': 'The sample shows the index loop on purpose.',
    },
    'placeholders': {
        'where': 'manifests and rust-toolchain.toml',
        'change': '1.xx and 1.xx.y filled in from the "Rust stable" row of the crate snapshot',
        'why': 'The skill keeps exact versions in the snapshot only.',
    },
    'audit_ignore': {
        'where': '.cargo/audit.toml',
        'change': ('RUSTSEC-0000-0000', 'RUSTSEC-2026-0459'),
        'why': 'libsqlite3-sys is in Cargo.lock through sqlx\'s optional drivers and is never built. '
               'The skill\'s sample uses a placeholder id.',
    },
}


def blocks(name, lang):
    text = open(f'{SKILL}/{name}').read()
    return [m.group(1) for m in re.finditer(rf'```{lang}\n(.*?)```', text, re.S)]


def pick(samples, test, what):
    """The one sample matching `test`. Fails loudly if the skill changed shape."""
    if isinstance(test, str):
        marker = test
        test = lambda s: marker in s
    found = [s for s in samples if test(s)]
    if len(found) != 1:
        sys.exit(f'gen.py: expected exactly one sample for "{what}", found {len(found)}. '
                 'The skill changed; update gen.py.')
    return found[0]


def ind(code, n=4):
    return textwrap.indent(code, ' ' * n)


def swap(code, key):
    old, new = CONCESSIONS[key]['change']
    if old not in code:
        sys.exit(f'gen.py: concession "{key}" no longer applies; update gen.py.')
    return code.replace(old, new)


def write(path, text):
    os.makedirs(os.path.dirname(f'{WS}/{path}'), exist_ok=True)
    with open(f'{WS}/{path}', 'w') as f:
        f.write(text)


def scaffold(name):
    return open(f'{HERE}/scaffold/{name}').read()


def main():
    inject = sys.argv[sys.argv.index('--inject') + 1] if '--inject' in sys.argv else None

    def rs(f):
        return blocks(f, 'rust')

    def toml(f):
        return blocks(f, 'toml')

    skill, asy = rs('SKILL.md'), rs('reference/async-and-concurrency.md')
    aud, obs = rs('reference/audio-thread.md'), rs('reference/observability.md')
    perf, tst = rs('reference/performance-and-ffi.md'), rs('reference/testing-and-structure.md')
    web = rs('reference/web-stack.md')
    cfg, webcfg = toml('reference/testing-and-structure.md'), toml('reference/web-stack.md')
    all_rust = [s for f in glob.glob(f'{SKILL}/**/*.md', recursive=True)
                for s in blocks(os.path.relpath(f, SKILL), 'rust')]

    snapshot = open(f'{SKILL}/reference/crate-selection.md').read()
    m = re.search(r'\| Rust stable \| (\d+\.\d+)\.(\d+) \|', snapshot)
    if not m:
        sys.exit('gen.py: no "Rust stable" row in the crate snapshot.')
    minor, stable = m.group(1), f'{m.group(1)}.{m.group(2)}'

    mods = {}
    used = []

    def take(samples, test, what):
        s = pick(samples, test, what)
        used.append(s)
        return s

    errors = take(skill, 'enum DbError', 'error handling')
    lib_half, app_half = errors.split('// Application:', 1)
    mods['skill_errors'] = f'''{lib_half}
pub async fn load(path: &std::path::Path) -> anyhow::Result<String> {{
    use anyhow::Context;
    // Application:{ind(app_half)[4:]}
    Ok(raw)
}}
'''
    mods['async_closures'] = f'''pub struct Item;
async fn save(_: &Item) -> anyhow::Result<()> {{ Ok(()) }}
async fn notify(_: &Item) -> anyhow::Result<()> {{ Ok(()) }}
pub async fn run(items: Vec<Item>) -> anyhow::Result<()> {{
{ind(take(asy, 'async |item: &Item|', 'async closure'))}
    Ok(())
}}
'''
    mods['async_spawn_each'] = f'''pub struct Item;
{take(asy, 'fn spawn_each', 'spawn_each')}'''
    mods['async_cancel'] = f'''pub struct File;
pub struct Output;
type Result<T> = anyhow::Result<T>;
fn cleanup_sync(_: &File) {{}}
async fn read_async(_: &File) -> Result<Vec<u8>> {{ Ok(Vec::new()) }}
async fn transform(_: &[u8]) -> Result<Output> {{ Ok(Output) }}
{take(asy, 'scopeguard::guard', 'drop guard')}'''
    mods['async_trait_variant'] = f'''use uuid::Uuid;
pub struct Item;
type Result<T> = anyhow::Result<T>;
{take(asy, 'trait_variant::make', 'trait_variant')}'''
    mods['async_try_join'] = f'''async fn fetch_user(_: u64) -> anyhow::Result<u8> {{ Ok(0) }}
async fn fetch_orders(_: u64) -> anyhow::Result<u8> {{ Ok(0) }}
async fn fetch_preferences(_: u64) -> anyhow::Result<u8> {{ Ok(0) }}
pub async fn run(id: u64) -> anyhow::Result<(u8, u8, u8)> {{
{ind(take(asy, 'try_join!', 'try_join'))}
    Ok((user, orders, prefs))
}}
'''
    mods['async_joinset'] = f'''async fn fetch(_: String) -> anyhow::Result<String> {{ Ok(String::new()) }}
fn handle(_: String) {{}}
pub async fn run(urls: Vec<String>) -> anyhow::Result<()> {{
{ind(take(asy, 'JoinSet::new', 'JoinSet'))}
    Ok(())
}}
'''
    mods['async_shutdown'] = f'''pub struct Job;
async fn handle(_: Job) {{}}
async fn flush() {{}}
pub async fn run(mut jobs: tokio::sync::mpsc::Receiver<Job>) {{
{ind(take(asy, 'TaskTracker::new', 'tracked shutdown'))}}}
'''
    mods['audio_ring'] = f'''fn draw_meter(_: f32) {{}}
pub fn run(peak: f32) {{
{ind(take(aud, 'RingBuffer::<f32>::new', 'ring buffer'))}}}
'''
    mods['audio_no_alloc'] = f'''fn process(s: f32) -> f32 {{ s * 0.5 }}
{take(aud, 'AllocDisabler', 'no-alloc check')}'''
    mods['obs_instrument'] = f'''use sqlx::PgPool;
use uuid::Uuid;
pub struct User {{ pub id: Uuid, pub display_name: String }}
{take(obs, '#[instrument', 'instrument')}'''
    subscriber = take(obs, 'fn init_tracing() {', 'subscriber setup')
    mods['obs_subscriber'] = subscriber
    mods['obs_otel'] = take(obs, 'SdkTracerProvider', 'OpenTelemetry setup')
    mods['obs_trace_id'] = f'''pub fn run() {{
{ind(take(obs, 'span.record', 'trace id'))}}}
'''
    wrong, right = take(perf, 'for ((o, l), r)', 'iterators').split('// Right', 1)
    mods['perf_iter'] = f'''pub fn run(out: &mut [f32], left: &[f32], right: &[f32], gain: f32) {{
    {CONCESSIONS['wrong_half']['change']}
    {{
{ind(wrong, 8)}    }}
    // Right{ind(right)}}}
'''
    mods['perf_ffi'] = take(perf, 'extern "C" fn checksum', 'FFI')
    mods['web_query'] = f'''use uuid::Uuid;
pub struct User {{ pub id: Uuid, pub display_name: String }}
pub async fn run(pool: sqlx::PgPool, id: Uuid) -> anyhow::Result<User> {{
{ind(take(web, lambda s: s.startswith('let user = sqlx::query_as!'), 'query_as fragment'))}
    Ok(user)
}}
'''
    app_error = take(web, 'impl IntoResponse for AppError', 'AppError')
    mods['web_error'] = app_error
    mods['web_layers'] = f'''use std::sync::Arc;
use axum::{{Router, routing::get}};
pub struct AppState;
async fn get_user() {{}}
pub fn run(state: Arc<AppState>) -> Router {{
{ind(take(web, 'ServiceBuilder::new()', 'middleware stack'))}
    app.route("/extra", get(get_user))
}}
'''
    mods['web_from_fn'] = f'''#[derive(Clone)]
pub struct CurrentUser;
#[derive(Debug)]
pub struct AppError;
impl axum::response::IntoResponse for AppError {{
    fn into_response(self) -> Response {{ axum::http::StatusCode::UNAUTHORIZED.into_response() }}
}}
async fn authenticate(_: &axum::http::HeaderMap) -> Result<CurrentUser, AppError> {{ Ok(CurrentUser) }}
{take(web, 'async fn require_user', 'from_fn middleware')}
pub fn layer() -> axum::Router {{
    axum::Router::new().layer(axum::middleware::from_fn(require_user))
}}
'''
    mods['web_jwt'] = take(web, 'fn verify(', 'JWT verification')
    server = take(web, '#[tokio::main]', 'server program')
    tests = take(tst, 'start_paused', 'async tests')
    sqlx_test = take(tst, '#[sqlx::test]', 'sqlx::test')

    missed = [s for s in all_rust if s not in used]
    if missed:
        sys.exit('gen.py: the skill has a Rust sample this check does not compile:\n\n' + missed[0])

    if inject == 'compile':
        mods['injected'] = 'pub fn broken() -> u32 {\n    "not a number"\n}\n'
    elif inject == 'clippy':
        mods['injected'] = 'pub fn broken(v: Option<u32>) -> u32 {\n    v.unwrap()\n}\n'

    lib = f"//! The skill's Rust samples, compiled inside the scaffolding each one leaves out.\n{CONCESSIONS['dead_code']['change']}\n\n"
    for name, body in mods.items():
        write(f'crates/samples/src/{name}.rs', body)
        lib += f'pub mod {name};\n'
    write('crates/samples/src/lib.rs', lib + 'pub mod claims;\n')
    write('crates/samples/src/claims.rs', scaffold('claims.rs'))
    write('crates/samples/tests/jwt_exp.rs', scaffold('jwt_exp.rs'))

    member = pick(cfg, 'name = "my-db"', 'workspace member manifest')

    def manifest(name):
        return member.replace('"my-db"', f'"{name}"').split('[dependencies]')[0] + '[dependencies]\n'

    deps = pick(webcfg, '[dependencies]', 'default dependency block').replace('[dependencies]\n', '')
    jwt_dep = pick(webcfg, 'jsonwebtoken = {', 'jsonwebtoken dependency')
    write('crates/samples/Cargo.toml', manifest('samples') + deps + jwt_dep + '''reqwest = { version = "0.13", default-features = false, features = ["rustls", "http2", "json"] }
scopeguard = "1"
trait-variant = "0.1"
rtrb = "0.4"
assert_no_alloc = "1"
basedrop = "0.1"
arc-swap = "1"
futures = "0.3"
opentelemetry = "0.33"
opentelemetry_sdk = "0.33"
opentelemetry-otlp = "0.33"
tracing-opentelemetry = "0.34"
''')

    write('crates/my-api/Cargo.toml', manifest('my-api') + deps)
    write('crates/my-api/src/main.rs', f'''{CONCESSIONS['dead_code']['change']}
{server}
#[derive(serde::Serialize)]
struct User {{
    id: uuid::Uuid,
    display_name: String,
}}

async fn health(State(state): State<Arc<AppState>>) -> axum::http::StatusCode {{
    match sqlx::query_scalar!("SELECT 1").fetch_one(&state.db).await {{
        Ok(_) => axum::http::StatusCode::OK,
        Err(_) => axum::http::StatusCode::SERVICE_UNAVAILABLE,
    }}
}}

mod error {{
{ind(swap(app_error, 'pub_error'))}}}
use error::AppError;

mod tracing_init {{
{ind(swap(subscriber, 'pub_tracing'))}}}
use tracing_init::init_tracing;
''')

    write('crates/my-core/Cargo.toml', manifest('my-core'))
    write('crates/my-core/src/lib.rs', scaffold('my_core.rs'))
    write('crates/my-db/Cargo.toml', member + '''sqlx = { workspace = true, features = ["uuid", "macros", "migrate"] }
uuid = { version = "1", features = ["v4"] }
anyhow = "1"

[dev-dependencies]
tokio = { workspace = true, features = ["test-util"] }
''')
    write('crates/my-db/src/lib.rs', scaffold('my_db.rs'))
    write('crates/my-db/migrations/20260416120000_initial.sql', open(f'{HERE}/schema.sql').read())
    # The skill's rule for tests/*.rs: helpers there aren't covered by allow-unwrap-in-tests.
    write('crates/my-db/tests/integration.rs', f'''#![allow(clippy::unwrap_used)]
use my_db::{{User, create_user, fetch_user}};
use sqlx::PgPool;

async fn test_pool() -> PgPool {{
    PgPool::connect(&std::env::var("DATABASE_URL").unwrap()).await.unwrap()
}}

async fn create_test_user(pool: &PgPool) -> User {{
    let id = create_user(pool, "Test").await.unwrap();
    fetch_user(pool, id).await.unwrap()
}}

{tests}
{sqlx_test}''')

    package = pick(cfg, 'name = "my-app"', 'package manifest')
    workspace = pick(cfg, '[workspace]\n', 'workspace manifest')
    write('Cargo.toml', workspace.replace('1.xx', minor) + '\n' + package[package.index('[profile.release]'):])
    write('rust-toolchain.toml', pick(cfg, '[toolchain]', 'rust-toolchain.toml').replace('1.xx.y', stable))
    write('clippy.toml', 'allow-unwrap-in-tests = true\n')
    write('deny.toml', pick(cfg, '[licenses]', 'deny.toml'))
    write('.cargo/audit.toml', swap(pick(cfg, '.cargo/audit.toml', 'audit.toml'), 'audit_ignore'))

    # The gates are run exactly as SKILL.md writes them.
    gates = pick(blocks('SKILL.md', 'bash'), 'cargo fmt', 'CI gates')
    lines = [re.sub(r'\s+#.*$', '', l).strip() for l in gates.splitlines() if l.strip()]
    safe = re.compile(r'^(CARGO_BUILD_WARNINGS=deny )?cargo [a-z]+( [A-Za-z0-9_.=/-]+)*$')
    bad = [l for l in lines if not safe.match(l)]
    if bad or len(lines) != 6:
        sys.exit(f'gen.py: the CI gates block in SKILL.md is not the six plain cargo commands this check expects: {bad or lines}')
    with open(f'{HERE}/.build/gates.txt', 'w') as f:
        f.write('\n'.join(lines) + '\n')
    with open(f'{HERE}/.build/samples.txt', 'w') as f:
        f.write('\n\x00\n'.join(all_rust))
    print(f'generated {len(used)} samples, toolchain {stable}')


def verify_fmt():
    """After `cargo fmt`, every line of every sample must still be there unchanged."""
    formatted = set()
    for path in glob.glob(f'{WS}/crates/**/*.rs', recursive=True):
        formatted.update(l.strip() for l in open(path) if l.strip())
    bad = [l for s in open(f'{HERE}/.build/samples.txt').read().split('\n\x00\n')
           for l in s.splitlines() if l.strip() and l.strip() not in formatted]
    if bad:
        sys.exit('rustfmt would change these sample lines:\n' + '\n'.join(bad))


if __name__ == '__main__':
    verify_fmt() if '--verify-fmt' in sys.argv else main()
