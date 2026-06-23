# Inbound Event Mapping Guide

## Purpose

Inbound event mapping is the adapter-owned process of translating an external event into a safe public core input.

The adapter receives raw external reality. Core receives only normalized, validated, bounded, public-safe values through public contracts and the composed facade.

## Canonical flow

```text
raw external payload
-> adapter-owned normalized event
-> external actor and conversation normalization
-> idempotency key derivation
-> session binding resolution
-> HostInboundAction or UserIntent construction
-> public core validation/facade call
-> public CoreApiEnvelope result
```

The mapper is a trust boundary. It must remove raw provider payloads, secrets, SDK objects, transport-specific runtime handles, and unbounded metadata before calling core.

## Raw payload boundary

Raw external payloads are adapter-owned.

Examples of raw payloads:

- Telegram update object;
- OpenClaw channel event object;
- Slack event callback;
- Discord interaction;
- webhook request body;
- email MIME message;
- browser request context.

These must not become core values. If raw data is needed for support or debugging, store it outside core and pass only an opaque `rawDebugRef` or equivalent safe details ref.

## Normalized adapter event

A normalized adapter event should be an adapter-owned DTO. It should contain only the safe subset of provider data required for routing, validation, idempotency, and core submission.

Typical fields:

- eventRef;
- eventType;
- external channel ref;
- external conversation/thread/topic ref;
- external message or callback ref;
- actor ref;
- text or command payload where appropriate;
- attachment refs, not bytes;
- occurredAt;
- correlationId;
- rawDebugRef if needed.

The normalized event may still be transport-specific at the adapter package level. It should not be passed into core wholesale unless core explicitly exposes a matching public contract.

## Actor mapping

External actors must be mapped into bounded core-facing actor or principal refs.

The adapter owns:

- provider user id lookup;
- display name normalization;
- organization/team role lookup;
- admin/member checks;
- actor permission context;
- external account linking.

Core-facing actor values should contain safe refs and safe display metadata only.

Do not pass:

- raw provider user object;
- OAuth token;
- session cookie;
- phone/email unless explicitly safe and required;
- role payload from external provider;
- mutable account object.

## Conversation and binding mapping

Inbound events must resolve external conversation identity to core workspace/agent/session context before meaningful dispatch.

Recommended order:

```text
normalize event coordinates
-> derive adapter binding lookup key
-> look up binding
-> validate binding status
-> derive workspaceRef, agentRef, hostSessionRef
-> construct core input
```

If binding is missing, disabled, archived, ambiguous, or mismatched, return or render a safe adapter error. Do not guess silently.

## Command parsing boundary

Command parsing has two layers:

1. Adapter-level parsing of external syntax.
2. Core-level validation of user intent or host inbound action.

The adapter may parse transport conventions such as:

- slash commands;
- button callback envelopes;
- replies;
- mentions;
- topic-scoped commands;
- attachments;
- message edits.

The adapter must not treat parsed external text as trusted execution input. It must map the parsed command into a public core input and let core validation/policy/runtime semantics apply.

## Attachment mapping

Attachments should be represented as refs and safe metadata.

Allowed attachment metadata:

- attachmentRef;
- kind;
- mimeType;
- fileName if safe;
- sizeBytes;
- external provider file ref if safe and bounded;
- safe detailsRef.

Forbidden:

- raw file bytes in core metadata;
- local filesystem paths;
- signed URLs that grant access;
- provider SDK file objects;
- unbounded OCR/text extraction payloads;
- secrets embedded in metadata.

Adapter or product packages may process attachments outside core and submit only safe derived results through public workflows.

## Idempotency

A production adapter should derive idempotency keys before side effects.

Typical key inputs:

- adapter deployment ref;
- external channel id;
- external conversation id;
- external thread/topic id;
- external message id;
- callback query id;
- delivery claim ref;
- attempt number.

Idempotency state is adapter-owned unless core exports a relevant public runtime/idempotency contract for the specific operation.

Recommended inbound sequence:

