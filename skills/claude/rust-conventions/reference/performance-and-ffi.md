# Performance, unsafe and FFI, WASM, documentation

## Contents

- [Iterators](#iterators)
- [Allocation awareness](#allocation-awareness)
- [Unsafe](#unsafe)
- [FFI](#ffi)
- [WASM](#wasm)
- [Documentation](#documentation)

## Iterators

Per CLAUDE.md, iterators over manual index loops. An index loop re-checks bounds on every access, can panic, and hides intent.

```rust
// Wrong: indices, bounds checks, a panic waiting for the day the lengths differ
for i in 0..left.len() {
    out[i] = left[i] * gain + right[i];
}

// Right
for ((o, l), r) in out.iter_mut().zip(left).zip(right) {
    *o = l * gain + r;
}
```

The adapters that replace most index arithmetic: `zip`, `enumerate` (when the index is data, not an accessor), `windows`/`array_windows`, `chunks_exact`, `rev`, and `split_at_mut` for two disjoint mutable halves. Index when the algorithm is genuinely about positions (binary search, a matrix kernel), and say so in a comment.

Don't collect just to loop. `users.iter().map(|u| u.name.clone()).collect::<Vec<_>>()` followed by a `for` allocates a vector and clones every element to do what `for user in &users` does for free. Collect only when you need the collection itself.

## Allocation awareness

- Parameters take `&str`, not `String` or `&String`. Return `Cow<'_, str>` when the function only sometimes allocates. `Arc<str>` for strings shared across tasks, `Box<str>` for immutable owned ones.
- `format!` allocates. `write!(&mut buf, ...)` reuses a buffer.
- `with_capacity(n)` when the size is known.

Profile before optimizing: `cargo flamegraph` for CPU, `dhat` for heap, `cargo bloat` for binary size, `tokio-console` for stalled tasks. Benchmark `--release` only. Debug-build timings mean nothing.

## Unsafe

Every `unsafe` block gets a `// SAFETY:` comment naming the invariants it relies on and why they hold here. An `unsafe fn` documents its contract in a `# Safety` doc section, which is what callers quote in their own comments.

Edition 2024 changes how unsafe code is written:

- **`unsafe fn` bodies aren't implicitly unsafe.** Each unsafe operation inside still needs its own `unsafe {}` block and comment (`unsafe_op_in_unsafe_fn`, denied in the manifest).
- **`extern` blocks are `unsafe extern`**, with each item marked `safe` or `unsafe`.
- **`#[no_mangle]`, `#[export_name]`, `#[link_section]` are written `#[unsafe(no_mangle)]`** and so on.
- **`std::env::set_var` and `remove_var` are `unsafe`.** They race with any thread reading the environment. Set configuration before spawning threads, or pass it explicitly.
- **References to `static mut` are denied.** Use an atomic, a `Mutex`, or `LazyLock`.

Keep unsafe small and behind a safe API. One module owns the raw pointers, everything else calls safe functions. Run that module's tests under Miri.

## FFI

```rust
#[repr(C)]
pub struct Buffer {
    data: *const u8,
    len: usize,
}

/// Sums the bytes in `buf`. Returns -1 if `buf.data` is null.
///
/// # Safety
///
/// `buf.data` must be null or point to `buf.len` initialized bytes that stay
/// valid and unmodified for the duration of the call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn checksum(buf: Buffer) -> i64 {
    if buf.data.is_null() {
        return -1;
    }
    // SAFETY: data is non-null (checked above) and the caller guarantees it points
    // to len initialized bytes that are not mutated while this slice is alive.
    let bytes = unsafe { std::slice::from_raw_parts(buf.data, buf.len) };
    bytes.iter().map(|&b| i64::from(b)).sum()
}

unsafe extern "C" {
    /// # Safety
    /// `s` must point to a NUL-terminated string.
    pub unsafe fn strlen(s: *const std::ffi::c_char) -> usize;

    // No preconditions, so callers don't need an unsafe block.
    pub safe fn abs(n: std::ffi::c_int) -> std::ffi::c_int;
}
```

Rules at the boundary:

- **Null-check every pointer**, and document who owns what it points to and for how long.
- **Panics don't cross.** Unwinding out of an `extern "C"` function aborts the process. Either the body can't panic, or it wraps the work in `std::panic::catch_unwind` and returns an error code.
- **Ownership transfers are explicit pairs.** `Box::into_raw` to hand an object to C, a matching exported `free_x` that calls `Box::from_raw`. Never free Rust allocations with C's `free` or the reverse. Don't `Box::leak` memory that gets reclaimed later.
- **`#[repr(C)]` on every type that crosses**, `core::ffi` C types instead of guessed widths, `CStr`/`CString` for strings.
- **Validate `bool`, `char`, and enum values arriving from C.** An out-of-range value is undefined behavior.
- Errors cross as integer codes or out-parameters, not `Result`.

`cbindgen` generates C headers from Rust. `bindgen` generates Rust from C headers. Both run in `build.rs`.

## WASM

`wasm-bindgen` is the foundation, with `web-sys`/`js-sys` for the DOM and JS and `wasm-bindgen-futures` to run futures on the JS event loop. The browser is a different runtime: no Tokio, no filesystem, no threads without `SharedArrayBuffer` and cross-origin isolation.

`wasm-pack` builds library-shaped output (an npm package consumed by a JS bundler). `trunk` is for app-shaped projects where Rust owns the page. Both are maintained.

On current compilers, `extern "C"` on `wasm32-unknown-unknown` follows the standard C ABI, and undefined symbols are link errors instead of silent imports. Recheck code written against older toolchains that passed structs by value across the boundary.

## Documentation

`///` examples compile and run as tests. Use doctests for the public API surface. `cargo nextest` doesn't run them, so CI runs `cargo test --doc` separately.

Libraries enable `missing_docs` under `[lints.rust]` and document `# Errors`, `# Panics`, and `# Safety` where they apply. Don't enable it for binaries or internal crates.
