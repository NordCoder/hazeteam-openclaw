# Core Boundary and Ownership

## Purpose

This document defines the ownership boundary between `hazeteam-core` and external adapter or extension packages.

The goal is to let external packages integrate with core without turning core into a transport framework, product runtime, deployment system, provider SDK wrapper, or durable infrastructure package.

## Core design principle

`hazeteam-core` is the deterministic center of the system. It owns transport-neutral models, validation, state transitions, public envelopes, and adapter-facing facades.

External packages own external reality: transport, runtime SDKs, callbacks, durable integration state, deployment secrets, and product behavior.

The boundary is intentionally strict:

```text
external system / product / transport
-> adapter package
-> public hazeteam-core imports only
-> public core facade / stores / envelopes
-> adapter package
-> external delivery / callback / runtime
```

Core must not learn product-specific or provider-specific behavior from an adapter package.

## What core owns

Core owns the stable, deterministic semantics that must be shared across all adapters:

- core refs, id validation, canonical JSON, hashing, redaction, and safe public envelopes;
- workspace and agent descriptors as domain-neutral identity/configuration surfaces;
- host session binding contracts and validation;
- host inbound action contracts;
- the composed `createCoreInteractionHost` facade;
- presentation outbox item model and delivery lifecycle state;
- presentation action-token issue, verify, consume, serialization, and store contracts;
- user intent parsing and validation where exported through public presentation contracts;
- approval request/decision state semantics;
- policy and capability decision semantics;
- workflow state and workflow/runtime coordination semantics;
- runtime queue, retry, cancellation, and dead-letter semantics;
- execution result and audit event models;
- diagnostics, health, metrics, trace correlation, lifecycle, backup, and readiness models;
- public serializers and public DTOs designed for adapter-facing output;
- in-memory test implementations where explicitly exported;
- deterministic simulator and acceptance references where documented as references.

Core is allowed to provide contracts, validators, pure helpers, deterministic in-memory test stores, and public serializers.

Core is not allowed to hide real integration behavior behind implicit globals.

## What external adapters own

External adapter packages own everything that depends on a real product, transport, runtime, deployment, external account system, or external infrastructure.

Adapters own:

- raw external payload reception;
- external transport SDK usage;
- webhook, polling, socket, worker, or callback endpoint setup;
- external channel, conversation, chat, topic, thread, or message identity;
- external actor/user/account mapping;
- external permission lookup and enforcement before core callback submission;
- normalized adapter-owned event contracts;
- adapter-owned delivery request/result contracts;
- external message rendering and UI conventions;
- external callback payload format;
- external message delivery and edits;
- acknowledgement of provider callbacks;
- durable adapter-specific state;
- production implementations of core store contracts when needed;
- runtime bridges such as OpenClaw, local workers, Codex runners, or product orchestrators;
- deployment configuration, secrets, credentials, process lifecycle, schedulers, daemons, and health endpoints;
- product/domain-specific behavior and vocabulary.

Adapters may use public core contracts to validate and submit work. They must not mutate core state through private implementation details.

## What durable packages own

Durable store packages are external extension packages. They may implement public store contracts exported by core, but the backing infrastructure remains outside core.

Examples:

- SQLite session binding store;
- Postgres presentation outbox store;
- Redis idempotency store;
- OpenClaw-native storage implementation;
- object storage state ref provider;
- migration runner for adapter-specific schema.

Durable packages must preserve public core semantics such as claim atomicity, token consume-once behavior, idempotency uniqueness, safe serialization, and redaction.

## What runtime bridge packages own

Runtime bridge packages translate core host/runtime actions into an external runtime or orchestrator.

Examples:

- OpenClaw runtime bridge;
- local worker loop bridge;
- Codex worker bridge;
- domain-specific automation runtime bridge.

A runtime bridge may implement or inject public core ports such as `AgentControlHost`, runtime drain functions, workflow status readers, or health readers.

A runtime bridge must return safe public results and must not expose raw runtime objects, stack traces, storage handles, provider payloads, or host filesystem details through core-facing values.

## What transport packages own

Transport packages translate between a real external transport and adapter-owned normalized events/delivery requests.

Examples:

- Telegram transport adapter;
- Slack transport adapter;
- Discord transport adapter;
- email adapter;
- CLI adapter;
- webhook/API adapter;
- web dashboard adapter.

A transport package owns provider-specific constraints, callback payload size, message formatting, threading, rate limits, acknowledgement rules, and delivery failure mapping.

Core must never import the transport SDK.

## What product/domain packages own

Product or domain packages define product vocabulary, domain commands, domain-specific presentation, and workflow catalogs.

Examples:

- LifeOS domain package;
- CRM workflow package;
- finance/reconciliation workflow package;
- support-agent package;
- OCA wrapper package.

Product packages may depend on core public contracts and adapter package contracts. They must not modify core semantics or inject product vocabulary into core source.

## Data boundary rules

Adapters must only pass bounded, pathless, public-safe values into core.

Allowed examples:

- workspace refs;
- agent refs;
- host session refs;
- external conversation refs expressed as bounded ids;
- safe actor refs;
- correlation ids;
- safe metadata;
- opaque debug refs;
- public delivery refs;
- public token refs.

Forbidden examples:

- raw Telegram updates;
- raw OpenClaw runtime objects;
- raw provider callback payloads;
- SDK client instances;
- bot tokens or API keys;
- database client objects;
- storage roots and absolute filesystem paths;
- stack traces;
- raw document contents when not part of an explicitly safe public payload;
- private core store instances in serialized adapter output;
- mutable execution context objects.

## Adapter lifecycle ownership

Core does not own external process lifecycle.

External packages own:

- starting and stopping transport listeners;
- scheduling delivery pumps;
- scheduling runtime drains;
- retry timers outside core contracts;
- callback endpoint lifecycle;
- external service reconnection;
- deployment readiness;
- production configuration loading;
- schema migrations for external stores;
- operational alerts.

Core may expose deterministic one-step operations and readiness descriptions. It must not silently start production loops.

## Safe failure boundary

Core operation failures are public results. External adapters should treat them as safe values to render, log, or convert into transport-level responses after applying any adapter-side redaction rules.

Adapters must not turn raw thrown provider errors into core values. They should convert them into safe error codes, safe messages, retryability flags, and optional opaque details refs owned by the adapter.

## Anti-patterns

Do not implement adapters by:

- importing from `hazeteam-core/src/**`;
- importing private `dist/**` files;
- writing directly to core internal stores;
- skipping presentation outbox claim semantics;
- using token verify without token consume for side-effecting callbacks;
- consuming tokens before adapter-side permission checks;
- embedding raw provider payloads into core metadata;
- treating display names as canonical external identity;
- adding provider-specific vocabulary to core source;
- adding transport SDK dependencies to core;
- using in-memory stores as production durability;
- starting background daemons from core constructors.

## OpenClaw and Telegram boundary note

OpenClaw and Telegram are valid reference targets for adapter packages, but they are not core semantics.

A repository such as `hazeteam-openclaw` may define OpenClaw Telegram contracts, topic binding, runtime bridges, renderers, callback handlers, durable stores, and deployment docs. `hazeteam-core` should only define the public core surfaces those packages use.

If OpenClaw or Telegram integration needs a core symbol that is not publicly exported, the correct response is to file or implement a core API gap in `hazeteam-core`, not to import private implementation files.
