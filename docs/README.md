# hazeteam-openclaw documentation

## Status

`hazeteam-openclaw` is an external OpenClaw-native adapter, plugin, and product integration repository over `hazeteam-core`. It is not `hazeteam-core`, and OpenClaw, Telegram, OCA, Codex, and LifeOS behavior must not be treated as generic core semantics.

Current repository status: the W10 release-hardened adapter foundation is present with W11 test/docs/status consistency cleanup, W12 core integration fan-in, and W13 OpenClaw plugin runtime shell fan-in applied. It includes safe adapter contracts, DTO boundaries, deterministic testkit fakes, topic binding, command and rendering surfaces, host/runtime/approval/delivery/callback shells, durable adapter store shells, OpenClaw integration shells, W9 secret-gated smoke posture, W10 release-hardening docs, W11 release-gate/static-boundary consistency updates, W12 script/CI wiring for pinned `hazeteam-core` public API integration tests with fake adapter edges, and the W13 plugin-runtime package root exposing safe lifecycle, tool registry, capability registry, and readiness surfaces.

W12 integration-proof status depends on installing `hazeteam-core` from a locally packed tarball built at the pinned ref and passing the W12 integration gate. W12 does not make the repository production runtime ready.

W13 plugin-runtime status is a safe, fake/dry-run-capable runtime shell. It adds package-root exports and no-effect public helpers for plugin lifecycle, tool registry descriptors, runtime capability registry descriptors, and readiness aggregation. W13 does not make the repository production provider/runtime ready.

No current docs should imply production readiness. There is still no real OpenClaw SDK wiring, Telegram listener/webhook/callback endpoint, OCA implementation, Codex/LifeOS product implementation, production credential loader, production durable backend, sidecar support, production HTTP readiness endpoint, or production runtime deployment.

Further implementation must follow the contract pack and conflict-aware parallel roadmap: implementation leaves use disjoint files, sibling branches stay isolated, and shared barrels/static/export snapshots are handled by explicit fan-in slices.

## Documentation index

- [Documentation index](index.md) — foundation, W12 integration, and W13 plugin-runtime shell map for deployment posture, operations, release gates, known limitations, and roadmap pointers.
- [Current development state](roadmap/current-development-state.md) — short W10/W11/W12/W13-oriented handoff for continuing from current `main`; identifies the completed foundation, consistency cleanup, W12 integration-proof baseline, W13 plugin-runtime shell fan-in, and preserved limitations.
- [`@hazeteam/openclaw-plugin-runtime` package README](../packages/openclaw-plugin-runtime/README.md) — W13 package-root public surface, fake/dry-run runtime-shell status, safety posture, and explicit limitations.
- [W12 core integration development contract](development/core-integration.md) — pinned `hazeteam-core` ref, public export inventory, local packed-core install strategy, root integration script, cross-repo CI strategy, and static private-import boundary foundation.
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

1. Assigned phase prompt and Hazeteam OpenClaw Workflow Manifest.
2. Required contract docs from `hazeteam-openclaw-contract-pack-cd10.zip`.
3. [Documentation index](index.md)
4. [Current development state](roadmap/current-development-state.md)
5. [W12 core integration development contract](development/core-integration.md) for W12 and later core-integration work
6. [`@hazeteam/openclaw-plugin-runtime` package README](../packages/openclaw-plugin-runtime/README.md) for W13 and later plugin-runtime work
7. [Core context digest](core-context.md)
8. [Adapter authoring guide](adapter-authoring/README.md)
9. [Core boundary](architecture/core-boundary.md)
10. [OpenClaw Telegram adapter architecture](architecture/openclaw-telegram-adapter.md)
11. [Adapter worker onboarding](architecture/adapter-worker-onboarding.md)
12. [Parallel execution and fan-in policy](architecture/parallel-execution-and-fanin.md)
13. [Implementation waves](roadmap/implementation-waves.md)
14. [File ownership matrix](roadmap/file-ownership-matrix.md)
15. Source and tests in the assigned allowed area.

## Relationship to `hazeteam-core` docs

The authoritative adapter/core contract lives in `NordCoder/hazeteam-core` on the assigned or pinned core ref, especially under `docs/adapter-authoring/**`, `docs/public-api-map.md`, `docs/adapter-readiness.md`, `docs/release/adapter-handoff.md`, and `docs/host/core-interaction-facade.md`.

This repository keeps a local digest in [core-context.md](core-context.md) so implementation workers can work from explicit, versioned repo-local context instead of hidden chat context. The digest is not a replacement for the current contract pack or core docs. When behavior is unclear, inspect the assigned contract docs and the relevant `hazeteam-core` docs, public barrels, source, and tests as reference.

The directly imported adapter authoring references needed by this repository are mirrored locally under `docs/adapter-authoring/`, plus the linked supporting docs under `docs/host/`, `docs/release/`, and `docs/testing/`.

## Core import rule

Implementation in this repository must import `hazeteam-core` only through the package root or declared public subpaths. Core source internals, core build output internals, relative imports into a checked-out core repository, copied core source, and core test code are not production adapter import targets.

If a required symbol is not publicly exported, treat it as a core API gap. Do not work around the gap with non-public imports.

## Repo role

This repository may own OpenClaw/Telegram adapter contracts, fakes, topic binding, event mapping, renderer, delivery, callbacks, runtime bridge, approval bridge, durable adapter stores, W13 plugin-runtime shell contracts, future real OpenClaw wiring, deployment docs, and future product layers. It must not move OpenClaw, Telegram, OCA, Codex, LifeOS, deployment, or credential semantics into `hazeteam-core`.
