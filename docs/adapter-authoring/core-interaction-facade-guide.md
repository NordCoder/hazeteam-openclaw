# Core Interaction Facade Guide

## Purpose

`createCoreInteractionHost(options)` is the canonical adapter-facing facade for integrating external packages with `hazeteam-core`.

Adapters should use the facade instead of reaching into private host, runtime, presentation, workflow, or execution internals.

The facade is transport-neutral and domain-neutral. It does not deliver messages, host callbacks, open provider connections, start production schedulers, render provider-specific markup, or own product/domain behavior.

## High-level model

A production adapter creates the facade at startup with explicit ports:

```ts
import { createCoreInteractionHost } from "hazeteam-core/host";

const core = createCoreInteractionHost({
  agentControlHost,
  sessionBindingStore,
  presentationOutboxStore,
  presentationActionTokenStore,
  now,
  correlationId
});
```

The adapter then uses the facade as the only core interaction boundary:

```text
external inbound event
-> adapter binding and validation
-> core.submitHostAction or core.submitUserIntent
-> public CoreApiEnvelope

core presentation outbox
-> core.listPendingPresentations
-> core.claimPresentation
-> adapter external delivery
-> core.markPresentationDelivered or core.markPresentationFailed

external callback
-> adapter permission check
-> core.verifyActionToken
-> core.consumeActionToken
-> core.submitUserIntent
```

## Required ports

The facade is explicit-port based. It does not create hidden global stores or hidden runtime integrations.

### Required for inbound/session/dispatch operations

- `agentControlHost`
- `sessionBindingStore`

`agentControlHost` is the adapter-provided bridge from validated host actions to the actual runtime or orchestrator. In an OpenClaw adapter, this is where a safe core host action would be dispatched to OpenClaw runtime behavior through an adapter-owned bridge.

`sessionBindingStore` maps external conversation/session identity to core host session identity. Production adapters should normally provide a durable implementation.

### Required for presentation/token operations

- `presentationOutboxStore`
- `presentationActionTokenStore`

`presentationOutboxStore` owns the core delivery lifecycle state for presentation items. Adapters must claim before external delivery and must mark delivered or failed after the external delivery attempt.

`presentationActionTokenStore` owns token issue, verify, and consume state for external actions. Production adapters must preserve consume-once behavior.

## Optional ports

Optional ports allow adapters to expose diagnostics or deterministic one-step control surfaces without making core own deployment behavior.

Common optional ports include:

- runtime drain function;
- runtime worker loop shell;
- runtime queue and handlers;
- workflow status reader;
- workflow store;
- health reader;
- health/status reader;
- event or audit readers;
- approval readers;
- lifecycle/readiness providers;
- deterministic `now` and correlation helpers for tests.

Missing optional ports should produce safe not-configured or partial diagnostic results where applicable.

## Facade method groups

### Inbound/session/dispatch

Use these methods when an external message, command, or callback has been normalized and is ready to enter core.

- `submitHostAction`
- `submitUserIntent`

The adapter must resolve or create the relevant session binding before meaningful inbound dispatch. It must also validate and sanitize external actor, workspace, agent, and correlation refs before calling core.

Do not submit direct execution requests from an adapter unless a public adapter-facing core path explicitly allows that intent kind. Generic adapter boundaries deny direct execution by design.

### Presentation delivery

Use these methods to deliver core presentation output through an external transport.

- `listPendingPresentations`
- `claimPresentation`
- `markPresentationDelivered`
- `markPresentationFailed`

The adapter must not skip claim semantics. The safe delivery lifecycle is:

```text
list pending
-> claim item
-> render external message
-> deliver externally
-> mark delivered with safe external message ref
or
-> mark failed with safe retryable/non-retryable error
```

External delivery attempts, provider retry timing, rate limits, and transport failures belong outside core. Core owns the outbox state transitions and public serialization of delivery state.

### Action tokens and callbacks

Use these methods for token-gated external actions.

- `issueActionToken`
- `verifyActionToken`
- `consumeActionToken`

The safe callback lifecycle is:

```text
render external button with opaque token id
-> receive provider callback
-> resolve external binding
-> adapter-side permission check
-> verify token against expected context
-> consume token exactly once
-> map callback to UserIntent
-> submit through facade
```

