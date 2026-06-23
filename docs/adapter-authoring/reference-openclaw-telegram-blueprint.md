# Reference OpenClaw Telegram Blueprint

## Purpose

This document is a reference blueprint for building an OpenClaw Telegram adapter on top of `hazeteam-core`.

It describes the intended architecture for a package such as `hazeteam-openclaw`, where OpenClaw owns the Telegram channel edge and the adapter maps OpenClaw Telegram events, delivery, callbacks, and approvals into public core flows.

This is not `hazeteam-core` runtime behavior. It is an adapter blueprint.

## High-level architecture

```text
Telegram user
-> OpenClaw Telegram channel edge
-> normalized OpenClaw Telegram event
-> OpenClaw Telegram adapter
-> hazeteam-core createCoreInteractionHost
-> AgentControlHost bridge over OpenClaw runtime
-> core presentation outbox / action tokens
-> OpenClaw Telegram delivery adapter
-> Telegram forum topic
```

The adapter is responsible for every OpenClaw/Telegram-specific decision. Core receives only safe public refs, inputs, and envelopes.

## Ownership split

### OpenClaw owns

- bot token;
- raw Telegram update;
- webhook or polling if OpenClaw provides it;
- Telegram channel registration;
- provider send/edit/delete/pin APIs;
- callback acknowledgement APIs;
- OpenClaw runtime/tool environment;
- OpenClaw approval source/resolver;
- OpenClaw deployment secrets and process lifecycle.

### OpenClaw Telegram adapter owns

- normalized event contracts;
- topic binding registry;
- event mappers;
- command parser/router;
- UI descriptors;
- home/help card rendering;
- presentation renderer;
- delivery pump;
- callback parser;
- permission gate;
- token verify/consume dispatch;
- approval card routing;
- adapter readiness aggregation;
- durable adapter state;
- fake testkit and real smoke tests.

### hazeteam-core owns

- public core refs;
- host session binding contracts;
- `createCoreInteractionHost` facade;
- presentation outbox lifecycle;
- presentation action token lifecycle;
- safe public envelopes;
- workflow/policy/runtime/approval semantics;
- safe serializers and diagnostics.

## Telegram deployment model

Recommended production model:

- one bot owned/configured by OpenClaw;
- one Telegram supergroup/forum per workspace or environment;
- one forum topic per agent surface;
- optional dev group containing multiple workspaces only when binding keys disambiguate correctly.

A topic is an external UI surface. It is not core identity by itself.

## Topic binding

Canonical OpenClaw Telegram binding:

```text
channelId + chatId + messageThreadId
-> bindingRef + workspaceRef + agentRef + hostSessionRef
```

`topicName` is display metadata only. It may change and must not be canonical identity.

A binding record should contain:

- bindingRef;
- channelRef;
- chatId;
- messageThreadId;
- topicName;
- isGeneralTopic when relevant;
- workspaceRef;
- agentRef;
- hostSessionRef;
- status;
- homeMessageRef if pinned/home card is used;
- createdAt/updatedAt;
- safe migration metadata.

If a message arrives without `messageThreadId` and the target flow requires an agent topic, the adapter should reject safely or use an explicit configured fallback. It should not guess an agent from topic name or text.

## Agent topic model

Each agent surface may have its own topic:

- Router topic;
- Coder topic;
- Reviewer topic;
- Planner topic;
- Approval/control topic;
- Workspace status topic.

This allows per-agent command behavior without relying on Telegram native command scopes.

Native bot commands should remain small and global. Topic-aware behavior should be implemented by the adapter command router.

## Command model

Recommended global native commands:

- `/help`;
- `/status`;
- `/actions`;
- `/sessions`;
- `/cancel`;
- `/settings`.

The adapter should interpret commands in topic context:

```text
command + channelId + chatId + messageThreadId
-> topic binding
-> workspaceRef + agentRef
-> agent-specific command registry
-> core input or adapter-owned response
```

The same `/help` command may render different help in the Coder topic and Reviewer topic.

## Message flow

Canonical message flow:

```text
1. Telegram user sends message in forum topic.
2. OpenClaw receives raw Telegram update.
3. OpenClaw exposes normalized Telegram channel event or adapter normalizes it.
4. Adapter derives inbound idempotency key.
5. Adapter resolves topic binding by channelId + chatId + messageThreadId.
6. Adapter maps actor and text/attachments to safe core input.
7. Adapter submits through createCoreInteractionHost.
8. Core dispatches through AgentControlHost bridge.
9. OpenClaw runtime bridge returns safe result.
10. Core creates or exposes presentation outbox items where applicable.
11. Adapter delivery pump renders and sends response to the same topic or configured target.
```

Raw Telegram update must not enter core values.

## Callback flow

Canonical callback flow:

```text
1. User clicks Telegram inline button.
2. OpenClaw receives callback query.
3. Adapter parses callback data.
4. Callback data contains opaque token payload such as hz:<tokenRef>.
5. Adapter resolves channel/topic binding.
6. Adapter maps actor and checks permission in OpenClaw/Telegram context.
7. If denied, adapter returns safe denial and does not consume token.
8. Adapter verifies action token against expected workspace/outbox/action context.
9. Adapter consumes token exactly once.
10. Adapter maps verified callback to UserIntent.
11. Adapter submits through createCoreInteractionHost.
12. Adapter acknowledges callback and renders safe follow-up/update.
```

