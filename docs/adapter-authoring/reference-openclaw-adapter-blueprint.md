# Reference OpenClaw Adapter Blueprint

## Purpose

This document is a reference blueprint for building an OpenClaw integration package on top of `hazeteam-core`.

It is not core runtime behavior. It does not make OpenClaw a dependency of `hazeteam-core`. It defines how a repository such as `hazeteam-openclaw` can safely integrate OpenClaw-owned runtime, channel, storage, and approval capabilities with public core contracts.

## Boundary statement

`hazeteam-core` remains transport-neutral and domain-neutral.

OpenClaw integration belongs in an external package or repository.

Recommended ownership split:

```text
hazeteam-core
-> public contracts, facades, envelopes, session/outbox/token/workflow/runtime semantics

hazeteam-openclaw
-> OpenClaw channel adapters, runtime bridge, delivery, callback, approval, adapter stores, deployment wiring

OpenClaw platform
-> provider runtimes, Telegram channel edge, raw updates, send/edit/ack APIs, approval source, deployment secrets
```

The adapter may depend on both `hazeteam-core` public subpaths and OpenClaw APIs. Core must not import OpenClaw APIs.

## OpenClaw owns

OpenClaw owns provider/platform concerns such as:

- bot tokens and provider credentials;
- raw Telegram updates or other raw provider events;
- webhook/polling/channel ingestion where OpenClaw provides it;
- Telegram send/edit/delete/pin/callback acknowledgement APIs;
- OpenClaw runtime process and deployment lifecycle;
- OpenClaw tool execution environment;
- OpenClaw approval source/resolver APIs;
- OpenClaw storage APIs if available;
- OpenClaw user/role/workspace context if available;
- provider SDK clients and platform handles.

These must not become `hazeteam-core` values.

## The OpenClaw adapter owns

An OpenClaw adapter package owns the integration layer:

- normalized OpenClaw channel event contracts;
- external channel/conversation/topic binding;
- event mapping to public core inputs;
- `AgentControlHost` bridge over OpenClaw runtime;
- presentation renderer for OpenClaw delivery channels;
- delivery request/result contracts;
- delivery pump/drain operation;
- callback parser and token-gated action flow;
- external permission checks;
- approval card routing;
- OpenClaw approval bridge where needed;
- adapter readiness aggregation;
- durable adapter stores;
- OpenClaw-specific testkit/fakes;
- deployment documentation and runtime configuration.

The adapter may use OpenClaw SDKs or APIs internally. It must expose only safe adapter contracts and public core values across the core boundary.

## Core owns

`hazeteam-core` owns:

- public refs and id validation;
- safe public envelopes;
- host session binding contracts;
- `createCoreInteractionHost` facade;
- host inbound action validation;
- presentation outbox lifecycle;
- action token issue/verify/consume semantics;
- workflow, policy, approval, runtime, execution semantics;
- diagnostics/readiness models;
- safe serialization rules;
- deterministic in-memory test implementations where exported;
- generic adapter acceptance references.

Core does not own OpenClaw deployment or provider wiring.

## Recommended repository package layout

A dedicated OpenClaw repository may use a layout like:

```text
packages/openclaw-adapter
packages/openclaw-testkit
packages/domain-lifeos
packages/oca-wrapper
packages/openclaw-store-sqlite
packages/openclaw-store-postgres
packages/openclaw-deployment
```

Early phases should keep only the packages that are actually scoped. Placeholder packages should remain README-only until implementation is planned.

## Primary package responsibilities

### `openclaw-adapter`

Owns the production adapter contracts and implementation:

- channel event contracts;
- delivery contracts;
- readiness/idempotency/permission primitives;
- topic/channel binding;
- event mappers;
- command router;
- renderer;
- delivery pump;
- callback handler;
- core host factory;
- runtime bridge;
- approval bridge;
- adapter readiness aggregation.

### `openclaw-testkit`

Owns deterministic test utilities:

- fake OpenClaw events;
- fake Telegram channel refs;
- fake delivery sink;
- fake runtime bridge;
- fake approval source/resolver;
- fake clock/id generator;
- fake stores;
- fake end-to-end harness.

### `domain-lifeos`

Owns product/domain behavior when scoped:

- LifeOS-specific commands;
- domain workflow catalog;
- domain UI descriptors;
- domain approval policy;
- domain-specific tests.

It should not be implemented as part of generic OpenClaw adapter foundation.

### `oca-wrapper`

Owns OCA/Codex runtime integration when scoped:

- OCA process invocation;
- Codex worker session management;
- OCA-specific runtime bridge;
- OCA-specific logs and safety boundaries.

It should not be implemented until OpenClaw adapter semantics are stable.

## Core facade integration

The OpenClaw adapter should create `createCoreInteractionHost` with explicit ports.

Required examples:

```text
agentControlHost
sessionBindingStore
presentationOutboxStore
presentationActionTokenStore
```

The adapter-owned `agentControlHost` should bridge to OpenClaw runtime behavior.

The adapter should not import private host/runtime/presentation modules from `hazeteam-core`.

## AgentControlHost bridge

The OpenClaw runtime bridge should implement public host dispatch behavior.

Recommended shape:

```text
core HostInboundAction
-> OpenClaw adapter runtime bridge
-> OpenClaw runtime dispatch
-> safe result
-> public CoreApiEnvelope through facade
```

Bridge rules:

- map only validated core actions to OpenClaw calls;
- keep raw OpenClaw runtime responses outside core values;
- convert runtime failures to safe errors;
- preserve correlation ids;
- avoid stack trace leakage;
- expose readiness as adapter diagnostics, not core construction side effects.

## Channel event ingestion

OpenClaw may expose normalized channel events or raw provider events. The adapter should normalize these into adapter-owned contracts before core mapping.

Recommended event categories:

- message event;
- callback event;
- system/topic event;
- approval/event notification where appropriate.

Raw OpenClaw or provider objects should not cross into core values.

## Session and channel binding

The adapter should map OpenClaw channel coordinates to core workspace/agent/session context.

Recommended binding value:

```text
bindingRef
workspaceRef
agentRef
hostSessionRef
channelRef
external conversation/thread/topic refs
status
safe display metadata
```

Binding storage is adapter-owned. Production deployments should make it durable.

## Delivery architecture

Core presentation outbox items should be rendered into OpenClaw delivery requests outside core.

Recommended flow:

```text
core.listPendingPresentations
-> core.claimPresentation
-> adapter resolves binding
-> adapter renders OpenClaw delivery request
-> OpenClaw channel send/edit API
-> core.markPresentationDelivered or core.markPresentationFailed
```

Delivery target must come from trusted binding state. User metadata must not redirect delivery.

## Callback architecture

OpenClaw callback events should be token-gated.

Recommended flow:

```text
OpenClaw callback event
-> adapter parses opaque token payload
-> adapter resolves channel/session binding
-> adapter checks OpenClaw/external permissions
-> core.verifyActionToken
-> core.consumeActionToken
-> adapter maps verified callback to UserIntent
-> core.submitUserIntent
```

Unauthorized callbacks should not consume tokens by default.

## Approval architecture

OpenClaw may have native approval objects or runtime approval events. The adapter should bridge them into safe core-facing presentation/intent flows.

Recommended model:

```text
OpenClaw approval request
-> adapter normalized approval ref/summary
-> core-safe presentation item or adapter-owned approval card
-> tokenized approve/reject actions
-> callback permission check
-> token verify/consume
-> approval resolution through public core/OpenClaw adapter bridge
```

Raw OpenClaw approval payloads should not be rendered or stored in core values.

## Readiness architecture

The adapter should aggregate readiness from:

- core facade port readiness;
- OpenClaw channel readiness;
- delivery capability;
- runtime bridge readiness;
- approval bridge readiness;
- durable store readiness;
- topic/channel binding state;
- permission policy readiness;
- renderer/descriptor registry readiness.

Readiness output must be safe and must not expose credentials, provider errors, stack traces, or connection strings.

## Storage architecture

Storage should be layered:

1. Core stores implementing public core contracts.
2. Adapter-owned stores for OpenClaw channel/topic/delivery/idempotency state.
3. Product/domain stores for domain-specific behavior.
4. Deployment storage for secrets/config/migrations.

Preferred backend order for OpenClaw adapter state:

1. OpenClaw native storage API if it provides sufficient consistency.
2. Adapter-owned SQLite/Postgres package.
3. In-memory stores only for tests and local demos.

## Testing strategy

The OpenClaw adapter should be built fake-first.

Recommended test sequence:

1. Contract tests for refs/events/delivery/readiness/token/permission shapes.
2. Static boundary tests for private core imports and raw payload leakage.
3. Testkit factories for fake OpenClaw channel events.
4. Fake delivery sink.
5. Fake runtime bridge.
6. Fake approval source/resolver.
7. Topic binding unit tests.
8. Inbound mapper tests.
9. Renderer tests.
10. Callback permission/token tests.
11. Fake end-to-end message-to-delivery smoke.
12. Fake approval smoke.
13. Durable restart/replay tests.
14. Real OpenClaw wiring smoke after fake semantics are stable.

Real OpenClaw tests should be environment-gated and should not require secrets in default CI.

## Production rollout phases

Recommended production progression:

1. Package skeleton and CI.
2. Public adapter contracts.
3. Testkit/fakes.
4. Binding stores and mappers.
5. Core host factory and fake runtime bridge.
6. Renderer and delivery pump.
7. Callback/token flow.
8. Approval flow.
9. Fake E2E.
10. Durable stores.
11. Real OpenClaw channel event adapter.
12. Real OpenClaw delivery adapter.
13. Real OpenClaw runtime bridge.
14. Real approval bridge.
15. Production readiness and deployment hardening.
16. Real Telegram/OpenClaw smoke.
17. Release candidate hardening.

## Non-goals for core

This blueprint does not ask `hazeteam-core` to implement:

- OpenClaw SDK integration;
- Telegram SDK integration;
- bot token handling;
- webhook/polling;
- OpenClaw runtime dispatch;
- OpenClaw approval resolution;
- provider-specific delivery;
- OpenClaw storage implementation;
- OpenClaw deployment process;
- OCA/Codex runtime;
- LifeOS product behavior.

Those belong outside core.

## Implementation checklist

Before merging OpenClaw adapter code, verify:

- all core imports use public subpaths;
- OpenClaw raw payloads stay outside core values;
- binding exists before inbound dispatch;
- delivery target comes from binding state;
- outbox claim happens before delivery;
- callbacks are permission-checked before token consume;
- token consume happens exactly once;
- runtime bridge returns safe results;
- approval flow is token-gated;
- readiness is safe;
- durable stores document restart behavior;
- package source and package-local tests are included in CI.
