# hazeteam-openclaw documentation

## Status

`hazeteam-openclaw` is an external OpenClaw-native adapter and integration repository over `hazeteam-core`. It is not `hazeteam-core`, and OpenClaw, Telegram, OCA, Codex, and LifeOS behavior must not be treated as generic core semantics.

Active contract pack: `hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip`.

Current project priority: prepare the generic OpenClaw/Telegram adapter evidence for W18E3 final readiness classification. OCA, LifeOS, domain products, sidecar work, deployment runtime, production provider runtime, and product-layer behavior remain parked downstream overlays until the adapter gate is actually met.

Current repository status includes W12/W13/W14/W15 historical foundation work:

- W12 public-core integration proof wiring against pinned `hazeteam-core` public APIs and fake adapter edges.
- W13 OpenClaw plugin runtime shell package with safe lifecycle, tool registry, capability registry, and readiness helper surfaces.
- W14 OpenClaw/Telegram transport package with safe config and credential-reference descriptors, channel-event normalization, injected delivery, callback boundary, topic command routing, and opt-in real-smoke classification.
- W15 fake/inert OCA wrapper surfaces and descriptor-only LifeOS domain fixture surfaces.

Merged evidence now reflected in release-facing docs:

- W17H1-W17H6 fake/inert acceptance evidence: inbound fake E2E, outbound fake E2E, callback permission fake E2E, durable replay fake E2E, no-leak matrix, and package-root no-side-effect matrix.
- W18A runtime value boundary: secret handle, credential ref, resolved runtime-only value, public redacted descriptor, and no public secret values.
- W18B provider client port boundary: injected provider port, no default provider SDK/client construction, and provider acknowledgement separate from business success.
- W18D listener/webhook/polling boundary: interface/descriptors only, with no daemon, server, listener startup, webhook server, polling loop, or production runtime.
- W18F1 runtime-edge documentation: architecture vocabulary and limitations without a release classifier claim.
- W18C secret-gated smoke refinement: opt-in only, no default CI network, no default secrets, redacted/status-precise output, and skipped/blocked/ready-to-run states not counted as passes. A passed smoke requires a supplied redacted attempt with provider acknowledgement and business success; current smoke code still does not call a real provider by default.
- W18E1 release-gate static/CI closure: default test/check path remains no-network and secret-free, real smoke remains opt-in, and release docs are guarded against premature production-ready or adapter-ready claims.

This repository is not `adapter-ready-for-real-system-integration`, not `adapter-real-integration-ready`, and not production-ready. W18E3 remains the final classifier. Existing fake/inert OCA surfaces and descriptor-only LifeOS/domain surfaces are not adapter-readiness evidence. Skipped, blocked, or ready-to-run real smoke is not a successful real-provider pass.

No current docs should imply production readiness. There is still no production OpenClaw SDK/client wiring, Telegram listener/webhook/callback endpoint, polling daemon, production credential loader, production durable backend, sidecar support, deployment runtime, production provider runtime, real OCA client execution, or LifeOS/domain product behavior.

Further implementation must follow the CD11.2 contract pack and conflict-aware parallel roadmap: implementation leaves use assigned ownership, sibling branches stay isolated, and shared vocabulary/export/release-classifier surfaces are handled only by explicitly assigned slices.

## Documentation index

