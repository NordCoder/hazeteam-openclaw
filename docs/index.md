# Documentation index

## Current adapter-first scope

hazeteam-openclaw is an external OpenClaw/Telegram adapter repository over stable hazeteam-core.

The active contract pack is hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip. CD11.2 made the adapter-first priority explicit: complete the generic OpenClaw/Telegram adapter readiness evidence before advancing OCA, LifeOS, domain-product overlays, sidecar behavior, deployment runtime, production provider runtime, or production-real-system work.

After W18E3 final release closure, the generic OpenClaw/Telegram adapter classification is adapter-ready-for-real-system-integration under explicit gates. The classifier report is docs/release/w18e3-final-adapter-readiness-report.md.

This classification is not production-ready and does not implement production runtime, production deployment, production provider runtime, production credential loading, production durable backend, sidecar, OCA runtime, Codex runtime, LifeOS behavior, or domain/product behavior.

The current repository includes W12 public-core integration proof wiring, W13 plugin-runtime shell surfaces, W14 Telegram/OpenClaw transport safe port surfaces, and W15 fake/inert OCA plus descriptor-only LifeOS/domain overlay surfaces.

Merged release-facing evidence:

- W17H1-W17H6 fake/inert acceptance evidence for inbound fake E2E, outbound fake E2E, callback permission fake E2E, durable replay fake E2E, no-leak matrix, and package-root no-side-effect matrix. This evidence is not a real-provider pass.
- W18A runtime value boundary evidence for secret handles, credential refs, resolved runtime-only values, public redacted descriptors, and no public secret values.
- W18B provider client port evidence for injected provider ports, no default provider SDK/client construction, and provider acknowledgement separate from business success.
- W18D listener/webhook/polling boundary evidence as interface/descriptors only, not production daemon/server/listener/polling runtime.
- W18F1 runtime-edge documentation evidence without production classification.
- W18C secret-gated smoke refinement evidence: opt-in only, no default CI network, no default secrets, redacted and status-precise output, and skipped/blocked/ready-to-run states not counted as passes. A passed smoke requires a supplied redacted attempt with provider acknowledgement and business success; current smoke code still does not call a real provider by default.
- W18E1 release-gate static/CI closure evidence: default test/check path remains no-network and secret-free, real smoke remains opt-in, and release docs are guarded against premature production-ready and adapter-ready claims.
- W18E2 release docs closure evidence: release-facing docs reflect evidence and limitations.
- W18E3 final adapter readiness report: final evidence consolidation, classifier, and downstream unlock decision.

Existing OCA and LifeOS/domain files are parked downstream overlays and are not production-readiness evidence. Skipped, blocked, or ready-to-run real smoke is not a real-provider pass.

## Status and package map

- [README.md](../README.md) — root project status, active CD11.2 contract pack, current priority, package map, merged evidence, and preserved limitations.
- [docs/README.md](README.md) — documentation index, worker reading order, and repo role.
- [W18E3 final adapter readiness report](release/w18e3-final-adapter-readiness-report.md) — final W18 classifier, evidence table, checks table, real-smoke table, no-leak table, parked overlays, limitations, and downstream unlock decision.
- [docs/adapter-readiness.md](adapter-readiness.md) — readiness ladder, evidence categories, smoke status rules, and W18E3 final-classifier rule.
- [docs/architecture/runtime-edge-boundaries.md](architecture/runtime-edge-boundaries.md) — runtime value, provider port, listener/webhook/polling, secret-gated smoke, no-leak, and parked-overlay boundaries.
- [docs/roadmap/current-development-state.md](roadmap/current-development-state.md) — worker-facing current handoff for W16 and later adapter-readiness work.
- [docs/roadmap/w16a6-audit-consolidation.md](roadmap/w16a6-audit-consolidation.md) — Wave 0 audit consolidation and Wave 1 launch context.
- [packages/openclaw-adapter/README.md](../packages/openclaw-adapter/README.md) — safe adapter foundation package posture.
- [packages/openclaw-testkit/README.md](../packages/openclaw-testkit/README.md) — deterministic fake/testkit package posture.
- [packages/openclaw-plugin-runtime/README.md](../packages/openclaw-plugin-runtime/README.md) — W13 fake/dry-run-capable runtime shell posture.
- [packages/openclaw-telegram-transport/README.md](../packages/openclaw-telegram-transport/README.md) — W14 safe transport port posture and real-smoke classification.
- [packages/oca-wrapper/README.md](../packages/oca-wrapper/README.md) — W15 fake/inert OCA overlay posture and parked downstream status.
- [packages/domain-lifeos/README.md](../packages/domain-lifeos/README.md) — descriptor-only LifeOS/domain fixture posture and parked downstream status.