Do not include raw action payloads in callback data.

## Delivery flow

Canonical delivery flow:

```text
core.listPendingPresentations
-> core.claimPresentation
-> adapter resolves topic binding
-> adapter renders Telegram message content and tokenized buttons
-> adapter sends through OpenClaw Telegram channel API
-> adapter stores safe external message ref
-> core.markPresentationDelivered
```

Failure path:

```text
render or delivery failure
-> adapter creates safe delivery error
-> core.markPresentationFailed
-> adapter logs safe detailsRef/correlationId
```

Delivery target must come from binding state.

## Home card and pinned topic card

Each agent topic may have a home card.

The adapter owns:

- rendering home card;
- sending/pinning/updating the external message through OpenClaw Telegram channel API;
- storing homeMessageRef in topic binding state;
- refreshing home card after configuration changes;
- handling missing/deleted home message safely.

Core should not know Telegram pinning mechanics.

## Help rendering

`/help` should be topic-aware.

Recommended behavior:

```text
/help in coder topic -> coder command/help card
/help in reviewer topic -> reviewer command/help card
/help in router topic -> router command/help card
/help outside known topic -> setup or safe fallback help
```

Help output is adapter-rendered presentation. It may use core presentation primitives or adapter-owned delivery requests, depending on phase.

## Approval routing

Approval cards should route to the originating agent topic by default.

Recommended priority:

1. topic associated with originating workspace/agent/session;
2. configured approval/control topic for workspace;
3. safe fallback status channel;
4. fail safely if no target exists.

Approval actions must be tokenized.

Approve/reject callback flow:

```text
approval card button
-> hz:<tokenRef>
-> topic binding resolution
-> permission check
-> verify token
-> consume token
-> submit approval intent/resolution
```

Replay must not resolve approval twice.

## Permission model

OpenClaw Telegram adapter permissions may combine:

- Telegram chat membership/admin state;
- OpenClaw workspace roles;
- topic binding status;
- agent-specific command policy;
- approval permission policy;
- product/domain permission rules.

Permission check must happen before token consume for callbacks.

A denial should be safe and should not reveal internal policy objects.

## Idempotency model

Recommended idempotency keys:

```text
telegram-message:<channelId>:<chatId>:<messageThreadId>:<messageId>
telegram-callback:<channelId>:<chatId>:<messageThreadId>:<callbackQueryId>
delivery:<outboxRef>:<claimRef>:<attemptNumber>
```

Production adapter should use durable idempotency for inbound messages, callbacks, and delivery attempts when duplicate side effects are harmful.

## Rendering rules

Telegram rendering should enforce:

- message length limits;
- markup escaping;
- safe fallback text;
- safe attachment summaries;
- tokenized button payloads;
- no raw action JSON in callback data;
- no secrets or stack traces;
- safe user-visible errors.

The renderer should produce adapter-owned delivery requests, not call provider APIs directly unless the package intentionally combines renderer and delivery.

## Runtime bridge

The OpenClaw runtime bridge should sit behind `AgentControlHost` or related public ports.

Rules:

- core sends validated actions;
- adapter calls OpenClaw runtime;
- adapter converts OpenClaw result to safe output;
- raw OpenClaw runtime objects stay outside core;
- thrown errors become safe failures;
- readiness reports degraded/missing runtime bridge safely.

## Real wiring phases

Real OpenClaw Telegram wiring should come after fake semantics.

Recommended order:

1. contracts;
2. testkit fakes;
3. topic binding;
4. mapper;
5. renderer;
6. core host factory;
7. fake runtime bridge;
8. fake delivery pump;
9. callback permission/token flow;
10. approval flow;
11. fake E2E;
12. real OpenClaw channel event adapter;
13. real OpenClaw delivery adapter;
14. real runtime bridge;
15. real approval bridge;
16. durable stores;
17. production readiness;
18. real Telegram smoke;
19. release hardening.

## Safety rules

The adapter must not:

- pass raw Telegram updates to core;
- expose bot tokens;
- expose OpenClaw deployment handles;
- use topic name as canonical identity;
- skip topic binding resolution;
- send delivery to targets derived from untrusted metadata;
- consume token before permission check;
- treat token verify as consume;
- allow replay to dispatch twice;
- import `hazeteam-core/src/**`;
- add Telegram/OpenClaw SDKs to `hazeteam-core`.

## Test matrix

OpenClaw Telegram adapter tests should cover:

- message event factory;
- callback event factory;
- system/topic event factory;
- topic binding lookup;
- missing topic binding;
- disabled topic binding;
- renamed topic preserves identity;
- message mapping to core input;
- command parsing by topic;
- help card rendering by agent topic;
- delivery target from binding;
- tokenized button rendering;
- callback malformed/expired/replay/wrong-topic/unauthorized;
- approval approve/reject replay safety;
- fake runtime success/failure/throw;
- delivery failure redaction;
- readiness missing/degraded/ready states;
- no raw Telegram/OpenClaw payload leakage.

## Production checklist

Before production release, verify:

- durable topic binding store exists;
- durable action token store exists;
- durable outbox store exists;
- idempotency store exists;
- callback replay matrix passes;
- delivery retry/failure matrix passes;
- topic binding restart simulation passes;
- readiness detects missing OpenClaw channel/runtime/stores;
- logs are redacted;
- real Telegram forum smoke passes in secret-gated environment;
- docs explain deployment and operational limitations.
