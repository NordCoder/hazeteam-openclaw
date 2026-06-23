# Runtime, Workflow, and Approval Guide

## Purpose

Adapters often need to bridge external runtimes, workflow status, approval UI, and operational controls into `hazeteam-core`.

This guide defines what an adapter may do through public core ports and what must remain outside core.

## Core principle

Core owns deterministic runtime, workflow, approval, policy, and execution semantics. Adapters own external runtime systems, product orchestration, transport UI, delivery, scheduling, and deployment lifecycle.

An adapter should not mutate runtime or workflow internals directly. It should use public facades, public stores, and injected ports.

## Runtime bridge model

A runtime bridge translates validated core actions into external runtime behavior.

Canonical model:

```text
validated HostInboundAction or UserIntent
-> core facade
-> AgentControlHost.dispatch
-> adapter-owned runtime bridge
-> external runtime or orchestrator
-> safe dispatch result
-> public core envelope
```

For OpenClaw, the OpenClaw runtime is behind the adapter-provided `AgentControlHost` or related public ports. Core-facing values must not contain raw OpenClaw runtime objects.

## What core owns for runtime

Core may own:

- runtime job contracts;
- runtime queue semantics;
- retry/cancellation/dead-letter models;
- deterministic one-step drain operations;
- runtime status DTOs;
- safe runtime health/diagnostic output;
- public host facade methods over injected runtime ports.

Core does not own:

- production runtime daemon;
- scheduler process;
- external queue service;
- OpenClaw runtime SDK;
- provider-specific worker process;
- deployment orchestration;
- external side-effect execution outside public runtime semantics.

## Adapter-owned runtime responsibilities

Adapters or deployment packages own:

- external runtime client creation;
- runtime authentication and secrets;
- mapping core action refs to runtime calls;
- converting runtime success/failure to safe core-facing results;
- external retry scheduling where not core-owned;
- process lifecycle;
- runtime readiness;
- operational metrics and logs;
- durable runtime bridge state if required.

## Runtime drain rule

`drainRuntimeOnce` is deterministic one-step work. It is not a background worker.

A deployment may schedule repeated drain calls, but that scheduler belongs outside core.

Safe deployment model:

```text
adapter service / OpenClaw worker / cron / queue consumer
-> call core.drainRuntimeOnce
-> inspect public envelope
-> schedule next iteration outside core
```

Unsafe model:

```text
createCoreInteractionHost()
-> silently starts hidden production loop
```

Core constructors must not start hidden daemons.

## Workflow status

Workflow state is canonical core state. Adapters may expose workflow status through public facade methods or safe readers.

Adapters should:

- read status through public ports;
- render safe summaries externally;
- preserve workspace/agent/session boundaries;
- avoid exposing raw workflow internals;
- avoid mutating workflow state outside public operations.

Adapters should not:

- patch workflow internal records directly;
- skip approval gates;
- inject product-specific state into core workflow internals;
- expose raw execution context or storage paths in status messages.

## Approval model

Core owns approval request state and approval decision semantics. The adapter owns external approval UI and callback reception.

Canonical approval flow:

```text
workflow/action requires approval
-> core produces approval-related presentation item or status
-> adapter renders approval card externally
-> adapter issues tokenized approve/reject actions
-> external user clicks button
-> adapter resolves binding and actor
-> adapter checks permission
-> adapter verifies and consumes action token
-> adapter submits approval UserIntent or public core approval action
-> core applies approval semantics
```

Do not resolve approval directly from raw external button payloads.

## Approval routing

Adapters should route approval UI to the correct external context.

Routing should use trusted binding state, not display names.

Examples:

- OpenClaw Telegram coder approval -> coder topic;
- reviewer approval -> reviewer topic;
- fallback approval -> configured workspace control topic;
- web approval -> workspace dashboard route;
- email approval -> configured approver address if policy permits.