- [Documentation index](index.md) — CD11.2 adapter-first map for current status, package posture, merged evidence, and preserved limitations.
- [Current development state](roadmap/current-development-state.md) — current handoff for continuing from current `main`; identifies W12/W13/W14/W15 historical foundation, W17H/W18 evidence, parked overlays, and preserved limitations.
- [Adapter readiness](adapter-readiness.md) — readiness ladder, merged evidence categories, smoke status rules, and W18E3 classifier guardrails.
- [Runtime edge boundaries](architecture/runtime-edge-boundaries.md) — runtime value, provider client port, listener/webhook/polling, secret-gated smoke, no-leak, and parked-overlay vocabulary.
- [Release checklist](release/release-checklist.md) — release checks, static and acceptance gates, security/no-leak review, and release classification guardrails.
- [Known limitations](release/known-limitations.md) — unsupported production capabilities and future-work boundaries that must remain visible until implemented by explicit future slices.
- [W16A6 audit consolidation](roadmap/w16a6-audit-consolidation.md) — Wave 0 gap map and Wave 1 context.
- [`@hazeteam/openclaw-adapter` package README](../packages/openclaw-adapter/README.md) — safe adapter foundation surfaces and explicit non-production limits.
- [`@hazeteam/openclaw-testkit` package README](../packages/openclaw-testkit/README.md) — deterministic fake/testkit surfaces and fake-only limits.
- [`@hazeteam/openclaw-plugin-runtime` package README](../packages/openclaw-plugin-runtime/README.md) — W13 package-root public surface, fake/dry-run runtime-shell status, safety posture, and explicit limitations.
- [`@hazeteam/openclaw-telegram-transport` package README](../packages/openclaw-telegram-transport/README.md) — W14 package-root public surface, transport safety posture, real-smoke classification, and explicit limitations.
- [`@hazeteam/oca-wrapper` package README](../packages/oca-wrapper/README.md) — W15 fake/inert OCA overlay status, parked downstream classification, and explicit non-goals.
- [`domain-lifeos` package README](../packages/domain-lifeos/README.md) — descriptor-only LifeOS fixture status, parked downstream classification, and explicit non-goals.
- [W12 core integration development contract](development/core-integration.md) — pinned `hazeteam-core` ref, public export inventory, local packed-core install strategy, root integration script, cross-repo CI strategy, and static private-import boundary foundation.
- [Core context digest](core-context.md) — local summary of the `hazeteam-core` boundary future workers must read before implementation.
- [Core boundary](architecture/core-boundary.md) — ownership split between `hazeteam-core`, this repository, and the OpenClaw platform.
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
2. Required contract docs from `hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip`.
3. [W16A6 audit consolidation](roadmap/w16a6-audit-consolidation.md) when working on W16 or later adapter-readiness reset slices.
4. [Documentation index](index.md).
5. [Current development state](roadmap/current-development-state.md).
6. [Adapter readiness](adapter-readiness.md) and [runtime edge boundaries](architecture/runtime-edge-boundaries.md) for W18 release-closure and runtime-edge work.
7. Package README for the assigned package area.
8. [Core context digest](core-context.md).
9. [Adapter authoring guide](adapter-authoring/README.md).
10. [Core boundary](architecture/core-boundary.md).
11. [OpenClaw Telegram adapter architecture](architecture/openclaw-telegram-adapter.md).
12. [Adapter worker onboarding](architecture/adapter-worker-onboarding.md).
13. [Parallel execution and fan-in policy](architecture/parallel-execution-and-fanin.md).
14. [Implementation waves](roadmap/implementation-waves.md).
15. [File ownership matrix](roadmap/file-ownership-matrix.md).
16. Source and tests in the assigned allowed area.

## Relationship to `hazeteam-core` docs

The authoritative adapter/core contract lives in `NordCoder/hazeteam-core` on the assigned or pinned core ref, especially under `docs/adapter-authoring/**`, `docs/public-api-map.md`, `docs/adapter-readiness.md`, `docs/release/adapter-handoff.md`, and `docs/host/core-interaction-facade.md`.

This repository keeps a local digest in [core-context.md](core-context.md) so implementation workers can work from explicit, versioned repo-local context instead of hidden chat context. The digest is not a replacement for the current CD11.2 contract pack or core docs. When behavior is unclear, inspect the assigned contract docs and the relevant `hazeteam-core` docs, public barrels, source, and tests as reference.

The directly imported adapter authoring references needed by this repository are mirrored locally under `docs/adapter-authoring/`, plus the linked supporting docs under `docs/host/`, `docs/release/`, and `docs/testing/`.

## Core import rule

Implementation in this repository must import `hazeteam-core` only through the package root or declared public subpaths. Core source internals, core build output internals, relative imports into a checked-out core repository, copied core source, and core test code are not production adapter import targets.

If a required symbol is not publicly exported, treat it as a core API gap. Do not work around the gap with non-public imports.

## Repo role

This repository may own OpenClaw/Telegram adapter contracts, fakes, topic binding, event mapping, renderer, delivery, callbacks, runtime bridge, approval bridge, durable adapter stores, W13 plugin-runtime shell contracts, W14 transport config and safe port descriptors, future real OpenClaw wiring, deployment docs, and future product overlays. It must not move OpenClaw, Telegram, OCA, Codex, LifeOS, deployment, or credential semantics into `hazeteam-core`.
