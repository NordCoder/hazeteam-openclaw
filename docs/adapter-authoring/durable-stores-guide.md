# Durable Stores Guide

## Purpose

Durable stores are production implementations of public core store contracts or adapter-owned integration state.

`hazeteam-core` may export store contracts and in-memory test stores, but production durability belongs to external adapter, infrastructure, or deployment packages.

## Core principle

Core owns store semantics. External packages own store implementation.

```text
public core store contract
-> adapter/deployment durable implementation
-> database/cache/object storage/OpenClaw storage API
```

A durable implementation must preserve the public contract exactly. It must not change lifecycle semantics, leak private backing objects, or introduce provider-specific behavior into core.

## Store categories

### Core contract stores

These are stores whose semantics are defined by `hazeteam-core` and injected into public facades or operation modules.

Common examples:

- host session binding store;
- presentation outbox store;
- presentation action token store;
- approval request store where exported;
- workflow store or workflow status reader;
- runtime queue or runtime status reader;
- event/audit store;
- health/status reader;
- document or execution result stores where public contracts require them.

Adapters may implement these contracts durably outside core.

### Adapter-owned stores

These stores are not core semantics. They belong to the adapter package.

Examples:

- external channel registry;
- Telegram topic binding store;
- Slack channel/thread binding store;
- delivery attempt store;
- external message ref store;
- inbound idempotency store;
- callback replay store;
- provider rate-limit state;
- adapter readiness snapshot;
- adapter permission cache;
- OpenClaw runtime binding state.

Adapter-owned stores may reference public core refs, but they should not expose raw provider data into core-facing values.

### Product/domain stores

Product packages may define their own durable state.

Examples:

- LifeOS agent configuration;
- CRM workflow state;
- finance/reconciliation product state;
- domain-specific command registry;
- user preferences.

Product/domain state should not be stored inside generic core adapter records unless explicitly modeled by public core contracts.

## In-memory store rule

In-memory stores are acceptable for:

- unit tests;
- deterministic acceptance tests;
- local demos;
- fake adapter simulators;
- contract examples;
- non-production smoke tests.

In-memory stores are not production durability.

A production adapter must explicitly decide which store implementations are durable and what restart guarantees they provide.

## Required production durability surfaces

A serious external adapter usually needs durable implementations for:

1. Session binding.
2. Presentation outbox.
3. Action tokens.
4. Adapter external binding state.
5. Delivery attempt state.
6. Inbound idempotency.
7. Callback replay/idempotency.
8. Approval routing state where approval spans restarts.
9. Runtime/job state when runtime processing crosses process boundaries.
10. Readiness or migration state where deployment requires it.

The exact list depends on product scope, but token consume-once and outbox delivery state are almost never safe as volatile state in production.

## Atomicity expectations

Durable stores must preserve atomicity where the public contract requires it.

Critical examples:

### Outbox claim

Claiming a presentation outbox item must prevent duplicate workers from delivering the same item concurrently.

A durable implementation should support an atomic transition such as:

```text
pending -> delivering(claimRef, claimedAt, claimOwner)
```

Only one worker should win the claim.

### Token consume

Consuming an action token must be consume-once.

A durable implementation should support an atomic transition such as:

```text
active/unconsumed -> consumed(consumedAt, consumedByRef)
```

A replay must not dispatch a second side effect.

### Idempotency key insert

Inbound idempotency should support unique insert/check semantics.

A durable implementation should distinguish:

- first processing attempt;
- already processing;
- already processed;
- failed/retryable;
- expired record if supported.

## Restart guarantees

A production store should document restart behavior.

Questions to answer:

- What happens to an item claimed before process crash?
- How are stale claims detected?
- Can an external delivery be retried safely?
- Can a token be consumed twice after restart?
- Are idempotency records persisted across deployment restarts?
- Are callback replays denied after restart?
- Can workflow/runtime state be inspected after restart?
- Is schema version compatible with the running adapter version?

If a store cannot answer these questions, it is not production-ready.

## Safe serialization boundary

Durable stores should store enough operational data to recover and diagnose, but public output must remain safe.

Store internals may contain backend-specific metadata. Public serializers must not expose:

- database connection strings;
- table names if they reveal deployment internals;
- host filesystem paths;
- raw provider payloads;
- stack traces;
- SDK response objects;
- credentials;
- locks or transaction handles;
- internal migration state not intended for public display.

Expose safe refs, safe status, timestamps, stable codes, correlation ids, and opaque details refs.

## Backend selection

Durable implementations may use different backends.

Common options:

- SQLite for single-node local deployments;
- Postgres for multi-process production deployments;
- Redis for idempotency or short-lived coordination where persistence requirements are understood;
- OpenClaw native storage API when integrating with OpenClaw;
- object storage for append-only logs or artifacts;
- provider-specific state APIs when they provide sufficient consistency.

Backend choice is adapter/deployment-owned. Core should not import database drivers or external SDKs for these implementations.

## Schema and migrations

Durable packages should define explicit schema/version policy.

Recommended metadata:

- schema version;
- package version or compatible core version;
- migration applied timestamps;
- migration status;
- destructive migration flag;
- backup requirement flag;
- readiness status.

Migrations should be safe to run as part of adapter deployment lifecycle, not hidden inside core constructors.

## Compatibility with core versions

Durable implementations are coupled to public store contracts.

When upgrading `hazeteam-core`, adapter packages should:

1. run public API snapshot tests;
2. run store contract tests;
3. run restart/replay simulations;
4. check serialized output safety;
5. verify migration readiness;
6. update compatibility docs.

A change to a private core implementation file should not affect an adapter. A change to a public store contract may require adapter migration.

## Adapter-owned topic binding example

For an OpenClaw Telegram adapter, topic binding is adapter-owned durable state.

A typical record may include:

- bindingRef;
- workspaceRef;
- agentRef;
- hostSessionRef;
- channelId;
- chatId;
- messageThreadId;
- topicName display metadata;
- homeMessageRef;
- status;
- timestamps;
- migration metadata.

The adapter may use this record to derive delivery targets and resolve inbound messages. Core should receive only safe session/workspace/agent refs and public inbound values.

## Delivery attempt example

A delivery attempt record may include:

- deliveryRef;
- outboxRef;
- claimRef;
- attemptNumber;
- external target ref;
- external message ref on success;
- safe error code on failure;
- retryable flag;
- correlationId;
- timestamps;
- detailsRef.

Do not store raw provider error objects or response payloads in public fields.

## Store test matrix

Durable store packages should test:

- create/read/update/delete where applicable;
- atomic claim conflict;
- token consume conflict;
- duplicate idempotency insert;
- stale claim recovery;
- restart reload;
- serialization safety;
- schema migration from previous version;
- missing/invalid schema behavior;
- concurrent worker behavior where backend supports it;
- safe failure on backend unavailability.

## Production checklist

Before using a durable store in production, verify:

- public core contract is implemented without semantic changes;
- store is injected explicitly;
- no hidden global singleton is required;
- atomicity-sensitive operations are atomic enough for deployment mode;
- restart behavior is documented and tested;
- migration and backup policy exists;
- readiness checks cover backend availability and schema compatibility;
- public serializers do not expose backend internals;
- tests run in adapter package CI.
