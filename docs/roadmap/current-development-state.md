# Current development state

This document is the short worker-facing handoff for continuing `hazeteam-openclaw` development from current `main` under CD11.2.

## Active priority

Active contract pack: `hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip`.

Current priority: prepare the generic OpenClaw/Telegram adapter evidence for W18E3 final readiness classification.

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
5. `docs/adapter-readiness.md`, `docs/architecture/runtime-edge-boundaries.md`, `docs/release/release-checklist.md`, and `docs/release/known-limitations.md` for W18 release-closure or runtime-edge work.
6. The README for the assigned package area.
7. `docs/architecture/openclaw-telegram-adapter.md`.
8. `docs/architecture/parallel-execution-and-fanin.md`.
9. The assigned source and tests.

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

The package remains non-production-ready. Default build, check, and test flows require no real credentials and perform no real network calls. Real smoke is opt-in and secret-gated. A missing credential, missing profile, closed network gate, missing injected port, skipped state, blocked state, or ready-to-run state is not a passing real-provider smoke result.

Provider acknowledgement is not business success. Delivery, callback, and smoke summaries keep provider acknowledgement distinct from business completion.

Callback handling preserves permission-before-token-consume. Topic routing authority is `channelRef+chatRef+threadRef`, not topic title.

### W15 parked overlay surfaces

W15 added fake/inert OCA wrapper surfaces and a descriptor-only LifeOS domain fixture.

Those surfaces are parked downstream overlays. They may remain in the repository, but they must not be advanced by adapter-readiness workers unless a prompt explicitly assigns docs-only parked-status wording or a narrow compile/test safety fix. They must not be used as evidence that the generic OpenClaw/Telegram adapter is ready for real-system integration.

## Current merged CD11.2 adapter evidence

### W17H fake/inert acceptance evidence

W17H1-W17H6 acceptance evidence is merged:

- W17H1 — inbound fake E2E.
- W17H2 — outbound fake E2E.
- W17H3 — callback permission fake E2E.
- W17H4 — durable replay fake E2E.
- W17H5 — no-leak matrix.
- W17H6 — package-root no-side-effect matrix.

This is fake/inert evidence only. It proves deterministic safe paths, no-leak behavior, replay/idempotency behavior, and package-root inertness without secrets or network. It does not prove a real-provider pass, production provider runtime, production listener/webhook/polling runtime, production durable backend, deployment runtime, OCA execution, LifeOS behavior, or production readiness.

### W18 Wave 3 runtime-edge preparation evidence

W18A/W18B/W18D/W18F1 evidence is merged:

- W18A — runtime value boundary: secret handle, credential ref, resolved runtime-only value, public redacted descriptor, and no public secret values.
- W18B — provider client port boundary: injected provider port, no default provider SDK/client construction, and provider acknowledgement separate from business success.
- W18D — listener/webhook/polling boundary: interface/descriptors only; no daemon, server, listener startup, webhook server, polling loop, or production runtime.
- W18F1 — runtime edge docs: runtime-edge vocabulary and limitations without a release classifier claim.

These are boundary and documentation evidence. They do not create production runtime behavior, default network behavior, production credential loading, or product-layer behavior.

### W18 Wave 4 release-closure evidence

W18C and W18E1 evidence is merged:

- W18C — secret-gated smoke refinement: opt-in only, no default CI network, no default secrets, redacted/status-precise output, and skipped/blocked/ready-to-run states not counted as passes. A passed smoke requires a supplied redacted attempt with provider acknowledgement and business success for the narrow executed edge. Current W18C smoke code still does not call a real provider by default.
- W18E1 — release-gate static/CI closure: default test/check path remains no-network and secret-free, real smoke remains opt-in, and release docs are guarded against premature production-ready and adapter-ready claims.

W18E2 documents these facts. W18E3 remains the final classifier and must consolidate evidence before any final adapter readiness claim.

## Current classification guardrails

Current state:

- not `adapter-ready-for-real-system-integration`;
- not `adapter-real-integration-ready`;
- not `production-ready`;
- W18E3 remains the final classifier;
- OCA and LifeOS/domain overlays are parked;
- skipped, blocked, or ready-to-run real smoke is not a pass;
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
