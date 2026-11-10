# Stack
- **Frontend**: Vercel (Next.js, SSR, proxy)
- **Backend**: Railway (API servers, workers, long-running processes)
- **Data/Auth**: Supabase (Postgres, Auth, RLS, Realtime, Storage)

# Lane Rules
These lanes don't blur. Each service has one job.

Vercel is frontend only. Publishable key, RLS enforced, the secret key never touches it.

Railway is for backend compute: API servers, workers, long-running processes, anything heavy. The secret key lives here. It connects as the `service_role` role, so RLS is intentionally bypassed on Railway because Railway is the trusted backend. The secret key never goes near the client. For standalone Railway services outside the Next.js request cycle, the `backend-conventions` skill is the operational detail (health checks, graceful shutdown, deployment config, background jobs); for Rust services specifically, pair it with `rust-conventions`.

Supabase Auth is the auth layer, full stop. Use @supabase/ssr for cookie-based sessions. Don't roll custom JWTs when Supabase Auth already handles it.

RLS is the security layer, not a fallback. It's enforced via auth.uid(). Run EXPLAIN ANALYZE on complex policies.

Realtime is WAL-based, browser-to-Supabase direct. It's not for high-frequency writes and it doesn't guarantee exactly-once delivery.

Storage uses RLS-style policies per bucket. Large files upload directly from the client. Railway handles pre-processing if needed. Use presigned URLs for temporary access.

Edge Functions handle auth validation, webhooks, and DB trigger side effects. Nothing heavy. Deno runtime, 2s of CPU time per request.

Railway verifies Supabase JWTs via public key, against the project's JWKS. That needs asymmetric signing keys on the project.

The legacy `anon` and `service_role` API keys and `railway.json` / `railway.toml` are dead ends. Supabase drops the keys in late 2026. Railway stops reading the files on 2026-12-01. Config lives in `.railway/railway.ts`. If a project still has the old setup, migrate it. The `backend-conventions` skill has the steps.

# Platform Targets
iOS, iPadOS, macOS: target 27+ (current stable). The `apple-platform` skill tracks point releases and betas in `reference/platform-status.md`. Check it before bumping this pin. Current Swift and SwiftUI APIs only. No UIKit unless UIKit is the explicit context.

Android: current stable release. Kotlin and Jetpack Compose. No deprecated APIs unless there's genuinely no replacement.

Web: evergreen browsers. No IE, no legacy prefixes, no polyfills for anything with >95% baseline support.

If a modern API exists for something, use it. Don't default to older patterns for compatibility unless a specific minimum target actually requires it.

App Store compliance is non-negotiable. Before implementing any iOS, iPadOS, or macOS feature, verify it doesn't conflict with App Store Review Guidelines, privacy requirements (ATT, data collection disclosures), or platform entitlements. If a proposed approach would likely fail review, say so before building it.

# Default Visual Language

When no visual style is specified in the brief or design files, build to the platform's own design language. The goal is an app that looks like it was made by the platform owner.

**iOS / iPadOS / macOS**: Apple HIG. Liquid Glass on the navigation layer. SF Pro. System semantic colors. Native SwiftUI components. Tab bars, navigation stacks, sheets, and toolbars behave exactly as Apple defines them. A user should not be able to tell this wasn't shipped by Apple.

**Android**: Material 3 Expressive. Dynamic color from the user's wallpaper. Roboto Flex, bundled with the app (Material's own default is Roboto). M3 Expressive components (flexible navigation bar, navigation rail, flexible app bars, FAB menu, etc.). Bottom navigation, adaptive layouts, edge-to-edge. A user should not be able to tell this wasn't shipped by Google.

This default applies unless a style from the `visual-styles` skill is explicitly requested. Those styles are intentional overrides of native conventions -- they require a deliberate design decision, not a default. If no style is specified, native is correct.

# Writing Code
Get it right the first time. Don't write code you'd flag in an audit.

If you're not sure which pattern is current for the target platform, ask before writing anything. Don't guess. "This works but a better approach would be..." is not acceptable. Pick the right approach and use it.

Native and framework-native solutions come first. Third-party libraries are a last resort, not a default.

Don't pull from Stack Overflow answers, legacy docs, or tutorials that predate the current stable release. If multiple approaches exist, use the idiomatic current one. If a pattern only exists because it solved a problem that no longer exists (old browser targets, deprecated runtimes, pre-modern API gaps), don't use it.

Before building anything non-trivial, research the current recommended approach with web search. Training data is context, not a source of truth for current APIs or best practices.

When choosing between services, libraries, or implementation approaches, pick the fastest, most secure, and most stable option. Not the easiest or quickest to implement. If a chosen approach comes with significant complexity, cost, or implementation time, flag it before building.

# UI Architecture
No hardcoded values for color, spacing, type, radius, shadow, or motion. Everything references tokens or design system variables.

Web: CSS custom properties in a single :root block. No magic numbers inline.

SwiftUI: design tokens and semantic colors only. No hardcoded hex or CGFloat spacing values scattered through views.

Android: Material Design tokens or a defined theme. No hardcoded dp/sp/color values outside the theme layer.

