# Action Tokens and Callbacks Guide

## Purpose

Action tokens protect external callback flows. They let an adapter render external actions while keeping the real action semantics inside core-controlled, consume-once state.

External callback payloads should be opaque. The adapter should verify and consume a presentation action token before converting a callback into a user intent or approval decision.

## Canonical callback flow

```text
core presentation action
-> adapter issues action token
-> adapter renders external button with opaque token payload
-> external user clicks button
-> adapter receives callback
-> adapter resolves external binding
-> adapter checks external permissions
-> adapter verifies token against expected context
-> adapter consumes token exactly once
-> adapter maps callback to UserIntent
-> adapter submits UserIntent through createCoreInteractionHost
```

Verification alone is not enough. Side-effecting callbacks must consume the token.

## Core owns

Core owns:

- token issue semantics;
- token verification semantics;
- token consume-once semantics;
- token expiration semantics;
- token mismatch and replay denial semantics;
- public token serializers;
- token store contract and in-memory test store where exported.

Core does not own:

- provider callback endpoint;
- provider acknowledgement;
- external callback payload format;
- external user permission lookup;
- provider-specific button layout;
- delivery of callback response messages;
- production durable token store implementation unless provided externally behind public contracts.

## Adapter owns

The adapter owns:

- rendering action buttons;
- creating external callback payload envelopes;
- receiving external callbacks;
- parsing callback payloads;
- resolving external conversation/session binding;
- checking external permissions before token consume;
- verifying token context;
- consuming token;
- mapping verified callbacks into public core input;
- acknowledging provider callbacks;
- rendering safe callback failures.

## Opaque callback payloads

External callback payloads should contain only an opaque token reference and adapter-owned safe routing context if absolutely necessary.

Recommended minimal shape:

```text
hz:<tokenRef>
```

Forbidden callback payload contents:

- raw action body;
- execution request;
- approval object;
- document patch;
- workflow state;
- raw presentation item;
- serialized user intent;
- secret or credential;
- raw provider payload;
- mutable store key that grants authority by itself.

The callback payload is not authorization. It is only a pointer into core token verification and consume state.

## Permission-before-consume rule

External adapters should check external permissions before consuming a token.

Recommended order:

```text
parse callback token ref
-> resolve external binding and actor
-> evaluate external permission in that context
-> if denied: return safe denial without consuming token
-> verify token against expected core context
-> consume token
-> submit validated core input
```

This preserves token availability when an unauthorized actor attempts a click. It also prevents an attacker from burning a valid token before the rightful actor uses it.

## Verify vs consume

Verification answers:

```text
is this token structurally valid, unexpired, and compatible with expected context?
```

Consumption answers:

```text
has this token now been used exactly once for a side-effecting callback?
```

Adapters must not treat verify success as final acceptance for side effects. A replay can verify differently depending on implementation state, but consume-once is the decisive mutation.

## Expected verification context

Adapters should verify a token against the strongest available expected context.

Useful context dimensions:

- workspaceRef;
- agentRef;
- hostSessionRef;
- outboxRef;
- presentation item ref;
- action ref;
- approval ref;
- external binding ref;
- external conversation/topic coordinates;
- actor/principal context where supported.

If token context mismatches the external binding or expected action, deny safely and do not submit a user intent.

## Replay handling

Replay must be safe.

A repeated callback after successful consume should not dispatch a second action.

Safe replay outcomes:

- provider callback acknowledgement with no-op message;
- safe “already handled” user response;
- safe logged denial;
- public failure envelope.

Unsafe replay outcomes:

- duplicate dispatch;
- duplicate approval;
- duplicate document mutation;
- duplicate external delivery that implies acceptance;
- raw error or stack trace leak.

## Expiration handling

Expired tokens should fail safely.

The adapter may render a safe message such as:

```text
This action is no longer available. Refresh the status card and try again.
```

Do not reveal token internals, expiry calculation details, store records, or raw verifier errors to external users.

## Binding mismatch handling

A callback must be denied if it arrives from the wrong external binding context.

Examples:

- button from workspace A clicked in workspace B;
- token issued for agent topic A clicked from agent topic B;
- approval token from one conversation replayed in another;
- token generated for one outbox item used for another;
- token copied between tenants.

In these cases, deny safely and do not consume unless core token semantics explicitly require recording the failed attempt. The default adapter rule is no consume on external permission/binding denial.

## Callback acknowledgement

Provider callback acknowledgement is adapter-owned.

For example, a Telegram adapter may need to acknowledge callback queries quickly. Core should not own that acknowledgement.

Recommended split:

- adapter parses and validates enough to acknowledge provider callback safely;
- adapter performs permission/token/core flow;
- adapter renders follow-up message, edit, or ephemeral response through external delivery APIs;
- core sees only public callback intent after verify/consume.

## Approval callbacks

Approval buttons are callback flows.

Recommended approval action flow:

```text
approval presentation item
-> adapter renders approve/reject buttons
-> each button carries opaque token ref
-> callback resolves binding and actor
-> permission check for approval action
-> verify token against approval/action/workspace/agent context
-> consume token
-> submit approval UserIntent
```

Adapters must not resolve approvals directly from raw button payloads without token gating.

## OpenClaw Telegram reference

For OpenClaw Telegram:

- callback data should be `hz:<tokenRef>`;
- raw Telegram callback query stays outside core;
- `channelId + chatId + messageThreadId` should resolve topic binding;
- actor permissions should be checked in the OpenClaw/Telegram context;
- unauthorized click should not consume the token;
- valid click should consume exactly once;
- replay should not dispatch twice;
- provider acknowledgement remains OpenClaw/Telegram adapter behavior.

## Safe callback failure codes

Adapters should define safe failure codes such as:

- `callback_malformed`;
- `callback_binding_missing`;
- `callback_binding_mismatch`;
- `callback_permission_denied`;
- `callback_token_missing`;
- `callback_token_expired`;
- `callback_token_mismatch`;
- `callback_token_consumed`;
- `callback_dispatch_failed`.

Safe messages should be user-facing or operator-facing without leaking raw payloads.

## Anti-patterns

Avoid:

- embedding full action JSON in callback payload;
- trusting callback payload as authorization;
- consuming token before permission check;
- submitting user intent before token consume;
- ignoring workspace/agent/topic mismatch;
- letting unauthorized clicks burn tokens;
- allowing replay to dispatch twice;
- leaking token store records in logs;
- returning raw verifier errors to external users;
- importing private core token internals.

## Unit test checklist

Callback tests should cover:

- valid token payload parses;
- malformed callback fails safely;
- missing binding fails safely;
- unauthorized actor does not consume token;
- valid token verifies;
- valid token consumes once;
- replay fails safely and does not dispatch twice;
- expired token fails safely;
- wrong workspace fails safely;
- wrong agent/topic fails safely;
- wrong action fails safely;
- token consume failure prevents user intent submission;
- raw provider payload does not leak;
- callback errors are safe public DTOs.

## Integration test checklist

Integration tests should cover:

- presentation item rendered with tokenized button;
- fake external callback triggers token verify/consume;
- valid callback submits expected user intent;
- replay callback produces no duplicate action;
- unauthorized callback leaves token available;
- approval approve/reject callbacks resolve exactly once;
- provider delivery/edit/ack remains adapter-owned.

## Implementation checklist

Before merging callback handling, verify:

- callback payload is opaque;
- permission check happens before consume;
- verify uses expected context;
- consume happens exactly once before side-effecting intent;
- replay is safe;
- expired/mismatch/malformed failures are safe;
- no raw callback payload enters core values;
- no private core imports are used;
- package-local tests run in CI.
