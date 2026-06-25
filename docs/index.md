# Documentation index

## Current adapter-first scope

`hazeteam-openclaw` is an external OpenClaw/Telegram adapter repository over stable `hazeteam-core`.

The active contract pack is `hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip`. CD11.2 makes the current priority explicit: finish the generic OpenClaw/Telegram adapter until it is ready for real-system integration before advancing OCA, LifeOS, domain-product overlays, sidecar behavior, deployment runtime, production provider runtime, or real-system integration work.

The current repository includes W12 public-core integration proof wiring, W13 plugin-runtime shell surfaces, W14 Telegram/OpenClaw transport safe port surfaces, and W15 fake/inert OCA plus descriptor-only LifeOS/domain overlay surfaces.

This index does not certify adapter-ready-for-real-system-integration or production readiness. Existing OCA and LifeOS/domain files are parked downstream overlays and are not adapter-readiness evidence. Skipped or blocked real smoke is not a real-provider pass.

## Status and package map

- [`README.md`](../README.md) — root project status, active CD11.2 contract pack, current priority, package map, and preserved limitations.
- [`docs/README.md`](README.md) — documentation index, worker reading order, and repo role.
- [`docs/roadmap/current-development-state.md`](roadmap/current-development-state.md) — worker-facing current handoff for W16 and later adapter-readiness work.
- [`docs/roadmap/w16a6-audit-consolidation.md`](roadmap/w16a6-audit-consolidation.md) — Wave 0 audit consolidation and Wave 1 launch context.
- [`packages/openclaw-adapter/README.md`](../packages/openclaw-adapter/README.md) — safe adapter foundation package posture.
- [`packages/openclaw-testkit/README.md`](../packages/openclaw-testkit/README.md) — deterministic fake/testkit package posture.
- [`packages/openclaw-plugin-runtime/README.md`](../packages/openclaw-plugin-runtime/README.md) — W13 fake/dry-run-capable runtime shell posture.
- [`packages/openclaw-telegram-transport/README.md`](../packages/openclaw-telegram-transport/README.md) — W14 safe transport port posture and real-smoke classification.
- [`packages/oca-wrapper/README.md`](../packages/oca-wrapper/README.md) — W15 fake/inert OCA overlay posture and parked downstream status.
- [`packages/domain-lifeos/README.md`](../packages/domain-lifeos/README.md) — descriptor-only LifeOS/domain fixture posture and parked downstream status.

## Development context

- [`docs/development/core-integration.md`](development/core-integration.md) — W12 pinned core ref, public import policy, local packed-core install strategy, script/CI fan-in, and integration-proof status boundary.
- [`docs/architecture/core-boundary.md`](architecture/core-boundary.md) — ownership split between `hazeteam-core`, `hazeteam-openclaw`, and the OpenClaw platform.
- [`docs/architecture/openclaw-telegram-adapter.md`](architecture/openclaw-telegram-adapter.md) — target OpenClaw Telegram flow, topic model, callback model, and fake-first rule.
- [`docs/architecture/adapter-worker-onboarding.md`](architecture/adapter-worker-onboarding.md) — worker-facing mental model for layers, current stage, fake-first progression, leaf slices, and fan-in slices.
- [`docs/architecture/parallel-execution-and-fanin.md`](architecture/parallel-execution-and-fanin.md) — conflict-free worker scheduling rules.
- [`docs/architecture/testing-strategy.md`](architecture/testing-strategy.md) — static, contract, fan-in snapshot, fake integration, fake E2E, no-leak, durable, and real-smoke layers.
- [`docs/adapter-authoring/README.md`](adapter-authoring/README.md) — imported core guidance for adapter package boundaries, flows, safety rules, blueprints, and certification checklists.

## Release-hardening map

Release classifier docs are intentionally linked here but not modified by W16B. W16D owns readiness ladder and release classifier wording.

- [`docs/deployment/config-readiness-health-credentials.md`](deployment/config-readiness-health-credentials.md) — configuration assumptions, readiness semantics, health evidence, and credential-handling posture for the current foundation.
- [`docs/operations/migration-backup-replay.md`](operations/migration-backup-replay.md) — migration, backup, restore, replay, and recovery assumptions around injected durable stores and safe records.
- [`docs/release/release-checklist.md`](release/release-checklist.md) — release checks, static and acceptance gates, security/no-leak review, and merge/release gates.
- [`docs/release/known-limitations.md`](release/known-limitations.md) — unsupported production capabilities and future-work boundaries that must remain visible until implemented by explicit future slices.
- [`docs/roadmap/implementation-waves.md`](roadmap/implementation-waves.md) — implementation roadmap, phase sequence, parallel leaf policy, and fan-in rules.
- [`docs/roadmap/file-ownership-matrix.md`](roadmap/file-ownership-matrix.md) — file ownership and conflict-avoidance table.

## Current foundation posture

Use this status when orienting future workers:

- W12/W13/W14/W15 work is merged historical foundation, not adapter-ready or production-ready certification.
- Default build/check/test paths are no-secret and no-network by design.
- Real smoke remains opt-in and status-classified. Skipped or blocked smoke must be reported honestly and must not be counted as a pass.
- OCA and LifeOS/domain packages are parked downstream overlays until adapter-ready-for-real-system-integration.
- Fake/inert OCA and descriptor-only LifeOS surfaces must not be used as adapter-readiness evidence.

## Preserved limitations

The current repository does not include:

- production OpenClaw SDK/client wiring;
- production Telegram/OpenClaw network integration;
- Telegram listener, webhook server, callback HTTP endpoint, polling loop, or daemon;
- production credential loader;
- production provider runtime;
- sidecar support;
- deployment runtime;
- production durable backend;
- real OCA client execution;
- LifeOS or domain-product behavior.

Future slices may add those capabilities only when explicitly scoped, implemented in production source, covered by tests, and kept outside `hazeteam-core` transport-neutral boundaries.
