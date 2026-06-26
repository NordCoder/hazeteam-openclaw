# hazeteam-openclaw

hazeteam-openclaw is an external OpenClaw/Telegram adapter repository built over hazeteam-core.

hazeteam-core stays transport-neutral and domain-neutral. This repository owns the OpenClaw/Telegram adapter boundary: adapter contracts, normalized external events, testkit fakes, topic binding, command/UI descriptors, future event mapping, rendering, delivery, callbacks, runtime and approval bridges, durable adapter stores, future real OpenClaw wiring, and later product overlays.

## Current status

Active contract pack: hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip.

W18E3 final release closure classifies the generic OpenClaw/Telegram adapter as adapter-ready-for-real-system-integration under explicit gates. The final evidence report is docs/release/w18e3-final-adapter-readiness-report.md.

This is not production-ready. The repository does not claim production deployment readiness, production runtime readiness, production provider runtime readiness, production credential loading readiness, production durable backend readiness, sidecar readiness, OCA runtime readiness, or LifeOS/domain product readiness.

The current repository state includes the W12/W13/W14/W15 historical foundation:

- W12 public-core integration proof wiring against pinned hazeteam-core public APIs, using fake adapter edges and a separate integration gate.
- W13 OpenClaw plugin runtime shell surfaces for lifecycle, tool registry, capability registry, and readiness aggregation helpers.
- W14 OpenClaw/Telegram transport safe ports for config and credential references, channel-event normalization, injected delivery, callback boundary, topic command routing, and opt-in real-smoke classification.
- W15 fake/inert OCA wrapper surfaces and a descriptor-only LifeOS domain fixture.

Merged CD11.2 adapter-readiness evidence:

- W17H1-W17H6 fake/inert acceptance evidence is merged for inbound fake E2E, outbound fake E2E, callback permission fake E2E, durable replay fake E2E, no-leak matrix coverage, and package-root no-side-effect coverage. This is fake/inert evidence only, not a real-provider pass.
- W18A runtime value boundary evidence is merged for secret handles, credential refs, resolved runtime-only values, public redacted descriptors, and no public secret values.
- W18B provider client port boundary evidence is merged for injected provider ports, no default provider SDK/client construction, and separation between provider acknowledgement and business success.
- W18D listener/webhook/polling boundary evidence is merged as interface and descriptor boundaries only; it does not start a daemon, webhook server, listener, polling loop, or production runtime.
- W18F1 runtime-edge documentation is merged and keeps runtime-edge vocabulary separate from production claims.
- W18C secret-gated smoke refinement is merged as opt-in, redacted, and excluded from default CI. Skipped, blocked, and ready-to-run smoke states are not passes. A passed smoke requires a supplied redacted attempt with provider acknowledgement and business success for the narrow executed edge. The smoke code still does not call a real provider by default.
- W18E1 release-gate static/CI closure is merged. The default test/check path remains no-network and secret-free, real smoke remains opt-in, and release docs are guarded against premature production-ready or adapter-ready claims.
- W18E2 release docs closure is merged and preserves release-facing evidence and limitations.
- W18E3 final adapter readiness report supplies the final classifier and downstream unlock decision.

Existing fake/inert OCA surfaces and descriptor-only LifeOS/domain surfaces are parked downstream overlays. They must not be treated as evidence that production runtime support exists. Future downstream work may begin only under explicit future prompts and ownership.

Skipped, blocked, or ready-to-run real smoke is safe status evidence only. It is not a successful real-provider pass.

## Preserved limitations

The repository still does not ship:

- production OpenClaw SDK/client wiring;
- production Telegram/OpenClaw network integration;
- Telegram listener, webhook server, callback HTTP endpoint, polling loop, or daemon;
- production credential loader or secret manager integration;
- production provider runtime;
- sidecar support;
- deployment runtime;
- production durable backend;
- real OCA client execution;
- LifeOS or domain-product behavior.

Those capabilities require explicit future slices, source implementation, tests, and release-gate evidence.

## Mental model

~~~text
OpenClaw / Telegram / product runtime
-> hazeteam-openclaw safe adapter boundary
-> hazeteam-core public API
~~~

The adapter may understand OpenClaw/Telegram concepts, but core must receive only safe public inputs, refs, and envelopes. Raw provider/platform objects stay outside core and outside public adapter DTOs unless represented as bounded safe refs.

## Packages

- packages/openclaw-adapter — active TypeScript package for safe OpenClaw/Telegram adapter foundation surfaces.
- packages/openclaw-plugin-runtime — W13 fake/dry-run-capable OpenClaw plugin runtime shell surfaces.
- packages/openclaw-telegram-transport — W14 safe Telegram/OpenClaw transport port surfaces.
- packages/openclaw-testkit — deterministic adapter fakes and event/test helpers.
- packages/oca-wrapper — W15 fake/inert OCA runtime capability overlay, parked downstream until explicit future work.
- packages/domain-lifeos — descriptor-only LifeOS/domain fixture overlay, parked downstream until explicit future work.

## Documentation

Start here:

- docs/release/w18e3-final-adapter-readiness-report.md — final W18 classifier, evidence table, checks table, real-smoke table, no-leak table, parked overlays, limitations, and downstream unlock decision.
- docs/index.md — CD11.2 documentation map for adapter-first status, current package posture, merged W17H/W18 evidence, and preserved limitations.
- docs/README.md — documentation index and worker reading order.
- docs/roadmap/current-development-state.md — current handoff, completed historical foundation, merged evidence, parked overlays, and post-W18E3 classification gate status.
- docs/adapter-readiness.md — release-facing readiness ladder, evidence categories, smoke status rules, and W18E3 classifier rule.
- docs/architecture/runtime-edge-boundaries.md — runtime value, provider port, listener/webhook/polling, and smoke boundary vocabulary.
- docs/release/release-checklist.md — release checks, static and acceptance gates, security/no-leak review, and release classification guardrails.
- docs/release/known-limitations.md — unsupported production capabilities and future-work boundaries that must remain visible until implemented by explicit future slices.
- docs/roadmap/w16a6-audit-consolidation.md — Wave 0 audit consolidation and Wave 1 launch context.
- docs/adapter-authoring/README.md — imported core adapter-authoring guide for boundaries, flows, safety rules, blueprints, and certification checklists.
- docs/architecture/adapter-worker-onboarding.md — worker-facing project mental model and layer map.
- docs/architecture/core-boundary.md — boundary between hazeteam-core, this adapter, and OpenClaw platform concerns.
- docs/architecture/openclaw-telegram-adapter.md — target Telegram/OpenClaw adapter flow.
- docs/roadmap/implementation-waves.md — implementation waves, parallel leaves, and fan-in slices.

## Commands

~~~sh
npm run build
npm run test
npm run check
~~~