Verification alone is not enough for side-effecting callback handling. The adapter must consume the token before treating the callback as accepted.

Permission checks should happen before token consume. If the actor is not allowed to click or approve in the external context, the adapter should deny safely and leave the token unconsumed.

### Runtime, workflow, and health diagnostics

Use these methods only when the relevant ports are injected:

- `drainRuntimeOnce`
- `getWorkflowStatus`
- `getHealth`
- `getPortReadiness`

`drainRuntimeOnce` is deterministic one-step work. It is not a production daemon or scheduler. Deployment-specific scheduling belongs to the adapter package or deployment process.

`getPortReadiness` is descriptive. It reports what ports are configured and whether required surfaces are available. It must not open external connections, create stores, or mutate runtime state.

## Public envelope handling

Facade operations return public `CoreApiEnvelope<T>` values.

Adapters should treat facade failures as safe public results, not as thrown transport exceptions.

A typical adapter should:

1. call a facade method;
2. inspect `ok`;
3. render success values through adapter-owned external UI rules;
4. render or log failure values only through safe messages, codes, correlation ids, and details refs;
5. avoid exposing raw thrown errors, raw provider payloads, storage roots, or stack traces.

## Adapter startup recipe

A production adapter startup should normally:

1. load adapter-owned deployment configuration and secrets outside core;
2. create external transport/runtime clients outside core;
3. create durable adapter stores outside core;
4. create durable implementations of required public core store contracts;
5. create an `AgentControlHost` bridge over the external runtime;
6. create the core facade with explicit ports;
7. run `getPortReadiness` and adapter-owned readiness checks;
8. start external listeners or workers only after readiness gates pass;
9. expose safe health/status output.

Core should not perform steps 1, 2, 7, 8, or 9 implicitly. The adapter owns them.

## Test adapter recipe

A deterministic test adapter may use public in-memory stores where exported.

A fake adapter test should normally:

1. create in-memory core stores;
2. create fake runtime bridge implementing `AgentControlHost`;
3. create fake external delivery sink;
4. create the facade;
5. submit fake inbound events;
6. claim and deliver fake presentation items;
7. issue and consume fake callback tokens;
8. assert public envelopes and safe serialization.

This pattern is suitable for adapter package tests and reference simulators. It is not production persistence.

## OpenClaw bridge note

An OpenClaw adapter should wrap OpenClaw runtime behavior behind public core ports. In the core-facing direction, OpenClaw is an implementation detail of the adapter's `AgentControlHost` and optional approval/runtime/readiness ports.

Core-facing values should not contain raw OpenClaw runtime objects, provider SDK objects, deployment handles, approval payloads, or secrets.

## Telegram transport note

A Telegram adapter should translate Telegram-specific concepts into adapter-owned normalized events and delivery requests before interacting with core.

Core-facing values should not contain raw Telegram updates. Topic, chat, message, and callback ids may be represented as bounded external refs through adapter-owned contracts and then mapped into public core session binding and correlation fields.

## Common mistakes

Avoid these mistakes:

- creating the facade without required ports and treating method-level failures as success;
- relying on hidden in-memory stores in production;
- using presentation outbox items without claiming them;
- marking delivery as sent before external delivery succeeds;
- treating token verification as equivalent to token consumption;
- consuming a token before external permission checks;
- passing raw external callback data into `UserIntent` without token validation;
- logging raw facade inputs that contain adapter-owned external payloads;
- importing private operation modules instead of using the facade;
- starting a runtime loop inside core construction.

## Facade implementation checklist for adapters

Before merging adapter facade integration, verify:

- required ports are explicitly injected;
- missing optional ports produce safe readiness/status behavior;
- inbound mapping resolves session binding first;
- presentation delivery follows list/claim/deliver/mark lifecycle;
- callbacks are permission-gated and token-consumed exactly once;
- all results leaving the adapter are public envelopes or safe adapter DTOs;
- no raw provider payloads are passed into core;
- no private core imports are used;
- package-local tests cover success and failure paths;
- CI compiles the adapter package and runs package-local tests.
