# ADR 0002: Core public API only and fake-first

## Status

Accepted

## Context

Adapter implementation needs to understand `hazeteam-core` behavior while staying compatible with public core API. Private `src/**`, private built `dist/**` implementation paths, and test fixture paths are not adapter-facing API. At the same time, OpenClaw/Telegram real wiring introduces external state, credentials, transport behavior, provider errors, and runtime side effects.

## Decision

All production adapter imports from `hazeteam-core` must use public package root or declared public subpaths. Workers may read core source and tests as reference, but must not import them.

If a required symbol is missing from public core entrypoints, the adapter work must report a core API gap or limit scope. It must not bypass the gap with a private import.

Implementation is contracts-first and fake-first. Real OpenClaw/Telegram SDK/API wiring is allowed only after adapter-owned contracts, fakes, fake integration, fake E2E, and no-leak tests establish the intended semantics.

## Consequences

- Static boundary tests must forbid private core imports.
- Public import tests should pin required public core symbols.
- Early phases must define contracts and fakes before real runtime/transport integration.
- Real smokes are gated and not default CI.
- Core source/tests may inform behavior but never become adapter production dependencies.
- Missing public exports become small core API-gap slices, not adapter shortcuts.
