# Current development state

This document is the short worker-facing handoff for continuing `hazeteam-openclaw` development from current `main` under CD11.2.

## Active priority

Active contract pack: `hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip`.

Current priority: finish the generic OpenClaw/Telegram adapter until it is ready for real-system integration.

OCA, LifeOS, domain products, sidecar behavior, deployment runtime, production provider runtime, and product-layer behavior are parked downstream overlays until the adapter-ready-for-real-system-integration gate is actually met.

## Repository role

`hazeteam-openclaw` is the external OpenClaw-native adapter and integration repository over `hazeteam-core`.

`hazeteam-core` owns transport-neutral semantics and public adapter-facing facades. This repository owns OpenClaw/Telegram adapter reality: normalized external events, topic binding, rendering, delivery, callbacks, runtime and approval bridges, durable adapter state, future real OpenClaw wiring, deployment docs, and future product overlays.

The adapter must use `hazeteam-core` public APIs only. If a needed core symbol is not public, treat it as a core API gap. Do not copy core source or import private core paths.

## Required context before new implementation

Read in this order:

1. The assigned phase prompt and the Hazeteam OpenClaw Workflow Manifest.
2. `hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip`, especially the contract docs named by the phase prompt.
3. `docs/roadmap/w16a6-audit-consolidation.md` for W16 and later adapter-readiness reset work.
4. `docs/index.md` and `docs/README.md`.
5. The README for the assigned package area.
6. `docs/architecture/openclaw-telegram-adapter.md`.
7. `docs/architecture/parallel-execution-and-fanin.md`.
8. The assigned source and tests.

Repository docs are context. The contract pack and implementation manifest remain authoritative.

## Current merged historical foundation

The current repository includes W12/W13/W14/W15 foundation work. This is useful implementation history, not an adapter-ready or production-ready claim.

### W12 public-core integration proof

W12 added public-core integration proof wiring against pinned `hazeteam-core` public APIs with fake adapter edges and a separate integration gate.

W12 does not prove production runtime readiness, provider runtime readiness, real transport readiness, sidecar readiness, or real-system integration readiness.

### W13 OpenClaw plugin runtime shell

W13 added fake/dry-run-capable plugin runtime shell surfaces for lifecycle, tool registry, capability registry, and readiness helper projections.

W13 does not implement production OpenClaw runtime execution, provider SDK/client wiring, credentials, network behavior, sidecar behavior, deployment runtime, or production readiness endpoints.

### W14 OpenClaw/Telegram transport safe ports

W14 added safe transport ports and injected boundaries for:

- transport config and redacted credential-reference descriptors;
- safe channel-event normalization;
- injected delivery port results;
- callback normalization, permission, token verify, and token consume boundary;
- topic command routing;
- opt-in real-smoke classification.

The package remains non-production-ready. Default build, check, and test flows require no real credentials and perform no real network calls. Real smoke is opt-in and secret-gated. A missing credential, missing profile, closed network gate, missing injected port, or skipped gate is blocked or skipped by design, not a passing real-provider smoke result.

Provider acknowledgement is not business success. Delivery, callback, and smoke summaries keep provider acknowledgement distinct from business completion.

Callback handling preserves permission-before-token-consume. Topic routing authority is `channelRef+chatRef+threadRef`, not topic title.

### W15 parked overlay surfaces

W15 added fake/inert OCA wrapper surfaces and a descriptor-only LifeOS domain fixture.

Those surfaces are parked downstream overlays. They may remain in the repository, but they must not be advanced by adapter-readiness workers unless a prompt explicitly assigns docs-only parked-status wording or a narrow compile/test safety fix. They must not be used as evidence that the generic OpenClaw/Telegram adapter is ready for real-system integration.

## Current classification

Current state:

- not adapter-ready-for-real-system-integration;
- not production-ready;
- adapter-first CD11.2 reset is active;
- OCA and LifeOS/domain overlays are parked;
- skipped or blocked real smoke is not a pass;
- fake/inert OCA and descriptor-only LifeOS/domain surfaces are not adapter-readiness evidence.

## Preserved limitations

Until explicit future slices implement and test them, the repository still has:

- no production OpenClaw SDK/client wiring;
- no production Telegram/OpenClaw provider runtime;
- no Telegram listener, webhook server, callback HTTP endpoint, polling loop, or daemon;
- no production credential loader;
- no production deployment runtime;
- no production durable backend;
- no sidecar support;
- no real OCA client execution;
- no LifeOS or domain-product behavior.

These limitations must remain visible in docs, release notes, smoke summaries, and worker prompts until source, tests, and an explicit implementation slice prove otherwise.
