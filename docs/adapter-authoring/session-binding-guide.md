# Session Binding Guide

## Purpose

External session binding is the adapter-facing mapping between an external conversation/session and the core workspace, agent, and host session that should handle it.

Adapters should resolve session binding before meaningful inbound dispatch. Without a binding, core cannot safely know which workspace and agent an external event belongs to.

## Canonical model

```text
external channel / conversation / topic
-> adapter-owned normalized external conversation ref
-> host session binding lookup or creation
-> workspaceRef + agentRef + hostSessionRef
-> HostInboundAction or UserIntent submission through createCoreInteractionHost
```

Session binding is transport-neutral in core. The adapter owns the external identity details.

## What core owns

Core owns the public host/session binding contracts, validation, serialization, and in-memory test store where exported.

Core does not own:

- external channel lookup;
- provider-specific conversation ids;
- Telegram chat or topic APIs;
- OpenClaw channel registry;
- Slack/Discord/email/web identities;
- durable production binding storage;
- product-specific routing rules.

## What the adapter owns

The adapter owns the external side of the mapping:

- external channel id;
- external conversation id;
- external thread/topic id;
- external message id when needed for correlation;
- external actor/user/account id;
- workspace and agent routing policy;
- durable binding store if production persistence is required;
- lifecycle for disabled, archived, deleted, or renamed external conversations.

Adapter-specific binding tables should remain outside core. They may feed or back public core session-binding stores, but they should not leak raw provider payloads into core values.

## External refs

External refs passed toward core must be:

- bounded;
- pathless;
- deterministic;
- public-safe;
- free of secrets;
- free of raw provider objects;
- stable enough for idempotency and replay handling.

Good external refs:

```text
telegram-channel:prod-bot
telegram-chat:-1001234567890
telegram-topic:456
openclaw-channel:workspace-router
slack-thread:C123/T456
web-session:session_abc123
```

Bad external refs:

```text
/var/lib/hazeteam/workspaces/acme/private-state.json
{"raw_update":{...}}
BotToken:123:secret
[object Object]
```

## Binding resolution flow

A typical inbound message flow should resolve binding like this:

```text
1. Receive external event outside core.
2. Normalize adapter event into safe adapter-owned DTO.
3. Derive external conversation coordinates.
4. Look up existing binding by external coordinates.
5. If missing, apply adapter routing policy:
   - reject safely;
   - create binding;
   - route to configured fallback;
   - ask for setup/admin action.
6. Validate binding is active and compatible.
7. Construct core inbound input with workspaceRef, agentRef, hostSessionRef, actorRef, and correlationId.
8. Submit through createCoreInteractionHost.
```

The adapter must not use display names as canonical identity. Display names can change and may not be unique.

## Binding creation policy

Binding creation is product and deployment policy. Core should not assume all external conversations may create sessions.

An adapter may choose one of these policies:

- pre-provisioned only;
- first-message auto-create;
- admin-command create;
- configuration-file based;
- OpenClaw workspace registry based;
- tenant-specific allowlist;
- manual setup through external UI.

Whichever policy is used, the resulting core-facing binding must be safe and deterministic.

## Binding state

A production adapter should model at least these states in adapter-owned storage:

- active;
- disabled;
- archived;
- missing external target;
- external target renamed;
- external target deleted;
- migration required;
- permission degraded.

Core session binding should not be used to hide provider lifecycle problems. The adapter should surface safe readiness or status output when a binding is unusable.

## Multi-workspace and multi-agent routing

External ids alone are not enough in multi-workspace deployments. A safe binding should include enough adapter-owned context to avoid collisions.

Recommended key shape:

```text
adapterDeploymentRef + externalChannelRef + externalConversationRef + optionalExternalThreadRef
```

Recommended value shape:

```text
workspaceRef + agentRef + hostSessionRef + bindingRef + status
```

If a single external channel serves multiple workspaces, the adapter must include workspace-disambiguating context in the binding store. Never infer workspace from a display title alone.

## Callback binding

Callbacks should also resolve binding before token verification or intent submission.

Recommended callback flow:

```text
external callback
-> parse safe callback token envelope
-> resolve external conversation/topic binding
-> adapter permission check in that external context
-> verify token against expected workspace/outbox/action context
-> consume token exactly once
-> submit validated UserIntent through core facade
```

If the callback arrives from the wrong external conversation, workspace, agent, or topic, deny safely and do not consume the token.

## Presentation delivery binding

Presentation delivery should derive external delivery target from binding, not from untrusted item metadata.

Recommended delivery flow:

```text
presentation item contains workspace/agent/session context
-> adapter resolves binding
-> adapter derives external delivery target
-> adapter renders message
-> adapter sends externally
-> core marks delivered/failed
```

The adapter should not allow a user-provided metadata field to redirect core presentation output to another external conversation.

## OpenClaw Telegram reference

For an OpenClaw Telegram adapter, a typical binding is:

```text
channelId + chatId + messageThreadId
-> workspaceRef + agentRef + hostSessionRef + bindingRef
```

Telegram forum topic name is display-only. It may be stored as metadata for UI, but it must not be canonical identity.

If `messageThreadId` is absent for a message that requires an agent topic, the adapter should reject safely or route through an explicit configured fallback. Do not silently guess an agent from text or display names.

## Durable storage requirements

In production, binding storage should normally be durable.

A durable binding store should preserve:

- uniqueness for external coordinates;
- stable lookup by external coordinates;
- lookup by workspace/agent/session where needed;
- active/disabled/archived status;
- migration metadata;
- audit-friendly timestamps;
- safe public serialization;
- no raw provider payloads;
- no secrets.

In-memory binding stores are acceptable for tests, local demos, and deterministic reference simulations only.

## Idempotency relationship

Session binding and idempotency are related but not identical.

Binding answers:

```text
where should this external conversation route?
```

Idempotency answers:

```text
have we already processed this external event or delivery attempt?
```

A robust adapter usually uses both:

1. derive idempotency key from external event coordinates;
2. resolve binding;
3. process only if the idempotency record permits it;
4. store safe result refs.

## Safe serialization

Serialized binding output should include only safe refs and display-safe metadata.

Allowed:

- bindingRef;
- workspaceRef;
- agentRef;
- hostSessionRef;
- external channel id ref;
- external conversation id ref;
- external thread/topic id ref;
- display name;
- status;
- timestamps;
- safe diagnostics.

Forbidden:

- raw external payloads;
- provider SDK objects;
- tokens or credentials;
- database handles;
- host filesystem paths;
- mutable store internals;
- stack traces.

## Testing checklist

Adapter session binding tests should cover:

- lookup existing binding;
- create binding when policy allows;
- reject missing binding when policy denies creation;
- disabled binding blocks inbound dispatch;
- archived binding remains inspectable but inactive;
- renamed topic/conversation keeps stable identity;
- duplicate external coordinates are rejected;
- multi-workspace collisions are impossible;
- callback from wrong topic does not consume token;
- delivery target is derived from binding, not untrusted metadata;
- serialized binding output is public-safe.

## Implementation checklist

Before merging a binding implementation, verify:

- external ids are normalized before lookup;
- display names are not canonical;
- binding store is injected, not hidden global state;
- production persistence is planned where required;
- failures are safe public errors;
- binding is resolved before inbound dispatch;
- binding is resolved before callback token consume;
- binding is resolved before presentation delivery;
- no raw external payload is stored in core-facing binding values;
- no private core imports are used.
