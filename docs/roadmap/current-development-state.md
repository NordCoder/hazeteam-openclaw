# Current development state

This document is the short worker-facing handoff for continuing hazeteam-openclaw development from current main under CD11.2.

## Active priority

Active contract pack: hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip.

Current priority: continue only from the W19G Wave 5 documentation closure state. W18E3 classified the generic OpenClaw/Telegram adapter as adapter-ready-for-real-system-integration under explicit gates, and Wave 5 added public real-integration harness and runtime credential binding surfaces without changing that classification.

The current repository posture is adapter-ready-for-real-system-integration under explicit gates and not production-ready.

Real-system integration attempts remain explicit-gate-only. Default check and test paths remain no-network and no-secret. Real smoke remains separate, opt-in, and secret-gated.

This classification unlocks downstream overlay planning and implementation only as future scoped work. OCA, LifeOS, domain products, sidecar behavior, deployment runtime, production provider runtime, production credential loading, production durable backend, and product-layer behavior remain unimplemented until explicit future prompts assign them.

## Repository role

hazeteam-openclaw is the external OpenClaw-native adapter and integration repository over hazeteam-core.

hazeteam-core owns transport-neutral semantics and public adapter-facing facades. This repository owns OpenClaw/Telegram adapter reality: normalized external events, topic binding, rendering, delivery, callbacks, runtime and approval bridges, durable adapter state, future real OpenClaw wiring, deployment docs, and future product overlays.

The adapter must use hazeteam-core public APIs only. If a needed core symbol is not public, treat it as a core API gap. Do not copy core source or import private core paths.

## Required context before new implementation

Read in this order:

1. The assigned phase prompt and the Hazeteam OpenClaw Workflow Manifest.
2. hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip, especially the contract docs named by the phase prompt.
3. docs/release/w18e3-final-adapter-readiness-report.md for the final W18 classifier and downstream unlock boundaries.
4. docs/release/w19g-wave5-documentation-closure-report.md, when present, for the Wave 5 documentation closure summary.
5. docs/roadmap/w21a-durable-adapter-state-ownership-plan.md for durable adapter state planning context.
6. docs/index.md and docs/README.md.
7. docs/adapter-readiness.md, docs/architecture/runtime-edge-boundaries.md, docs/release/release-checklist.md, and docs/release/known-limitations.md for release-facing status, preserved limitations, and production non-claims.
8. docs/roadmap/w16a6-audit-consolidation.md for W16 and later adapter-readiness reset work.
9. The README for the assigned package area.
10. docs/architecture/openclaw-telegram-adapter.md.
11. docs/architecture/parallel-execution-and-fanin.md.
12. The assigned source and tests.

Repository docs are context. The contract pack and implementation manifest remain authoritative.

## Current merged historical foundation

The current repository includes W12/W13/W14/W15 foundation work. This is useful implementation history, not production-ready certification.

### W12 public-core integration proof

W12 added public-core integration proof wiring against pinned hazeteam-core public APIs with fake adapter edges and a separate integration gate.

W12 does not prove production runtime readiness, provider runtime readiness, real transport readiness, sidecar readiness, or production readiness.

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

Callback handling preserves permission-before-token-consume. Topic routing authority is channelRef + chatRef + threadRef, not topic title.

### W15 parked overlay surfaces

W15 added fake/inert OCA wrapper surfaces and a descriptor-only LifeOS domain fixture.

Those surfaces are parked downstream overlays. They may remain in the repository, but they must not be advanced by adapter-readiness workers unless a prompt explicitly assigns docs-only parked-status wording or a narrow compile/test safety fix. They must not be used as evidence that the generic OpenClaw/Telegram adapter is ready for production behavior.

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

### W18 runtime-edge and release-closure evidence

W18A/W18B/W18C/W18D/W18F1/W18E1/W18E2/W18E3 evidence is merged:

- W18A — runtime value boundary: secret handle, credential ref, resolved runtime-only value, public redacted descriptor, and no public secret values.
- W18B — provider client port boundary: injected provider port, no default provider SDK/client construction, and provider acknowledgement separate from business success.
- W18C — secret-gated smoke refinement: opt-in only, no default CI network, no default secrets, redacted/status-precise output, and skipped/blocked/ready-to-run states not counted as passes. A passed smoke requires a supplied redacted attempt with provider acknowledgement and business success for the narrow executed edge.
- W18D — listener/webhook/polling boundary: interface/descriptors only; no daemon, server, listener startup, webhook server, polling loop, or production runtime.
- W18F1 — runtime edge docs: runtime-edge vocabulary and limitations without a production claim.
- W18E1 — release-gate static/CI closure: default test/check path remains no-network and secret-free, real smoke remains opt-in, and release docs are guarded against premature production-ready and adapter-ready claims.
- W18E2 — release docs closure: release-facing docs reflect W17H/W18 evidence and preserved limitations.
- W18E3 — final adapter readiness report: final evidence table, checks table, real-smoke table, no-leak table, parked overlays, downstream unlock decision, remaining limitations, and adapter-ready-for-real-system-integration classifier under explicit gates.