## Development context

- [docs/development/core-integration.md](development/core-integration.md) — W12 pinned core ref, public import policy, local packed-core install strategy, script/CI fan-in, and integration-proof status boundary.
- [docs/architecture/core-boundary.md](architecture/core-boundary.md) — ownership split between hazeteam-core, this repository, and the OpenClaw platform.
- [docs/architecture/openclaw-telegram-adapter.md](architecture/openclaw-telegram-adapter.md) — target OpenClaw Telegram flow, topic model, callback model, and fake-first rule.
- [docs/architecture/adapter-worker-onboarding.md](architecture/adapter-worker-onboarding.md) — worker-facing mental model for layers, current stage, fake-first progression, leaf slices, and fan-in slices.
- [docs/architecture/parallel-execution-and-fanin.md](architecture/parallel-execution-and-fanin.md) — conflict-free worker scheduling rules.
- [docs/architecture/testing-strategy.md](architecture/testing-strategy.md) — static, contract, fan-in snapshot, fake integration, fake E2E, no-leak, durable, and real-smoke layers.
- [docs/adapter-authoring/README.md](adapter-authoring/README.md) — imported core guidance for adapter package boundaries, flows, safety rules, blueprints, and certification checklists.

## Release-hardening map

Release classifier docs are intentionally linked here.

- [docs/release/w18e3-final-adapter-readiness-report.md](release/w18e3-final-adapter-readiness-report.md) — final W18 release-classifier report.
- [docs/deployment/config-readiness-health-credentials.md](deployment/config-readiness-health-credentials.md) — configuration assumptions, readiness semantics, health evidence, and credential-handling posture for the current foundation.
- [docs/operations/migration-backup-replay.md](operations/migration-backup-replay.md) — migration, backup, restore, replay, and recovery assumptions around injected durable stores and safe records.
- [docs/release/release-checklist.md](release/release-checklist.md) — release checks, static and acceptance gates, security/no-leak review, and merge/release gates.
- [docs/release/known-limitations.md](release/known-limitations.md) — unsupported production capabilities and future-work boundaries that must remain visible until implemented by explicit future slices.
- [docs/roadmap/implementation-waves.md](roadmap/implementation-waves.md) — implementation roadmap, phase sequence, parallel leaf policy, and fan-in rules.
- [docs/roadmap/file-ownership-matrix.md](roadmap/file-ownership-matrix.md) — file ownership and conflict-avoidance table.

## Current foundation posture

Use this status when orienting future workers:

- W12/W13/W14/W15 work is merged historical foundation, not production-ready certification.
- W17H1-W17H6 fake/inert acceptance evidence is merged and must be treated as fake/inert E2E, no-leak, and package-root inertness evidence, not real-provider evidence.
- W18A/W18B/W18D/W18F1 runtime-edge preparation evidence is merged and must be treated as boundary/docs evidence, not production runtime.
- W18C secret-gated smoke refinement is merged, but real smoke remains opt-in. Skipped, blocked, and ready-to-run smoke must be reported honestly and must not be counted as passes. Current smoke code still does not call a real provider by default.
- W18E1 release-gate static/CI closure is merged; default build/check/test paths remain no-secret and no-network by design.
- W18E2 release docs closure is merged.
- W18E3 final adapter readiness report is created and supplies adapter-ready-for-real-system-integration classification under explicit gates.
- OCA and LifeOS/domain packages are parked downstream overlays until explicit future scoped work.
- Fake/inert OCA and descriptor-only LifeOS surfaces must not be used as production-readiness evidence.

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

Future slices may add those capabilities only when explicitly scoped, implemented in production source, covered by tests, and kept outside hazeteam-core transport-neutral boundaries.
