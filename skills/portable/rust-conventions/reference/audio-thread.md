# Audio thread (extends AGENTS.md)

AGENTS.md sets the rule: on the realtime callback, no allocations, no locks or blocking calls, no Objective-C messaging, lock-free ring buffers for cross-thread communication, buffer-size assumptions documented, written for worst-case scheduler jitter. This is how that rule is implemented in Rust.

## Contents

- [What the callback may not do](#what-the-callback-may-not-do)
- [Lock-free SPSC ring buffers](#lock-free-spsc-ring-buffers)
- [Parameters and state snapshots](#parameters-and-state-snapshots)
- [No-alloc check](#no-alloc-check)
- [Drop discipline](#drop-discipline)
- [Stream setup with cpal](#stream-setup-with-cpal)
- [Crate status](#crate-status)

## What the callback may not do

The callback has one buffer period to finish, every time, including when the scheduler is late. Anything with unbounded or scheduler-dependent latency is out.

| Not allowed | Why | Instead |
| --- | --- | --- |
| `Vec::push`, `String`, `Box::new`, `format!`, `collect()` | The allocator takes a lock and can call into the kernel | Preallocate in setup, reuse fixed buffers |
| `Mutex`, `RwLock`, `mpsc`, `Condvar`, any channel that can park | A descheduled non-realtime thread holding the lock stalls the callback (priority inversion) | SPSC ring buffer, atomics |
| `println!`, `tracing` macros, file or socket I/O | Syscalls, a lock on stdout, formatting allocates | Push a small `Copy` event to a ring buffer, log from another thread |
| Dropping `Vec`, `Box`, `String`, or the last `Arc` | Deallocation is an allocator call too | [Drop discipline](#drop-discipline) |
| `thread::sleep`, `yield_now`, spinning on a condition | Hands the deadline to the scheduler | Do the work available now, return |
| Panicking | Unwinding allocates and may cross an FFI boundary | Iterate preallocated slices instead of indexing |

## Lock-free SPSC ring buffers

Any handoff where one side is the realtime thread goes through a wait-free single-producer single-consumer queue. `rtrb` is the default.

```rust
use std::sync::atomic::{AtomicU64, Ordering};

use rtrb::RingBuffer;

// Capacity assumption: the UI thread drains meter values at 60 Hz (every ~16.7 ms).
// At 48 kHz with 64-frame buffers the callback runs every ~1.3 ms, so about 13 pushes
// land between drains. 256 slots covers a UI stall of roughly 340 ms before values drop.
const METER_CAPACITY: usize = 256;

static METER_DROPS: AtomicU64 = AtomicU64::new(0);

let (mut meter_tx, mut meter_rx) = RingBuffer::<f32>::new(METER_CAPACITY);

// Audio thread: never blocks. A full buffer means the reader stalled; count it and move on.
if meter_tx.push(peak).is_err() {
    METER_DROPS.fetch_add(1, Ordering::Relaxed);
}

// UI thread:
while let Ok(peak) = meter_rx.pop() {
    draw_meter(peak);
}
```

- **Allocate once at setup, never resize.** Capacity is a design decision. Write it next to the constant, as above: producer rate, consumer rate, and how long a stall it tolerates.
- **Size for the worst case.** The non-realtime side can be descheduled for tens of milliseconds under load. The realtime side can be called late and then twice in quick succession.
- **Both ends tolerate the other being slow.** `push` on full and `pop` on empty return immediately. For audio flowing into the callback, empty is an underrun: output silence or hold the last block, count it, never wait.
- **Move audio in blocks** with `write_chunk_uninit`/`read_chunk`, not sample by sample.
- **Elements are `Copy`.** A queue of owned values moves the drop problem to whichever end pops them.

`crossbeam-queue`'s `ArrayQueue` is MPMC and lock-free but not wait-free. Keep it off the realtime thread.

## Parameters and state snapshots

- **Single values** (gain, bypass, a meter level): atomics. `AtomicU32` holding `f32::to_bits`, `Ordering::Relaxed` when the value stands alone.
- **A struct that must be read consistently** (a set of filter coefficients): build it off-thread and hand the whole thing over, through `triple_buffer` or an SPSC queue. Send the old value back on a second queue so it's dropped off-thread.
- **Ramp, don't jump.** A parameter read once per callback steps once per buffer. Smooth it per sample. The smoothing state lives in the callback's preallocated struct.

## No-alloc check

`assert_no_alloc` installs a global allocator that aborts if anything allocates or frees inside a guarded scope.

```rust
use assert_no_alloc::{AllocDisabler, assert_no_alloc};

#[cfg(debug_assertions)]
#[global_allocator]
static A: AllocDisabler = AllocDisabler;

fn audio_callback(buffer: &mut [f32]) {
    assert_no_alloc(|| {
        for sample in buffer.iter_mut() {
            *sample = process(*sample);
        }
    });
}
```

With default features the check compiles away in release builds. It only sees allocations. Locks, syscalls, and blocking calls still need review.

Test under load, not on an idle machine. Run the callback while another process saturates every core and the UI thread is busy, and watch the drop and underrun counters.

## Drop discipline

The audio thread is never where a `Vec`, `String`, `Box`, or last `Arc` dies.

- Preallocate in setup and pass `&mut` references into the callback. The owner lives on a non-realtime thread or outlives the stream.
- When the callback has to give up something heap-allocated (a replaced sample buffer, old coefficients), send it back over an SPSC queue and drop it on the other side.
- `basedrop::Shared<T>` packages that as a refcounted pointer whose deallocation is deferred to a collector run off-thread. Use it in place of `Arc<T>` when references are cloned and dropped in the callback.

## Stream setup with cpal

`cpal`'s data callback is the realtime thread. Everything above applies inside it.

- Request `BufferSize::Fixed` when latency matters, and read what was actually granted with `StreamTrait::buffer_size()`. Process `data.len()`. Never assume the slice has the length you asked for, and size scratch buffers for the largest block the host can deliver.
- Streams don't start on creation. Call `play()`.
- The error callback runs on a non-realtime thread. Log and trigger rebuilds there, not in the data callback.
- Realtime thread priority is opt-in on Linux through a crate feature. Without it, jitter is worse.

Stream construction changed in recent cpal releases (`StreamConfig` by value, explicit `play()`, a timeout argument, unified errors). Read the repo's `UPGRADING.md` before touching code written against an older version.

## Crate status

The audio corner of the ecosystem is thin. As of November 2026:

| Crate | Status |
| --- | --- |
| `rtrb`, `cpal`, `triple_buffer`, `ringbuf` | Actively released. Both ring buffer crates fixed a double free in 2026 that needs a panicking `Drop` to trigger. `Copy` elements and a current version avoid it. |
| `basedrop` | Slow but alive. Small and essentially finished. |
| `assert_no_alloc` | No release since 2021. Still the standard tool. Small enough to vendor if a compiler change breaks it. |
| `ringbuf-basedrop` | Dead since 2022. Don't add it. Use `rtrb` and send garbage back over a second queue. |
| `nih-plug` | Git-only plugin framework whose README says it's in maintenance mode. A risk for a new plugin project. Evaluate `clack` (CLAP bindings) alongside it. |

"Still the standard answer" isn't the same as "maintained." Re-check crates.io before adding any of these to a new project.
