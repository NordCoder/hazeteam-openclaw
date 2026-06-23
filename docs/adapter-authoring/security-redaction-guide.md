# Security and Redaction Guide

## Purpose

External adapters sit on the boundary between trusted core semantics and untrusted or semi-trusted external systems. They receive raw provider payloads, hold credentials, route user actions, and render core output to external channels.

This guide defines mandatory security and redaction rules for adapter and extension packages.

## Core security principle

Core-facing values must be safe by construction.

Adapters may receive unsafe inputs and hold sensitive deployment state, but they must translate those into bounded, pathless, public-safe refs, DTOs, envelopes, and summaries before calling core or rendering core-derived output externally.

## Never expose list

Adapters must never expose these through core values, public envelopes, external messages, public logs, health output, or metrics labels:

- bot tokens;
- API keys;
- OAuth tokens;
- session cookies;
- database connection strings;
- raw provider payloads;
- raw callback bodies;
- SDK client objects;
- database/cache client objects;
- host filesystem roots;
- absolute local paths;
- mutable store internals;
- raw runtime objects;
- stack traces;
- private execution context;
- raw approval/tool payloads unless explicitly safe;
- unbounded user content in diagnostic fields;
- provider response bodies that may include secrets.

When debugging requires raw payload retention, keep it in a protected adapter-owned debug store and expose only an opaque `detailsRef` or `rawDebugRef`.

## Trust boundary

The external provider boundary is untrusted by default.

Treat these as untrusted until normalized and validated:

- inbound messages;
- command text;
- callback payloads;
- user ids;
- display names;
- channel names;
- topic names;
- attachment metadata;
- webhook headers;
- provider timestamps;
- provider error messages;
- external account role payloads.

Validation should happen before data becomes core-facing input.

## Safe refs

Safe refs should be:

- bounded in length;
- pathless;
- deterministic;
- printable/log-safe;
- stable enough for correlation;
- free of secrets;
- free of raw JSON payloads;
- free of host-specific layout.

Good refs:

```text
workspace:acme
agent:coder
telegram-chat:-1001234567890
telegram-topic:42
openclaw-channel:prod-router
outbox:01J...
token:01J...
```

Bad refs:

```text
/Users/alice/.config/hazeteam/private.json
postgres://user:password@host/db
{"update_id":123,"message":{...}}
BotToken:123456:secret
```

## Raw payload handling

Raw payloads should be handled explicitly.

Recommended policy:

1. Receive raw payload at adapter transport edge.
2. Validate structural shape.
3. Extract only safe routing, actor, text, attachment refs, and correlation fields.
4. Store raw payload only if required by a protected debug/audit policy.
5. Pass only normalized safe DTOs toward core.
6. Drop or redact unsafe fields before logging.

Do not put raw payloads into generic `metadata` fields.

## Secrets handling

Secrets belong to deployment configuration and external clients, not core values.

Adapters should:

- load secrets outside core;
- pass secrets only to external SDK/client constructors;
- never serialize secrets;
- never include secrets in readiness output;
- never include secrets in errors;
- redact secrets in logs;
- avoid storing secrets in adapter-owned domain records unless required and protected;
- rotate secrets through deployment mechanisms.

Core should not receive bot tokens, API keys, connection strings, or credential handles.

## Callback security

Callback payloads are attacker-controlled input.

Secure callback flow:

```text
receive callback
-> parse opaque token envelope
-> resolve external binding and actor
-> check external permission
-> verify token against expected core context
-> consume token exactly once
-> submit validated intent
```

Security rules:

- callback payload must not contain raw action body;
- permission check happens before token consume;
- verify must include expected context where available;
- consume must happen before side-effecting intent submission;
- replay must not dispatch twice;
- wrong workspace/agent/topic must fail safely;
- malformed payload must fail safely;
- unauthorized actor must not burn token by default.

## Token handling

Action token ids are bearer-like public handles. Treat them as sensitive enough to avoid unnecessary logging.

Allowed:

- include token id in external button payload when required;
- log a redacted token ref or hash if needed;
- store token through public token store contract;
- verify and consume through public core operations.

Forbidden:

- embedding full token record in callback payload;
- using token id as metric label;
- exposing token store internals;
- accepting token without context verification;
- treating token parse as authorization.

## Permission model

External permission checks and core policy checks solve different problems.

