# Async and concurrency

## Contents

- [Runtime](#runtime)
- [Async closures](#async-closures)
- [Cancellation safety](#cancellation-safety)
- [Send bounds and dyn on async traits](#send-bounds-and-dyn-on-async-traits)
- [Don't block the runtime](#dont-block-the-runtime)
- [Structured concurrency](#structured-concurrency)
- [Background tasks and shutdown](#background-tasks-and-shutdown)
- [Channels, locks, shared state](#channels-locks-shared-state)

## Runtime

Tokio. One runtime per binary. `#[tokio::main]` gives the multi-thread runtime with one worker per available core. The count respects cgroup CPU quotas on Linux, so the default is right in a container. Override with `TOKIO_WORKER_THREADS` or `worker_threads = N` only when measurement says so. `flavor = "current_thread"` is for tests and CLIs, not servers.

Depend on `tokio = "1"` with a committed lockfile. Tokio also keeps LTS lines patched for at least a year. Pin one with a tilde requirement (`"~1.xx"`) only when a slower-moving dependency is worth more than new features. The live lines are in the snapshot in [crate-selection.md](crate-selection.md).

## Async closures

`async || {}` is the default for local async callbacks. Unlike a closure returning an `async` block, it can borrow from its captures across the await. APIs that await a callback in place take `impl AsyncFn(..)`, `AsyncFnMut`, or `AsyncFnOnce`.

```rust
let process = async |item: &Item| -> anyhow::Result<()> {
    save(item).await?;
    notify(item).await
};
for item in &items {
    process(item).await?;
}
```

The limit: there's no stable way to require that the future an `AsyncFn` returns is `Send`. A callback that gets handed to `tokio::spawn` still needs the older shape:

```rust
fn spawn_each<F, Fut>(items: Vec<Item>, f: F)
where
    F: Fn(Item) -> Fut,
    Fut: Future<Output = ()> + Send + 'static,
{
    for item in items {
        tokio::spawn(f(item));
    }
}
```

## Cancellation safety

Every `.await` is a cancellation point. If the future is dropped (a timeout, `select!` picking another branch, the caller being cancelled), execution stops there and nothing after it runs. `Drop` does run. So cleanup goes in a guard, never at the end of the function:

```rust
async fn process(file: &File) -> Result<Output> {
    let _guard = scopeguard::guard(file, |f| cleanup_sync(f)); // runs on completion and on cancellation
    let data = read_async(file).await?;
    transform(&data).await
}
```

`Drop` can't await. Async cleanup goes through an explicit shutdown path: a `CancellationToken` the task observes, with the cleanup after its loop exits (below).

In `tokio::select!`, losing branches are dropped mid-poll. That's only safe if the future holds no partial state. `mpsc::Receiver::recv`, `CancellationToken::cancelled`, `JoinSet::join_next`, `Signal::recv`, and `sleep` are cancel-safe. `read_exact`, `write_all`, and most hand-written multi-step futures aren't. Tokio documents cancel safety per method. Check before putting one in a `select!` loop. Work in a branch's body, after the `=>`, isn't affected.

## Send bounds and dyn on async traits

`async fn` in traits is stable, with two gaps.

**Send bounds.** A generic function can't say "the future this trait method returns is `Send`", which `tokio::spawn` and axum need. Use `trait_variant`:

```rust
#[trait_variant::make(Send)]
pub trait Repository {
    async fn fetch(&self, id: Uuid) -> Result<Item>;
}
```

**Dynamic dispatch.** A trait with `async fn` isn't dyn-compatible. Prefer generics (`impl Repository`). Where `dyn` is the point, use the `async-trait` crate or return `Pin<Box<dyn Future<Output = T> + Send + '_>>` by hand.

## Don't block the runtime

Sync work longer than a few tens of microseconds stalls every task queued on that worker.

- Blocking I/O and synchronous libraries: `tokio::task::spawn_blocking`.
- Sustained CPU work: a bounded pool (`rayon`, or `spawn_blocking` behind a `Semaphore`), result returned over a `oneshot`. The blocking pool grows to hundreds of threads on demand. It's not a compute scheduler.
- A `spawn_blocking` closure can't be cancelled once it starts.

## Structured concurrency

Spawn, await in scope, handle results.

```rust
let (user, orders, prefs) = tokio::try_join!(
    fetch_user(id),
    fetch_orders(id),
    fetch_preferences(id),
)?;
```

`try_join!` runs the futures concurrently on one task and returns on the first error, dropping the rest. For a dynamic number of tasks use `JoinSet`, which aborts its tasks when dropped:

```rust
let mut set = tokio::task::JoinSet::new();
for url in urls {
    set.spawn(fetch(url));
}
while let Some(joined) = set.join_next().await {
    let body = joined??; // outer: task panicked or was aborted; inner: fetch failed
    handle(body);
}
```

Bound the fan-out with a `Semaphore` permit per spawn, or `futures::StreamExt::buffer_unordered(n)`. Between pipeline stages use bounded channels. An unbounded channel has no backpressure and turns a slow consumer into memory growth.

## Background tasks and shutdown

Don't `tokio::spawn` from a request handler and drop the handle. The task outlives the request, loses its tracing span unless you attach one with `.instrument(...)`, and gets killed wherever it happens to be when the process stops. Work that must outlive a request goes in a queue, or in a task the process tracks:

```rust
use tokio_util::{sync::CancellationToken, task::TaskTracker};

let tracker = TaskTracker::new();
let shutdown = CancellationToken::new();

let token = shutdown.clone();
tracker.spawn(async move {
    loop {
        tokio::select! {
            () = token.cancelled() => break,
            Some(job) = jobs.recv() => handle(job).await, // not interrupted mid-job
        }
    }
    flush().await; // async cleanup lives here
});

// on SIGTERM:
shutdown.cancel();
tracker.close();
tracker.wait().await; // returns once every tracked task has finished
```

`TaskTracker` needs tokio-util's `rt` feature. Wrap the wait in `tokio::time::timeout` with a deadline shorter than the platform's kill timeout, so a stuck task becomes a logged error instead of a `SIGKILL`. Signal handling is in [web-stack.md](web-stack.md).

## Channels, locks, shared state

- **Channels**: `mpsc` (bounded; choose the size deliberately), `watch` for latest-value state, `broadcast` for fan-out (slow receivers get `Lagged` and lose messages), `oneshot` for request/reply. In sync code `crossbeam-channel`. `flume` when one channel has to bridge sync and async.
- **`std::sync::Mutex` is correct in async code** when the critical section is short and has no `.await`. Never hold a `std` guard across an await. Take the lock in an inner block that ends before the next `.await`. Clippy's `await_holding_lock` catches it.
- **`tokio::sync::Mutex`** only when a lock genuinely has to be held across `.await` (serializing use of one connection). It's slower.
- **Poisoning**: `lock()` fails only if a holder panicked. `.expect("state mutex poisoned")` is the honest handling for state that's invalid after a panic.
- **Atomics** for counters and flags. Default to `SeqCst`. Relax to `Relaxed` for a standalone counter or `Acquire`/`Release` for a flag guarding other data, with the reason in a comment.
- **Read-mostly config** replaced wholesale: `arc-swap`. **Concurrent map**: `dashmap`.
- **Lazy statics**: `std::sync::LazyLock`, not `lazy_static` or `once_cell`.
