# hazeteam-openclaw documentation

## Status

`hazeteam-openclaw` is an external adapter/product repository over `hazeteam-core`. It is not `hazeteam-core`, and OpenClaw, Telegram, OCA, and LifeOS behavior must not be treated as generic core semantics.

Current repository status: early foundation. Package, tooling, CI, source, and tests may still be absent or owned by a parallel S00A workspace slice. This documentation slice intentionally changes only `docs/**`.

## Documentation index

- [Core context digest](core-context.md) — local summary of the `hazeteam-core` boundary future workers must read before implementation.
- [Core boundary](architecture/core-boundary.md) — ownership split between `hazeteam-core`, `hazeteam-openclaw`, and the OpenClaw platform.
- [OpenClaw Telegram adapter architecture](architecture/openclaw-telegram-adapter.md) — target OpenClaw Telegram flow, topic model, callback model, and fake-first rule.
- [Testing strategy](architecture/testing-strategy.md) — static, contract, fake integration, fake E2E, no-leak, durable, and real-smoke layers.
- [Implementation waves](roadmap/implementation-waves.md) — planned phase sequence and parallelization constraints.
- ADRs:
  - [ADR 0001: OpenClaw Telegram reference adapter scope](adr/0001-openclaw-telegram-reference-adapter-scope.md)
  - [ADR 0002: Core public API only and fake-first](adr/0002-core-public-api-only-and-fake-first.md)
  - [ADR 0003: Telegram topic binding model](adr/0003-telegram-topic-binding-model.md)

## Relationship to `hazeteam-core` docs

The authoritative adapter/core contract lives in `NordCoder/hazeteam-core` on `main`, especially under `docs/adapter-authoring/**`, `docs/public-api-map.md`, `docs/adapter-readiness.md`, `docs/release/adapter-handoff.md`, and `docs/host/core-interaction-facade.md`.

This repository keeps a local digest in [core-context.md](core-context.md) so implementation workers can work from explicit, versioned repo-local context instead of hidden chat context. The digest is not a replacement for the core docs. When behavior is unclear, inspect `hazeteam-core` docs, public barrels, source, and tests as reference.

## Core import rule

Implementation in this repository must import `hazeteam-core` only through the package root or declared public subpaths. `hazeteam-core/src/**`, private `dist/**` implementation paths, and relative imports into a checked-out core repository are forbidden. If a needed symbol is not public, that is a core API gap, not permission to import private files.

## Repo role

This repository may own OpenClaw/Telegram adapter contracts, fakes, topic binding, event mapping, renderer, delivery, callbacks, runtime bridge, approval bridge, durable adapter stores, real OpenClaw wiring, deployment docs, and future product layers. It must not move OpenClaw or Telegram semantics into `hazeteam-core`.
