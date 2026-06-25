# Documentation index

## Current foundation scope

`hazeteam-openclaw` is an external OpenClaw/Telegram adapter and plugin foundation over stable `hazeteam-core`. The current foundation documents safe adapter contracts, fake-first composition, injected boundary shells, durable adapter-owned store shells, OpenClaw-facing integration shells, the W9 secret-gated smoke posture, W12 integration proof wiring against pinned `hazeteam-core` public APIs with fake adapter edges, the W13 OpenClaw plugin runtime shell package, and the W14A OpenClaw/Telegram transport config and credential-reference boundary package.

This index is a navigation fan-in for the W10 release-hardening documents, W11 consistency cleanup state, W12 core integration status, W13 plugin runtime shell status, and W14A transport config boundary status. It does not certify a production OpenClaw, Telegram, OCA, or product runtime.

## Release-hardening map

- [`packages/openclaw-plugin-runtime/README.md`](../packages/openclaw-plugin-runtime/README.md) — W13 package-root public surface, fake/dry-run runtime-shell status, safety posture, and explicit limitations.
- [`packages/openclaw-telegram-transport/README.md`](../packages/openclaw-telegram-transport/README.md) — W14A package-root public surface for side-effect-free transport config parsing, redacted credential descriptors, opaque credential handles, safety posture, and explicit limitations.
- [`docs/development/core-integration.md`](development/core-integration.md) — W12 pinned core ref, public import policy, local packed-core install strategy, script/CI fan-in, and integration-proof status boundary.
- [`docs/deployment/config-readiness-health-credentials.md`](deployment/config-readiness-health-credentials.md) — configuration assumptions, readiness semantics, health evidence, and credential-handling posture for the current foundation.
- [`docs/operations/migration-backup-replay.md`](operations/migration-backup-replay.md) — migration, backup, restore, replay, and recovery assumptions around injected durable stores and safe records.
- [`docs/release/release-checklist.md`](release/release-checklist.md) — pre-release checks, static and acceptance gates, W12 core integration release gate, security/no-leak review, and merge/release gates.
- [`docs/release/known-limitations.md`](release/known-limitations.md) — current limitations, W12 fake-edge integration-proof boundary, W13 plugin-runtime shell boundary, W14A config-only transport boundary, future work, and risk notes that must remain visible until implemented by explicit future slices.
- [`docs/roadmap/implementation-waves.md`](roadmap/implementation-waves.md) — conflict-aware implementation roadmap, phase sequence, parallel leaf policy, and fan-in rules.

## W13 plugin-runtime shell posture

Use [`packages/openclaw-plugin-runtime/README.md`](../packages/openclaw-plugin-runtime/README.md) before W13 or later plugin-runtime work. W13A introduced the package skeleton. W13B through W13E added no-effect lifecycle, tool registry, capability registry, and readiness modules. W13F fans those leaves into the package root and adds cross-leaf smoke coverage.

The W13 package is a safe, fake/dry-run-capable runtime shell. It does not include real provider wiring, runtime execution, credentials, transport delivery, OCA mechanics, sidecar behavior, deployment runtime, or a production readiness endpoint.

## W14A transport config boundary posture

Use [`packages/openclaw-telegram-transport/README.md`](../packages/openclaw-telegram-transport/README.md) before W14 or later transport work. W14A introduces the transport package only as a side-effect-free configuration and credential-reference boundary for later real Telegram/OpenClaw transport leaves.

The W14A package parses caller-provided unknown input into safe JSON-serializable config/readiness descriptors, models redacted credential refs for Telegram/OpenClaw credentials, and exposes opaque runtime-only credential handles. It does not load credential values, instantiate provider clients, import provider SDKs, call remote systems, listen for updates, register webhooks, poll providers, deliver messages, acknowledge callbacks, route commands, or run real smoke behavior.

## Deployment and credential posture

Start with [`docs/deployment/config-readiness-health-credentials.md`](deployment/config-readiness-health-credentials.md) when reviewing how the adapter foundation treats configuration, readiness, health evidence, and credentials.

The current foundation uses injected ports, facades, safe DTOs, safe refs, and safe readiness/result summaries. It does not include a production credential loader, production OpenClaw SDK/client wiring, or a production HTTP health endpoint.

## W12 core integration posture

Use [`docs/development/core-integration.md`](development/core-integration.md) before W12 or later core-integration work. W12 integration-proof status depends on installing a locally packed `hazeteam-core` tarball from the pinned ref and passing the W12 script/CI gate. It is not a real transport, sidecar, credential, durable backend, or production runtime certification.

## Operations and recovery posture

Use [`docs/operations/migration-backup-replay.md`](operations/migration-backup-replay.md) for operator-facing assumptions about durable store records, migration safety, backup/restore consistency, replay expectations, and recovery failure modes.

The current foundation defines safe record shapes and validation expectations behind injected durable boundaries. It does not include a migration CLI, backup CLI, restore command, replay runtime, concrete storage engine, queue, scheduler, or recovery worker.

## Release checklist and limitations

Use [`docs/release/release-checklist.md`](release/release-checklist.md) before release review to confirm build/test/check posture, static and acceptance gates, W12 core integration proof gate, no-leak requirements, and merge/release gates.

Use [`docs/release/known-limitations.md`](release/known-limitations.md) to keep unsupported production capabilities visible. Known limitations must not be removed from release-facing docs until current source, tests, and an explicit implementation slice prove the capability exists.

## Roadmap and future work

Use [`docs/roadmap/implementation-waves.md`](roadmap/implementation-waves.md) for sequencing, dependency, and fan-in policy.

The following are not included in the current foundation, W12 integration proof, W13 plugin-runtime shell, or W14A transport config boundary:

- production OpenClaw SDK/client wiring;
- production Telegram/OpenClaw network integration;
- production credential loading;
- production HTTP health/readiness endpoint;
- packaged migration, backup, restore, or replay tooling;
- replay runtime or real remote smoke execution;
- sidecar support;
- OCA, Codex, LifeOS, or other future product-layer implementations.

Future slices may add those capabilities only when explicitly scoped, implemented in production source, covered by tests, and kept outside `hazeteam-core` transport-neutral boundaries.
