# Presentation Outbox Delivery Guide

## Purpose

The presentation outbox is the core-owned lifecycle for messages, cards, prompts, approval surfaces, and other presentation items that must be delivered through an external adapter.

Adapters own real delivery. Core owns the presentation outbox state transitions and action-token lifecycle.

## Canonical delivery flow

```text
core produces presentation item
-> adapter lists pending items
-> adapter claims one item for delivery
-> adapter renders external message
-> adapter calls external delivery API
-> adapter marks delivered with safe external message ref
or
-> adapter marks failed with safe delivery error
```

The adapter must not skip the claim step. Claiming is how core prevents duplicate delivery and records deterministic delivery state.

## Core owns

Core owns:

- presentation outbox item model;
- pending/delivering/sent/failed lifecycle;
- claim semantics;
- delivery result serialization;
- action-token issue/verify/consume state;
- safe public DTOs and envelopes;
- in-memory test store where exported.

Core does not own:

- external rendering;
- provider message formatting;
- Telegram/Slack/email/web delivery APIs;
- network retries;
- rate limits;
- external message ids;
- callback endpoints;
- delivery worker scheduling;
- production durable store implementations unless provided externally behind public contracts.

## Adapter owns

The adapter owns:

- selecting delivery targets from adapter binding state;
- rendering presentation payloads to external UI;
- issuing action tokens for external actions when required;
- mapping token refs into external callback payloads;
- invoking external delivery APIs;
- handling provider delivery errors;
- recording adapter-owned delivery attempts and idempotency if needed;
- marking core delivery state delivered or failed;
- scheduling delivery pumps outside core.

## Delivery target derivation

Delivery target must be derived from trusted adapter-owned binding state, not from untrusted metadata.

Recommended flow:

```text
PresentationOutboxItem workspace/agent/session context
-> adapter binding lookup
-> external channel/conversation/topic target
-> external delivery request
```

Do not let user-provided presentation metadata redirect a core item to an arbitrary external channel.

## Claim semantics

Adapters should claim a presentation item before sending it externally.

Claiming should establish:

- item is being delivered;
- claim owner or worker id;
- claim timestamp;
- attempt/correlation context;
- deterministic state for retries or failure reporting.

If claim fails because another worker already claimed the item, the adapter should skip the item and continue safely.

## Rendering

Rendering is adapter-owned. Core presentation payloads should be converted into external transport-specific content outside core.

Examples:

- Telegram markdown text;
- Slack blocks;
- Discord embeds;
- email HTML/text;
- web dashboard card;
- CLI text output.

Rendering must be safe:

- escape provider markup where needed;
- enforce provider length limits;
- redact unsafe metadata;
- use tokenized buttons;
- avoid raw document content unless the payload is explicitly safe;
- avoid raw internal refs in user-visible text unless they are intended public refs.

## Action buttons

External action buttons must not carry raw action payloads.

Recommended model:

```text
core presentation action
-> adapter issues presentation action token
-> external button callback payload contains only opaque token envelope
```

For Telegram-style adapters, a common shape is:

```text
hz:<tokenRef>
```

The adapter may include adapter-owned safe callback context if needed, but it must not include raw execution actions, approval internals, document payloads, or mutable state.

## Mark delivered

After successful external delivery, the adapter should mark the item delivered through the public facade/store operation.

Delivery success metadata should be safe:

- deliveryRef;
- external message ref;
- external channel/conversation/topic ref where safe;
- deliveredAt;
- correlationId;
- attempt number if adapter-owned;
- safe detailsRef if needed.

Do not store raw provider message objects, SDK response objects, credentials, or full HTTP responses in core delivery state.

## Mark failed

After a delivery failure, the adapter should mark the item failed with a safe error.

Safe delivery failure should include:

- stable error code;
- safe message;
- retryable flag if modeled;
- correlation id;
- optional opaque detailsRef;
- attempt metadata where safe.

Forbidden:

- raw provider error object;
- stack trace;
- token or credential;
- raw request/response body;
- internal store handle;
- absolute path.

## Retry ownership

Core owns the outbox delivery state. The adapter owns external retry scheduling and provider-specific backoff unless core exposes a specific public retry operation for the lifecycle.

Recommended split:

- core: item state, claim state, delivered/failed result;
- adapter: worker scheduling, retry timers, transport backoff, dead-letter surfacing, provider rate-limit policy;
- durable store: atomic claim and restart recovery where required.

Do not implement hidden retry loops inside core constructors.

## Stale claims

Production adapters should define stale claim recovery.

A stale claim may occur when:

- worker process crashes after claim;
- external API hangs;
- deployment restarts mid-delivery;
- provider rate limit delays delivery;
- network partition occurs.

Recovery policy is adapter/deployment-owned, but it must preserve core lifecycle semantics and avoid duplicate external delivery where possible.

## Idempotent delivery attempts

Adapters should record delivery attempt idempotency when duplicate external messages would be harmful.

A delivery attempt key may include:

```text
outboxRef + claimRef + attemptNumber
```

or provider-specific external idempotency keys if available.

Core delivery refs and adapter attempt refs should remain safe to log.

## Delivery pump shape

A delivery pump is an adapter-owned loop or scheduled job.

The recommended deterministic primitive is `drainOnce`:

```text
list pending presentations
-> for each allowed item:
   -> claim
   -> render
   -> deliver externally
   -> mark delivered/failed
-> return safe summary
```

Production scheduling of `drainOnce` belongs outside core and outside the pure renderer. It may live in adapter deployment code, OpenClaw runtime, cron, queue worker, or a service process.

## OpenClaw Telegram reference

For OpenClaw Telegram:

- delivery target should come from topic binding;
- `chatId` identifies the Telegram chat/supergroup;
- `messageThreadId` identifies the forum topic/agent surface;
- topic name is display-only;
- external delivery should use OpenClaw's Telegram channel API, not core;
- delivered result should store a safe external message ref;
- buttons should use opaque token payloads such as `hz:<tokenRef>`.

If a binding lacks `messageThreadId` for an agent-topic delivery, fail safely. Do not send agent-specific output to a general chat by accident.

## Safe rendering failures

Rendering can fail before external delivery.

Examples:

- unsupported presentation kind;
- message too long;
- unsupported button layout;
- missing binding;
- unsafe payload detected;
- missing permission context;
- missing required external target.

These should become safe delivery failures or adapter-safe errors. They should not leak internal payloads.

## Testing checklist

Delivery tests should cover:

- list pending items;
- claim pending item;
- skip already claimed item;
- render simple text;
- render action buttons with tokenized payloads;
- successful external fake delivery marks delivered;
- fake provider failure marks failed safely;
- missing binding fails safely;
- wrong topic target is rejected;
- delivery result is safe to serialize;
- raw provider error does not leak;
- duplicate drain does not duplicate sent item;
- stale claim policy is documented or tested when implemented.

## Implementation checklist

Before merging delivery code, verify:

- delivery target comes from binding state;
- claim happens before external send;
- delivered/failed state is marked after external attempt;
- external message refs are safe;
- failures use safe error codes/messages;
- raw provider responses are not stored in core values;
- button payloads are tokenized;
- delivery pump is adapter-owned, not hidden core behavior;
- package-local tests run in CI.