These are boundary, static, fake, smoke-classification, and documentation evidence. They do not create production runtime behavior, default network behavior, production credential loading, or product-layer behavior.

### W19 Wave 5 real integration harness evidence

W19A/W19B/W19C/W19D/W19E/W19D3/W19F2 evidence is merged:

- W19A — real integration attempt contract is present in the Telegram integration harness. It models explicit operator acknowledgement, provider port availability, runtime credential status, network gate state, operation class, ready-to-attempt status, supplied redacted attempt evidence, provider acknowledgement, and business success. It states that ready-to-attempt is not pass and that provider acknowledgement alone does not imply business success.
- W19B — runtime credential binding port is present in the adapter runtime-values area. It binds runtime credentials only through an injected port, keeps runtime-only values internal, and provides redacted JSON-safe public projections.
- W19C — opt-in real smoke harness runner evidence is present as a smoke test. It exercises the gated harness through fakes and confirms skipped, blocked, ready-to-run, acknowledgement-only, passed, and failed-safe unsafe-output cases. This is not default real provider execution.
- W19D — Telegram integration harness public export is present. The Telegram package root exposes the integration-harness public surface and W19A symbols while keeping productionReady false, defaultNetworkBehavior none, runtimeClientConstructedByDefault false, listenerWebhookPollingRuntime false, effects none, and realSmokeDefault skipped-or-blocked.
- W19E — runtime credential binding public export is present. The runtime-values barrel exports both the W18A runtime-value boundary and the W19B runtime credential binding port.
- W19D3 — Telegram integration harness metadata fan-in is present. Package-root metadata and related unit assertions reflect the Wave 5 integration harness public surface and non-production descriptor fields.
- W19F2 — Wave 5 static public-surface regression guard is present under tests/static. It protects the Wave 5 package-root and runtime-values public-surface invariants, default script separation from real smoke, and runtime-overreach checks for the allowlisted Wave 5 source files. It is a static regression guard, not runtime validation and not a real-system pass.

Wave 5 does not change the repository classification beyond adapter-ready-for-real-system-integration under explicit gates. It makes the real integration attempt contract and runtime credential binding surfaces publicly reachable while preserving no default provider network calls, no default provider/client construction, no default secret loading, no production runtime claim, and no production readiness claim.

### W21 durable-state fake/inert fan-in evidence

W21B/W21C/W21D/W21E1/W21E2/W21F durable-state evidence is merged or staged through the W21F fan-in branch:

- W21B — durable-state contract types for safe, redacted, JSON-safe fake/inert durable adapter state vocabulary.
- W21C — fake/inert adapter state store port and explicit fake store constructor.
- W21D — fake/inert replay and idempotency state boundary preserving duplicate suppression, replay cursor planning, provider acknowledgement/business success separation, and permission-before-consume replay decisions.
- W21E1 and W21E2 — static no-leak guards for W21B and W21C public durable-state vocabulary.
- W21F — local durable-state barrel and package-root fan-in export for the already merged fake/inert durable-state boundaries.

W21F does not change the repository classification beyond adapter-ready-for-real-system-integration under explicit gates. It preserves the not production-ready posture and adds no production durable backend, no production storage readiness, no production durable backend behavior, no runtime/provider/network/secret/deployment behavior, no deployment/runtime/provider/OCA/LifeOS/sidecar readiness, and no real-provider success claim.

## Current classification guardrails

Current state after W19G documentation closure and W21 durable-state fake/inert fan-in:

- classification: adapter-ready-for-real-system-integration under explicit gates;
- not production-ready;
- real-system integration attempts require explicit operator acknowledgement, an open network gate, injected provider/runtime ports, safe operation class, safe refs, and supplied redacted attempt evidence before a pass can be claimed;
- ready-to-attempt is not pass;
- provider acknowledgement alone is not business success;
- default check/test path remains no-network and no-secret;
- test:real-smoke remains explicit, separate, opt-in, and secret-gated;
- W19F2 is a static public-surface regression guard only;
- W21 durable-state fan-in exposes fake/inert local durable-state boundaries only;
- no production deployment readiness claim;
- no production runtime readiness claim;
- no production provider runtime readiness claim;
- no production credential loading readiness claim;
- no production durable backend readiness claim;
- no production storage readiness claim;
- no sidecar readiness claim;
- no OCA runtime readiness claim;
- no LifeOS/domain product readiness claim;
- OCA, Codex, LifeOS/domain, sidecar, deployment runtime, production provider runtime, production credential loading, and production durable backend remain future scoped work;
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
- no production storage readiness;
- no production durable backend behavior;
- no runtime/provider/network/secret/deployment behavior;
- no deployment/runtime/provider/OCA/LifeOS/sidecar readiness;
- no real-provider success claim;
- no sidecar support;
- no real OCA client execution;
- no LifeOS or domain-product behavior.

These limitations must remain visible in docs, release notes, smoke summaries, and worker prompts until source, tests, and an explicit implementation slice prove otherwise.