External permission checks answer:

```text
may this external actor in this external context invoke this adapter callback?
```

Core policy checks answer:

```text
may this core action proceed under core policy/workflow semantics?
```

Adapters usually need both. Do not replace one with the other.

## Redaction rules

Redaction should preserve operational value while removing sensitive content.

Prefer:

- stable error codes;
- safe messages;
- correlation ids;
- detailsRef;
- component names;
- status categories;
- retryable flags;
- bounded public refs.

Avoid:

- raw exception messages from providers;
- stack traces;
- request/response bodies;
- command payloads in diagnostic fields;
- unbounded user text;
- paths or connection strings;
- serialized SDK objects.

## Safe error design

Adapter safe errors should include:

- `code`;
- `safeMessage`;
- `retryable` where relevant;
- `correlationId` where relevant;
- `detailsRef` where deeper diagnostics exist;
- optional safe component/check name.

They should not include:

- raw `Error` object;
- stack;
- `cause` if it contains raw provider data;
- provider request body;
- provider response body;
- token values;
- connection string;
- storage path.

## Logging policy

Logs should be safe by default.

Recommended event fields:

- operation;
- component;
- status;
- safe code;
- safe message;
- correlation id;
- workspaceRef where safe;
- agentRef where safe;
- bindingRef where safe;
- duration;
- retryable flag;
- detailsRef.

Avoid high-cardinality or sensitive fields:

- raw user id as metric label;
- token id as metric label;
- message text;
- raw provider event;
- raw callback payload;
- stack trace in public logs;
- external file names if sensitive.

## Health and readiness redaction

Readiness/health output should not reveal deployment secrets or topology.

Do not expose:

- exact database URL;
- secret names if revealing infrastructure;
- local filesystem paths;
- raw provider endpoint responses;
- raw exception text;
- webhook secret;
- bot token presence details beyond safe configured/missing status.

Use safe messages:

```text
telegram_delivery_not_configured
runtime_bridge_degraded
schema_migration_required
permission_policy_missing
```

## Attachment security

Attachments are risky.

Adapters should:

- store or fetch attachments outside core;
- pass only safe attachment refs and metadata;
- enforce size/type limits;
- avoid exposing signed URLs;
- avoid storing local file paths in public output;
- run content processing in adapter/product packages, not generic core;
- submit only safe derived outputs to core.

## Multi-tenant safety

Adapters serving multiple workspaces or tenants must prevent cross-tenant leakage.

Rules:

- include workspace/tenant context in binding keys;
- verify token workspace context;
- verify external topic/channel binding;
- avoid global caches without workspace scoping;
- avoid logs that mix tenant payloads;
- deny callbacks from wrong workspace/topic;
- design metrics labels without tenant-sensitive unbounded data.

## OpenClaw Telegram security reference

For OpenClaw Telegram:

- OpenClaw owns bot token and raw Telegram update;
- adapter receives normalized OpenClaw channel events where possible;
- raw Telegram update must not enter core;
- callback data should be opaque, e.g. `hz:<tokenRef>`;
- topic binding must be verified before action token consume;
- actor permission must be checked before consume;
- Telegram topic name is display-only;
- delivery target must come from binding state;
- OpenClaw runtime/tool payloads stay outside core values.

## Static security tests

Every adapter repository should add static tests for:

- no private core imports;
- no raw update public field names;
- no token/secret config terms in public contracts;
- no provider SDK imports in core package code;
- no raw payload fields in serialized DTOs;
- callback payload shape is tokenized;
- package-local tests included in CI.

## Runtime security tests

Adapter tests should cover:

- unauthorized callback does not consume token;
- replay does not dispatch twice;
- wrong workspace/agent/topic fails safely;
- malformed callback fails safely;
- raw provider error is redacted;
- delivery failure is safe;
- readiness output has no secrets;
- logs contain no raw payloads;
- attachment refs do not expose paths or signed URLs.

## Implementation checklist

Before merging adapter security-sensitive code, verify:

- raw payload boundary is explicit;
- secrets remain outside core;
- callback payload is opaque;
- permission-before-consume is enforced;
- verify and consume context is strong enough;
- failures are safe;
- logs and health output are redacted;
- no private core imports are used;
- tests cover replay, mismatch, unauthorized, and redaction cases;
- CI runs the security/static tests.
