# ADR 0003: Telegram topic binding model

## Status

Accepted

## Context

The OpenClaw Telegram adapter uses Telegram forum topics as agent-facing UI surfaces. Topic names can change and are not unique enough for trusted routing. Inbound messages, delivery, callbacks, and approvals need a stable mapping from external Telegram/OpenClaw coordinates to core workspace, agent, and host session context.

## Decision

The canonical Telegram forum topic binding key is:

```text
channelId + chatId + messageThreadId
```

The canonical binding value is:

```text
workspaceRef + agentRef + hostSessionRef
```

A binding record may include `bindingRef`, status, safe display metadata, `homeMessageRef`, timestamps, and migration metadata. Topic name is display-only.

Delivery target must be derived from trusted binding state, not from untrusted metadata, callback payloads, command text, or topic titles.

Callbacks resolve through:

```text
binding + permission + token verify/consume
```

Unauthorized callbacks should not consume tokens by default. A valid side-effecting callback must verify expected context and consume the token exactly once before submitting a user intent or approval decision.

## Consequences

- Binding resolution is required before inbound dispatch.
- Binding resolution is required before callback token consume.
- Binding resolution is required before presentation delivery target derivation.
- Topic rename updates display metadata only; it must not change canonical identity.
- Missing `messageThreadId` in an agent-topic flow fails safely or uses an explicit configured fallback. The adapter must not guess an agent from text or topic title.
- Tests must cover missing binding, disabled/archived binding, renamed topic, wrong-topic callback, duplicate binding conflict, and delivery target derivation from binding.
