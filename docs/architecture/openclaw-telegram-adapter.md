# OpenClaw Telegram adapter architecture

## Target flow

```text
Telegram user
-> OpenClaw Telegram channel edge
-> normalized OpenClaw Telegram event
-> hazeteam-openclaw adapter
-> hazeteam-core createCoreInteractionHost
-> AgentControlHost bridge over OpenClaw runtime
-> core presentation outbox/action tokens
-> OpenClaw Telegram delivery
-> Telegram forum topic
```

The adapter is responsible for all OpenClaw/Telegram-specific behavior. Core receives only safe public refs, safe public inputs, and public envelopes.

## Deployment model

The reference deployment uses:

- one bot configured by OpenClaw;
- one Telegram forum/supergroup per workspace or environment where practical;
- one forum topic per agent surface;
- optional development multiplexing only when binding keys disambiguate workspace and agent safely.

A Telegram topic is a UI surface. It is not core identity by itself.

## Topic binding

Canonical binding key:

```text
channelId + chatId + messageThreadId
```

Canonical binding value:

```text
workspaceRef + agentRef + hostSessionRef
```

A binding record may also carry `bindingRef`, status, safe display metadata, home message refs, timestamps, and migration metadata. Topic name is display-only. It may be stored for UI, but it must not be used as canonical identity or routing authority.

Delivery target must be derived from binding state. Do not route delivery from untrusted presentation metadata, message text, topic title, or callback payload contents.

## Agent topic model

Each agent surface may have a dedicated topic, for example:

- Router;
- Coder;
- Reviewer;
- Planner;
- Approval/control;
- Workspace status.

Native bot commands should stay small and global. Topic-aware behavior belongs in the adapter command router.

## Topic-aware `/help`

`/help` resolves through topic binding:

```text
/help + channelId + chatId + messageThreadId
-> topic binding
-> workspaceRef + agentRef
-> adapter command/help descriptor
-> topic-specific help card
```

`/help` in the Coder topic can render different content than `/help` in the Reviewer topic. If the topic is unknown, the adapter should render setup guidance or a safe fallback, not guess an agent from text or topic title.

## Inbound message flow

```text
Telegram user sends message in forum topic
-> OpenClaw receives raw Telegram update
-> OpenClaw exposes normalized channel event or adapter normalizes it
-> adapter derives inbound idempotency key
-> adapter resolves channelId + chatId + messageThreadId binding
-> adapter maps actor/text/attachments into safe refs and payloads
-> adapter submits through createCoreInteractionHost
-> core dispatches through AgentControlHost bridge
-> OpenClaw runtime bridge returns safe result
-> core exposes presentation outbox output when applicable
-> adapter delivery pump renders and sends response to the same trusted topic or configured binding target
```

Raw Telegram updates and raw OpenClaw channel objects must not enter core values.

## Delivery flow

```text
core.listPendingPresentations
-> core.claimPresentation
-> adapter resolves topic binding
-> adapter renders Telegram/OpenClaw delivery request
-> adapter sends through OpenClaw Telegram channel API
-> adapter stores safe external message ref
-> core.markPresentationDelivered
```

Failure path:

```text
render or external delivery failure
-> adapter creates safe delivery error
-> core.markPresentationFailed
-> adapter logs safe detailsRef/correlationId
```

Button payloads are opaque. The canonical shape is:

```text
hz:<tokenRef>
```

Do not embed raw action JSON, approval objects, tool payloads, document patches, user intents, secrets, or provider payloads in callback data.

## Callback flow

```text
Telegram inline button click
-> OpenClaw callback event
-> adapter parses callback payload such as hz:<tokenRef>
-> adapter resolves channel/topic binding
-> adapter maps actor and checks permission in OpenClaw/Telegram context
-> if denied: safe denial, no token consume by default
-> adapter verifies action token against expected workspace/outbox/action/agent context
-> adapter consumes token exactly once
-> adapter maps verified callback to UserIntent
-> adapter submits through createCoreInteractionHost
-> adapter acknowledges callback and renders safe follow-up/update
```

Permission-before-consume is mandatory. Replay must not dispatch twice.

## Runtime bridge

The OpenClaw runtime bridge sits behind `AgentControlHost` or another public core port:

```text
validated core action
-> AgentControlHost dispatch
-> adapter-owned OpenClaw runtime bridge
-> OpenClaw runtime/tool execution
-> safe result
-> public core envelope
```

The bridge must convert runtime failures into safe results and must not expose raw OpenClaw runtime objects, tool payloads, logs, credentials, deployment handles, or stack traces.

## Approval bridge

Approval cards should route to the originating agent topic where possible, then to a configured approval/control topic, then to a safe fallback if policy allows.

Approve/reject actions are tokenized:

```text
approval card
-> approve/reject button with hz:<tokenRef>
-> callback binding resolution
-> permission check
-> token verify
-> token consume
-> approval intent/resolution through public flow
```

Raw approval/tool payloads must not be rendered or put into callback data unless explicitly transformed into a safe public summary.

## Fake-first before real wiring

Implementation order is fake-first:

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
11. fake E2E and no-leak matrix;
12. real OpenClaw channel event adapter;
13. real delivery adapter;
14. real runtime/approval bridges;
15. durable stores and production hardening;
16. secret-gated real Telegram/OpenClaw smoke.

Real SDK/API wiring must not precede fake E2E and no-leak coverage.
