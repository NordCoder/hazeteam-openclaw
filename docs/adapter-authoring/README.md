# Adapter Authoring Guide

## Purpose

This guide is the adapter-authoring entrypoint for teams building external adapter packages, runtime bridges, durable store packages, product packages, and other extensions around `hazeteam-core`.

`hazeteam-core` is a transport-neutral and domain-neutral core package. It provides public contracts, validation, state transitions, safe envelopes, and deterministic adapter-facing facades. It does not open external network connections, own provider SDKs, run production daemons, hold transport secrets, or implement product-specific behavior.

External adapter packages translate external events into public core calls and translate safe core outputs back into external delivery operations.

```text
external system event
-> adapter-owned normalized event
-> public hazeteam-core facade call
-> public core envelope / presentation outbox item / token result
-> adapter-owned external delivery, callback, runtime, and storage handling
```

Use this guide before implementing a transport adapter, OpenClaw bridge, Telegram adapter, durable store package, product/domain package, UI renderer, permission adapter, observability integration, or deployment lifecycle plugin.

## Required reading order

Read these documents in order when starting a new adapter package:

1. [Core Boundary and Ownership](core-boundary-and-ownership.md)
2. [Public API and Import Rules](public-api-and-import-rules.md)
3. [Core Interaction Facade Guide](core-interaction-facade-guide.md)

Then read the existing core reference documents:

- [Adapter Readiness](../adapter-readiness.md)
- [Adapter Handoff Package](../release/adapter-handoff.md)
- [Public API Map](../public-api-map.md)
- [Core Interaction Facade](../host/core-interaction-facade.md)
- [Core Interaction Port Injection](../host/core-interaction-port-injection.md)
- [Generic External Adapter Simulator](../testing/generic-external-adapter-simulator.md)

## What this guide covers

This documentation package is intentionally layered.

### Foundation

Foundation docs define the stable rules every adapter must follow:

- ownership boundaries between core and external packages;
- allowed public imports and forbidden private imports;
- how to create and use the composed core interaction facade;
- what ports an adapter must inject;
- how to treat public envelopes and safe serialization.

### Adapter flows

Later phases of this guide define canonical adapter flows:

- external session binding;
- inbound event mapping;
- presentation outbox delivery;
- action-token callbacks;
- runtime, workflow, and approval bridging;
- durable stores;
- readiness, health, and observability;
- security and redaction;
- testing and certification.

### Reference blueprints

Later phases also include reference blueprints for OpenClaw and OpenClaw Telegram. Those blueprints explain how an adapter package such as `hazeteam-openclaw` should use `hazeteam-core`. They are not core runtime behavior and do not make OpenClaw, Telegram, OCA, or LifeOS part of `hazeteam-core` semantics.

## Core package responsibilities

`hazeteam-core` owns deterministic, transport-neutral semantics:

- public core refs and validators;
- public result and error envelopes;
- safe serializers and redaction helpers;
- host session binding contracts;
- presentation outbox lifecycle;
- presentation action-token lifecycle;
- approval, policy, workflow, runtime, execution, diagnostics, and lifecycle models;
- `createCoreInteractionHost` as the adapter-facing facade;
- in-memory test implementations where explicitly exported;
- generic adapter acceptance references.

Core must remain free of real transport, provider SDK, deployment, and product-specific behavior.

## External adapter responsibilities

External adapters own integration reality:

- raw external payload reception;
- external event normalization;
- external channel/conversation/topic binding;
- external identity and actor mapping;
- durable integration stores when production persistence is required;
- real delivery and callback APIs;
- runtime bridges such as OpenClaw, local workers, or custom orchestrators;
- external permission checks;
- external rendering and UI conventions;
- deployment processes, credentials, and secrets;
- product/domain behavior outside core.

Adapters must pass only bounded, pathless, public-safe refs and values into core.

## Minimal adapter implementation path

A minimal adapter package should normally be built in this order:

1. Create a package skeleton with CI that compiles package source and runs package-local tests.
2. Add static boundary tests that forbid private core imports, raw payload leakage, and secret terms.
3. Define normalized external event contracts owned by the adapter package.
4. Define adapter delivery request/result contracts owned by the adapter package.
5. Define adapter readiness, idempotency, and permission primitives.
6. Implement fake/testkit factories before real transport wiring.
7. Implement external session/topic binding resolution.
8. Map inbound external events into public core facade inputs.
9. Render core presentation outbox items to external messages.
10. Implement tokenized callback parsing, permission gating, token verify/consume, and intent submission.
11. Implement runtime and approval bridges through public ports.
12. Add fake end-to-end acceptance tests.
13. Add durable stores and restart/replay tests.
14. Add real transport/runtime wiring only after fake semantics are stable.
15. Add production readiness, health, deployment, and release hardening.

## Mandatory adapter safety rules

Every adapter package must follow these rules:

1. Import only the root package or declared public subpaths.
2. Treat missing public exports as API gaps, not as permission to import private files.
3. Keep raw external payloads, SDK objects, credentials, secrets, storage handles, and host filesystem paths outside core values.
4. Resolve or create external session binding before meaningful inbound dispatch.
5. Use the presentation outbox claim lifecycle before external delivery.
6. Issue action tokens for external actions.
7. Check external permissions before consuming an action token.
8. Verify and consume callback tokens exactly once before mapping callbacks to user intents.
9. Treat facade failures as public results, not transport exceptions.
10. Treat runtime drain as deterministic single-step work; scheduling and daemons belong outside core.
11. Serialize public results before logging or returning them outside the trusted runtime boundary.
12. Add CI that compiles adapter package TypeScript and runs package-local tests.

## What this guide does not certify

This guide does not certify or implement:

- real Telegram or other transport integrations;
- OpenClaw runtime SDK wiring;
- OCA/Codex runtime behavior;
- product/domain packages such as LifeOS;
- production database/cache/message-broker implementations;
- deployment schedulers or daemon processes;
- callback web servers;
- external permission backends;
- real observability exporters.

Those belong in external packages and deployment repositories. This guide defines how they may safely integrate with `hazeteam-core`.
