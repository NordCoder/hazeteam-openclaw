# hazeteam-openclaw documentation

## Status

`hazeteam-openclaw` is an external adapter/product repository over `hazeteam-core`. It is not `hazeteam-core`, and OpenClaw, Telegram, OCA, and LifeOS behavior must not be treated as generic core semantics.

Current repository status: workspace, docs foundation, adapter contracts, channel event contracts, delivery contracts, readiness/idempotency/permission contracts, Wave 3 testkit fakes, topic binding, and UI/command descriptor primitives are present.

Further implementation must follow the conflict-aware parallel roadmap: implementation leaves use disjoint files, and shared barrels/static/export snapshots are handled by fan-in slices.

## Documentation index

- [Core context digest](core-context.md) — local summary of the `hazeteam-core` boundary future workers must read before implementation.
- [Core boundary](architecture/core-boundary.md) — ownership split between `hazeteam-core`, `hazeteam-openclaw`, and the OpenClaw platform.
- [OpenClaw Telegram adapter architecture](architecture/openclaw-telegram-adapter.md) — target OpenClaw Telegram flow, topic model, callback model, and fake-first rule.
- [Adapter worker onboarding](architecture/adapter-worker-onboarding.md) — worker-facing mental model for layers, current stage, fake-first progression, leaf slices, and fan-in slices.
- [Adapter authoring guide](adapter-authoring/README.md) — imported core guidance for adapter package boundaries, flows, safety rules, blueprints, and certification checklists.
- [Testing strategy](architecture/testing-strategy.md) — static, contract, fan-in snapshot, fake integration, fake E2E, no-leak, durable, and real-smoke layers.
- [Parallel execution and fan-in policy](architecture/parallel-execution-and-fanin.md) — conflict-free worker scheduling rules.
- [Implementation waves](roadmap/implementation-waves.md) — phase sequence, dependency boundaries, parallel leaves, and fan-in slices.
- [File ownership matrix](roadmap/file-ownership-matrix.md) — default file ownership and conflict-avoidance table.
- ADRs:
  - [ADR 0001: OpenClaw Telegram reference adapter scope](adr/0001-openclaw-telegram-reference-adapter-scope.md)
  - [ADR 0002: Core public API only and fake-first](adr/0002-core-public-api-only-and-fake-first.md)
  - [ADR 0003: Telegram topic binding model](adr/0003-telegram-topic-binding-model.md)

## Reading order for workers

1. [Core context digest](core-context.md)
2. [Core boundary](architecture/core-boundary.md)
3. [OpenClaw Telegram adapter architecture](architecture/openclaw-telegram-adapter.md)
4. [Adapter worker onboarding](architecture/adapter-worker-onboarding.md)
5. [Parallel execution and fan-in policy](architecture/parallel-execution-and-fanin.md)
6. [Implementation waves](roadmap/implementation-waves.md)
7. [File ownership matrix](roadmap/file-ownership-matrix.md)
8. Source and tests in the assigned allowed area.

## Relationship to `hazeteam-core` docs

The authoritative adapter/core contract lives in `NordCoder/hazeteam-core` on `main`, especially under `docs/adapter-authoring/**`, `docs/public-api-map.md`, `docs/adapter-readiness.md`, `docs/release/adapter-handoff.md`, and `docs/host/core-interaction-facade.md`.

This repository keeps a local digest in [core-context.md](core-context.md) so implementation workers can work from explicit, versioned repo-local context instead of hidden chat context. The digest is not a replacement for the core docs. When behavior is unclear, inspect `hazeteam-core` docs, public barrels, source, and tests as reference.

The directly imported adapter authoring references needed by this repository are mirrored locally under `docs/adapter-authoring/`, plus the linked supporting docs under `docs/host/`, `docs/release/`, and `docs/testing/`.

## Core import rule

Implementation in this repository must import `hazeteam-core` only through the package root or declared public subpaths. Core source internals, core build output internals, relative imports into a checked-out core repository, and core test code are not production adapter import targets.

If a required symbol is not publicly exported, treat it as a core API gap. Do not work around the gap with non-public imports.

## Repo role

This repository may own OpenClaw/Telegram adapter contracts, fakes, topic binding, event mapping, renderer, delivery, callbacks, runtime bridge, approval bridge, durable adapter stores, real OpenClaw wiring, deployment docs, and future product layers. It must not move OpenClaw or Telegram semantics into `hazeteam-core`.