Approval cards should include only safe summaries. Raw tool request payloads, secrets, document internals, or provider objects must not be rendered unless explicitly safe.

## Permission and approval

External permission checks should happen before token consume.

For approvals, permission may depend on:

- external actor role;
- workspace membership;
- agent ownership;
- Telegram chat admin/member state;
- OpenClaw approval policy;
- product-specific approval role;
- approval type or risk level.

If permission is denied, return a safe denial and do not consume the token.

## Policy relationship

Core policy decides core action semantics. External adapter permission decides whether an external actor in an external context may invoke a callback or approval action.

Both may be required.

Do not replace core policy with external permissions. Do not replace external callback authorization with core token parsing alone.

## Execution relationship

Adapters should not submit direct execution requests unless a public adapter-facing path explicitly permits that operation.

The safe path is normally:

```text
external event
-> core intent/host action
-> policy/workflow/approval/runtime
-> execution through core-owned semantics
```

Adapters should surface execution results through safe public summaries, diagnostics, or presentation output.

## OpenClaw reference

An OpenClaw adapter may need bridges for:

- `AgentControlHost.dispatch` to OpenClaw runtime;
- OpenClaw approval source/resolver;
- OpenClaw runtime readiness;
- OpenClaw tool execution status;
- OpenClaw agent descriptors;
- OpenClaw deployment health.

These bridges are adapter-owned. Core values should carry only safe refs, safe summaries, and public envelopes.

OpenClaw raw runtime responses, tool call payloads, approval objects, logs, credentials, and deployment handles stay outside core.

## Telegram approval UI reference

For Telegram forum-topic adapters:

- route approval card to the originating agent topic where possible;
- include approve/reject buttons with opaque token payloads;
- keep callback payload as `hz:<tokenRef>` or equivalent opaque format;
- check Telegram/OpenClaw permissions before token consume;
- consume once;
- edit or reply with safe status after resolution;
- handle replay safely.

## Runtime/readiness failures

Runtime bridge failures should become safe public failures.

Safe failure shape:

- code;
- safe message;
- retryability or degradation marker where useful;
- correlation id;
- optional detailsRef;
- no raw stack;
- no raw runtime payload;
- no secret;
- no filesystem path.

Readiness failures should not throw during facade construction unless the adapter chooses to gate startup outside core. `getPortReadiness` is diagnostic and descriptive.

## Anti-patterns

Avoid:

- importing runtime internals from core private files;
- directly mutating workflow state from adapter code;
- bypassing approval gates;
- converting approval clicks directly into execution;
- starting runtime daemons inside core constructors;
- hiding external runtime clients inside core store values;
- logging raw runtime/tool payloads in core-facing envelopes;
- treating external permission as a replacement for core policy;
- treating core token verification as a replacement for external permission.

## Runtime bridge tests

Runtime bridge tests should cover:

- valid dispatch to fake runtime;
- safe runtime failure;
- thrown runtime error becomes safe failure;
- unsafe runtime payload is not exposed;
- missing runtime port produces safe not-configured result;
- `drainRuntimeOnce` does not start a loop;
- workflow status is safe;
- health/readiness is safe.

## Approval tests

Approval tests should cover:

- approval card rendering uses safe summary;
- approve button tokenized;
- reject button tokenized;
- unauthorized actor does not consume token;
- approve consumes once;
- reject consumes once;
- replay does not resolve twice;
- wrong workspace/agent/topic denied safely;
- missing approval denied safely;
- raw approval payload does not leak.

## Implementation checklist

Before merging runtime/workflow/approval adapter code, verify:

- runtime bridge is behind public ports;
- no raw runtime object enters core values;
- scheduler/daemon lives outside core;
- workflow state is read/mutated only through public surfaces;
- approval UI is tokenized;
- external permission is checked before token consume;
- replay is safe;
- failures are safe public DTOs/envelopes;
- readiness is descriptive and safe;
- package-local tests run in CI.
