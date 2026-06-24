# hazeteam-openclaw

`hazeteam-openclaw` is an external OpenClaw/Telegram adapter and product repository built over `hazeteam-core`.

`hazeteam-core` stays transport-neutral and domain-neutral. This repository owns the OpenClaw/Telegram adapter boundary: adapter contracts, normalized events, testkit fakes, topic binding, command/UI descriptors, future event mapping, rendering, delivery, callbacks, runtime and approval bridges, durable adapter stores, future real OpenClaw wiring, and later product layers.

Current status: the W10 release-hardened adapter foundation is present: safe contracts, testkit fakes, topic binding, command and rendering surfaces, host/runtime/approval/delivery/callback shells, durable store shells, OpenClaw integration shells, W9 smoke posture, and W10 docs fan-in. It remains a foundation, not a production OpenClaw/Telegram product runtime.

There is no real OpenClaw SDK wiring, Telegram listener/webhook/callback endpoint, OCA implementation, or LifeOS product implementation yet.

## Mental model

```text
OpenClaw / Telegram / product runtime
-> hazeteam-openclaw safe adapter boundary
-> hazeteam-core public API
```

The adapter may understand OpenClaw/Telegram concepts, but core must receive only safe public inputs, refs, and envelopes. Raw provider/platform objects stay outside core and outside public adapter DTOs unless represented as bounded safe refs.

## Packages

- `packages/openclaw-adapter` — active TypeScript package for OpenClaw/Telegram adapter contracts and future adapter implementation.
- `packages/openclaw-testkit` — active TypeScript package for deterministic adapter fakes, event factories, and future certification utilities.
- `packages/domain-lifeos` — README-only placeholder.
- `packages/oca-wrapper` — README-only placeholder.

## Documentation

Start here:

- [`docs/index.md`](docs/index.md) — W10 documentation map for deployment posture, operations, release gates, known limitations, and roadmap pointers.
- [`docs/README.md`](docs/README.md) — documentation index and worker reading order.
- [`docs/roadmap/current-development-state.md`](docs/roadmap/current-development-state.md) — current handoff, completed foundations, and next development gate.
- [`docs/adapter-authoring/README.md`](docs/adapter-authoring/README.md) — imported core adapter-authoring guide for boundaries, flows, safety rules, blueprints, and certification checklists.
- [`docs/architecture/adapter-worker-onboarding.md`](docs/architecture/adapter-worker-onboarding.md) — worker-facing project mental model and layer map.
- [`docs/architecture/core-boundary.md`](docs/architecture/core-boundary.md) — boundary between `hazeteam-core`, this adapter, and OpenClaw platform concerns.
- [`docs/architecture/openclaw-telegram-adapter.md`](docs/architecture/openclaw-telegram-adapter.md) — target Telegram/OpenClaw adapter flow.
- [`docs/roadmap/implementation-waves.md`](docs/roadmap/implementation-waves.md) — implementation waves, parallel leaves, and fan-in slices.

Release-hardening docs:

- [`docs/deployment/config-readiness-health-credentials.md`](docs/deployment/config-readiness-health-credentials.md) — configuration, readiness, health, and credential posture.
- [`docs/operations/migration-backup-replay.md`](docs/operations/migration-backup-replay.md) — migration, backup, restore, replay, and recovery assumptions.
- [`docs/release/release-checklist.md`](docs/release/release-checklist.md) — release checks, gates, and no-leak review posture.
- [`docs/release/known-limitations.md`](docs/release/known-limitations.md) — unsupported production capabilities and future-work boundaries.

The current adapter is a foundation with safe boundaries and W9 smoke behavior that remains dry-run or blocked by design.

## Commands

```sh
npm run build
npm run test
npm run check
```