Components are composable and self-contained. A component doesn't reach outside its own scope for layout or style context unless it's explicitly a layout component. Responsive behavior is defined at the token and component level, not patched per-screen with one-off overrides.

# Custom Views and Components
I build custom. Don't fall back to stock components because the custom path is harder.

In SwiftUI, if the native component is hard to customize, build a custom one. UIKit is not the answer. Default system appearances don't get used unless I've specifically asked for them.

# Animation and Motion
Motion is a design decision. Spring parameters, easing curves, and durations don't get filled in arbitrarily.

Every animation has a behavioral purpose. If it doesn't do anything meaningful, it doesn't belong.

No third-party animation libraries when native APIs cover it. CSS animations, Web Animations API, SwiftUI animation modifiers, Jetpack Compose animate* APIs. Use the platform. Exception: on web, GSAP is the documented standard for complex timeline choreography, scroll-driven experiences, and anything requiring multi-element coordination. Lenis for smooth scrolling. Three.js/WebGL for GPU-accelerated visual experiences. See the `motion-design` skill.

Timing functions are named tokens, not magic cubic-bezier values inline. Physics-based motion (spring, inertia) is preferred over generic ease curves for interactive elements.

Springs for interactive elements, ease curves for automated ones. When a user triggers the motion (tap, drag, swipe), use a spring -- it handles velocity continuity on interruption. When the system triggers the motion (loading, state change with no gesture), ease curves are appropriate. Never linear for UI transitions.

If motion behavior isn't specified, ask. Don't invent it.

# Design Fidelity
Designs come from Figma. My job is design, Claude's job is implementation.

If a layout, spacing, color, component structure, or animation behavior isn't specified, ask. Don't fill in the blanks with whatever looks reasonable. Don't introduce visual patterns or UI conventions that weren't in the original design. Don't substitute stock components for custom ones because they're close enough. They're not.

# Privacy
No analytics, telemetry, or tracking without explicit opt-in in the spec.

No third-party SDKs phoning home unless it's documented in the codebase. Collect the minimum data needed, nothing else. No PII in logs anywhere, including dev and debug paths. No fingerprinting or behavioral tracking unless it's explicitly required and documented.

# Audio Thread
The audio thread has one rule: don't break it.

No allocations. No locks, mutexes, or blocking calls. No Objective-C messaging. Cross-thread communication goes through lock-free ring buffers. Document buffer size assumptions in code comments.

Write audio thread code for worst-case scheduler jitter, not the happy path. Test under load.

# Rust
No unwrap() outside throwaway code. Propagate errors properly.

thiserror for library errors, anyhow for application-level error handling. Don't clone() your way out of borrow checker problems. Fix the ownership issue. Iterators over manual index loops. No unsafe without a safety comment explaining exactly which invariants are being upheld.

This is the floor. The `rust-conventions` skill is the operational detail (edition, toolchain, CI gates, async discipline, web stack, audio-thread crates, testing).

# Testing
Test critical paths and business logic. Skip trivial getters, setters, and pass-throughs.

Integration tests over unit tests for UI flows and API boundaries. Don't mock things just to hit coverage numbers. Mock external dependencies and I/O, that's it.

DSP functions need deterministic unit tests with known input/output pairs. Auth, RLS, and JWT verification paths need explicit test coverage.

# Commits
Conventional commit format: feat:, fix:, chore:, refactor:, docs:, test:, perf:

Subject line describes what changed and why. No mention of Claude, AI, or code generation tools. Keep subject lines under 72 characters. Use the body when context is needed.

# Skills

Everything platform-, tool-, or workflow-specific lives as an Agent Skill in `~/.claude/skills/` and loads automatically when it's relevant -- no manual routing needed. See `README.md` in this repo for the full inventory. If a skill isn't triggering when it should, that's a signal its `description` needs sharper trigger terms, not a reason to add a routing line back here.

One exception: skills only discover each other by what's already in context. When a task clearly spans skills up front (a Figma design system for an app that will ship on three platforms, a motion-heavy page that also needs the color library), name the ones you expect Claude to pull in in your prompt rather than assuming it'll chain to all of them unprompted.

# General
- Comments are for complex code only. Don't narrate the obvious.
- All CSS is custom. No Tailwind, no frameworks.
- No em dashes.
- One question at a time when something is ambiguous. Exception: design tool work (Figma) may require confirming up to three blocking questions before starting -- which platforms to target, whether an existing codebase exists, and which visual style to use. Ask all three upfront rather than discovering blockers mid-session.
- For tasks with independent parallel workstreams, propose a multi-agent breakdown before starting rather than executing sequentially.
- When discussing UI layouts, component structure, or visual hierarchy, illustrate it in the terminal using ASCII or Unicode drawing characters. Don't describe what something looks like when you can show it.
- Suggest /compact at logical task boundaries: after research is done and before implementation starts, after a milestone completes, after a debugging session ends. Never mid-implementation -- compacting while code is half-written loses variable names, file paths, and partial state that can't be easily reconstructed.
- MCP servers consume context. Each MCP tool description burns tokens from the context window. Keep active MCPs under 10 per session. If context feels compressed, check which MCPs are loaded and disable unused ones via disabledMcpServers in the project settings.