```text
normalize event
-> derive idempotency key
-> check idempotency store
-> resolve binding
-> submit core input
-> record safe result ref
```

Do not use non-deterministic fields such as display names or timestamps as the primary idempotency key.

## Correlation IDs

Every adapter flow should propagate a correlation id.

Recommended sources:

- existing external request id;
- provider update id;
- generated adapter operation id;
- core operation correlation id;
- trace id from deployment context.

Correlation ids must be safe to log and should not contain secrets, raw payloads, or filesystem paths.

## Mapping to HostInboundAction

Use `HostInboundAction` for host/session/dispatch flows where the adapter has resolved binding and wants core to dispatch through `AgentControlHost`.

The adapter should include:

- workspaceRef;
- agentRef;
- hostSessionRef or binding-derived session context;
- actor/principal ref;
- normalized intent/action payload;
- correlation id;
- safe metadata.

Always use public validators or facade methods where exported. Do not construct private runtime jobs directly from external events.

## Mapping to UserIntent

Use `UserIntent` for presentation/action callback or user command flows where public presentation parsing/validation is the intended boundary.

External callback data should first be token-gated. Do not map a raw button payload directly to a user intent.

Safe callback mapping order:

```text
parse opaque callback envelope
-> resolve binding
-> permission check
-> verify token
-> consume token
-> construct UserIntent
-> submitUserIntent
```

## Safe failure handling

Inbound mapping failures are normal adapter outcomes.

Examples:

- missing binding;
- disabled topic;
- unknown workspace;
- unknown agent;
- malformed command;
- unsupported attachment;
- unauthorized actor;
- duplicate event;
- stale callback;
- binding mismatch.

Return or render safe adapter errors. Include safe code, safe message, retryability where applicable, correlation id, and optional detailsRef.

Do not expose raw provider payloads, stack traces, tokens, or internal store details.

## OpenClaw Telegram reference

For OpenClaw Telegram, a normalized inbound message event can include:

- channelRef;
- telegram chat id;
- telegram messageThreadId when present;
- telegram message id;
- actor ref;
- text;
- attachment refs;
- occurredAt;
- correlationId;
- rawDebugRef.

The adapter should resolve:

```text
channelId + chatId + messageThreadId
-> topic binding
-> workspaceRef + agentRef + hostSessionRef
```

If messageThreadId is required and missing, reject safely or use an explicit configured fallback. Do not infer an agent from topic display names alone.

## Anti-patterns

Avoid:

- passing raw external events into core metadata;
- using display text as canonical routing identity;
- deriving workspace from a topic name without a binding store;
- bypassing session binding;
- submitting direct execution requests from external commands;
- converting provider errors into thrown facade errors;
- storing raw attachments inside core values;
- consuming callback tokens before permission checks;
- mapping callbacks to user intents before verify/consume;
- importing private core validators from `src/**`.

## Unit test checklist

Inbound mapper tests should cover:

- valid message maps to expected core input;
- valid command maps to expected core input;
- missing binding fails safely;
- disabled binding fails safely;
- missing required thread/topic fails safely;
- malformed command fails safely;
- unsupported attachment fails safely;
- actor ref is bounded and safe;
- idempotency key is deterministic;
- correlation id is preserved;
- raw provider payload does not appear in mapped core input;
- private core imports are absent.

## Integration test checklist

Adapter integration tests should cover:

- fake external event -> binding -> `submitHostAction`;
- duplicate fake event -> idempotency handling;
- fake command -> `submitUserIntent` where appropriate;
- failed core facade envelope -> safe external response;
- fake runtime bridge success;
- fake runtime bridge safe failure;
- no direct runtime/job mutation outside public facade.

## Implementation checklist

Before merging inbound mapping code, verify:

- raw payload boundary is explicit;
- normalized event DTO is adapter-owned;
- actor mapping is safe;
- session binding resolution happens before dispatch;
- idempotency is deterministic where needed;
- correlation ids are propagated;
- public core validators/facade are used;
- no private core imports are used;
- failures are safe and serializable;
- package-local tests run in CI.
