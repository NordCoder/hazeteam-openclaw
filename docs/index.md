# Documentation index

## Current foundation scope

`hazeteam-openclaw` is an external OpenClaw/Telegram adapter foundation over stable `hazeteam-core`. The current foundation documents safe adapter contracts, fake-first composition, injected boundary shells, durable adapter-owned store shells, OpenClaw-facing integration shells, and the W9 secret-gated smoke posture.

This index is a navigation fan-in for the W10 release-hardening documents and W11 consistency cleanup state. It does not certify a production OpenClaw/Telegram product runtime.

## Release-hardening map

- [`docs/deployment/config-readiness-health-credentials.md`](deployment/config-readiness-health-credentials.md) — configuration assumptions, readiness semantics, health evidence, and credential-handling posture for the current foundation.
- [`docs/operations/migration-backup-replay.md`](operations/migration-backup-replay.md) — migration, backup, restore, replay, and recovery assumptions around injected durable stores and safe records.
- [`docs/release/release-checklist.md`](release/release-checklist.md) — pre-release checks, static and acceptance gates, security/no-leak review, and merge/release gates.
- [`docs/release/known-limitations.md`](release/known-limitations.md) — current limitations, boundary non-goals, future work, and risk notes that must remain visible until implemented by explicit future slices.
- [`docs/roadmap/implementation-waves.md`](roadmap/implementation-waves.md) — conflict-aware implementation roadmap, phase sequence, parallel leaf policy, and fan-in rules.

## Deployment and credential posture

Start with [`docs/deployment/config-readiness-health-credentials.md`](deployment/config-readiness-health-credentials.md) when reviewing how the adapter foundation treats configuration, readiness, health evidence, and credentials.

The current foundation uses injected ports, facades, safe DTOs, safe refs, and safe readiness/result summaries. It does not include a production credential loader, production OpenClaw SDK/client wiring, or a production HTTP health endpoint.

## Operations and recovery posture

Use [`docs/operations/migration-backup-replay.md`](operations/migration-backup-replay.md) for operator-facing assumptions about durable store records, migration safety, backup/restore consistency, replay expectations, and recovery failure modes.

The current foundation defines safe record shapes and validation expectations behind injected durable boundaries. It does not include a migration CLI, backup CLI, restore command, replay runtime, concrete storage engine, queue, scheduler, or recovery worker.

## Release checklist and limitations

Use [`docs/release/release-checklist.md`](release/release-checklist.md) before release review to confirm build/test/check posture, static and acceptance gates, no-leak requirements, and merge/release gates.

Use [`docs/release/known-limitations.md`](release/known-limitations.md) to keep unsupported production capabilities visible. Known limitations must not be removed from release-facing docs until current source, tests, and an explicit implementation slice prove the capability exists.

## Roadmap and future work

Use [`docs/roadmap/implementation-waves.md`](roadmap/implementation-waves.md) for sequencing, dependency, and fan-in policy.

The following are not included in the current foundation:

- production OpenClaw SDK/client wiring;
- production Telegram/OpenClaw network integration;
- production credential loading;
- production HTTP health/readiness endpoint;
- packaged migration, backup, restore, or replay tooling;
- replay runtime or real remote smoke execution;
- OCA, Codex, LifeOS, or other future product-layer implementations.

Future slices may add those capabilities only when explicitly scoped, implemented in production source, covered by tests, and kept outside `hazeteam-core` transport-neutral boundaries.
