# Reference OpenClaw Telegram State and Storage

## Purpose

This document defines the recommended state and storage model for an OpenClaw Telegram adapter built on `hazeteam-core`.

It separates:

- core-owned state semantics;
- adapter-owned integration state;
- OpenClaw-owned platform state;
- product/domain state;
- deployment/secrets state.

This is a reference blueprint for adapter repositories. It is not `hazeteam-core` runtime implementation.

## State ownership overview

```text
hazeteam-core state semantics
-> session binding, presentation outbox, action tokens, workflow/runtime/approval public contracts

OpenClaw Telegram adapter state
-> topic binding, delivery attempts, inbound idempotency, callback replay, external message refs, readiness

OpenClaw platform state
-> raw provider events, Telegram channel config, bot token, runtime objects, approval source, deployment handles

Product/domain state
-> LifeOS/OCA/product workflows, commands, domain configs, agent descriptors

Deployment state
-> environment variables, secrets, process lifecycle, schema migrations, backups
```

Each layer must expose only safe refs and DTOs to the layer above it.

## Core store surfaces

An OpenClaw Telegram adapter commonly needs durable implementations of public core store contracts.

### Host session binding store

Core-facing purpose:

```text
external conversation/session mapping
-> core host session context
```

Adapter use:

- resolve workspace/agent/session for inbound messages;
- reuse session for callbacks;
- correlate presentation output with external topic binding.

Production requirement:

- durable unless deployment is explicitly test/local only.

### Presentation outbox store

Core-facing purpose:

```text
core presentation item lifecycle
pending -> delivering -> sent/failed
```

Adapter use:

- list pending items;
- claim item;
- render and deliver externally;
- mark delivered or failed.

Production requirement:

- durable and claim-conflict safe.

### Presentation action token store

Core-facing purpose:

```text
action token issue -> verify -> consume once
```

Adapter use:

- issue tokens for Telegram inline buttons;
- verify callback token against expected context;
- consume exactly once before side-effecting intent.

Production requirement:

- durable and consume-conflict safe.

### Runtime/workflow/approval stores or readers

Depending on the final product, the adapter may inject public readers/stores for:

- runtime drain/status;
- workflow status;
- approval inspection;
- health/status;
- event/audit diagnostics.

Production requirement depends on whether these flows cross process boundaries or must survive restart.

## Adapter-owned stores

The OpenClaw Telegram adapter should define its own integration stores.

### Topic binding store

Purpose:

```text
channelId + chatId + messageThreadId
-> bindingRef + workspaceRef + agentRef + hostSessionRef
```

Recommended record fields:

- bindingRef;
- channelId;
- chatId;
- messageThreadId;
- topicName;
- isGeneralTopic;
- workspaceRef;
- agentRef;
- hostSessionRef;
- status;
- homeMessageRef;
- createdAt;
- updatedAt;
- disabledAt;
- archivedAt;
- safe migration metadata.

Required behavior:

- lookup by external coordinates;
- lookup by workspace/agent;
- create/upsert binding;
- update display metadata after topic rename;
- update home/pinned message ref;
- disable binding;
- archive binding;
- detect duplicate conflicts;
- serialize safe public snapshot.

Topic name is display metadata only.

### Inbound idempotency store

Purpose:

```text
prevent duplicate processing of external inbound events
```

Recommended key shapes:

```text
telegram-message:<channelId>:<chatId>:<messageThreadId>:<messageId>
telegram-callback:<channelId>:<chatId>:<messageThreadId>:<callbackQueryId>
```

Recommended record fields:

- idempotencyKey;
- eventRef;
- eventType;
- channelId;
- chatId;
- messageThreadId;
- bindingRef;
- status;
- resultRef;
- firstSeenAt;
- updatedAt;
- expiresAt;
- safe error code if failed.

Required behavior:

- first-seen insert;
- already-processing detection;
- already-processed detection;
- failed/retryable policy;
- expiry policy;
- safe serialization.

### Delivery attempt store

Purpose:

```text
track adapter-owned external delivery attempts
```

Recommended key shape:

```text
delivery:<outboxRef>:<claimRef>:<attemptNumber>
```

Recommended record fields:

- deliveryAttemptRef;
- outboxRef;
- claimRef;
- attemptNumber;
- bindingRef;
- channelId;
- chatId;
- messageThreadId;
- externalMessageRef on success;
- status;
- retryable;
- safe error code;
- detailsRef;
- correlationId;
- startedAt;
- completedAt.

Required behavior:

- record attempt start;
- record success;
- record failure;
- avoid duplicate external sends where possible;
- correlate with core mark delivered/failed;
- safe failure redaction.

### External message ref store

Purpose:

```text
remember external Telegram/OpenClaw message ids for edits, pins, replies, and diagnostics
```

Recommended record fields:

- externalMessageRef;
- bindingRef;
- deliveryRef;
- outboxRef;
- chatId;
- messageThreadId;
- messageId;
- kind;
- createdAt;
- updatedAt;
- safe display metadata.

Do not store raw provider response bodies.

### Home card store fields

Home card state may be part of topic binding or a separate store.

Recommended fields:

- bindingRef;
- homeMessageRef;
- pinnedAt;
- renderedVersion;
- lastRefreshAt;
- safe status;
- safe error code if refresh failed.

The adapter owns pin/edit behavior through OpenClaw Telegram delivery APIs.

### Callback replay store

If core action token consume is durable and context-strong, it may be enough for side-effect prevention. Some adapters may still keep adapter-owned callback replay records for provider-level acknowledgement and diagnostics.

Recommended fields:

- callbackIdempotencyKey;
- callbackQueryId;
- tokenRef hash or safe token ref policy;
- bindingRef;
- actorRef;
- status;
- safe result code;
- firstSeenAt;
- updatedAt;
- expiresAt.

Avoid logging full token ids when not needed.

### Permission cache

A permission cache is optional and deployment-specific.

If used, it should store:

- actorRef;
- bindingRef;
- permission kind;
- decision;
- reason code;
- expiresAt;
- sourceRef;
- safe details.

It must not store raw external role payloads or credentials.

## OpenClaw-owned state

OpenClaw platform state should stay in OpenClaw.

Examples:

- bot token;
- channel registration;
- raw Telegram update;
- provider SDK clients;
- OpenClaw runtime session objects;
- tool execution payloads;
- approval source objects;
- deployment handles;
- internal OpenClaw logs.

The adapter may keep safe refs to OpenClaw objects where required, but not raw objects.

## Product/domain state

Product state belongs in product packages.

For LifeOS or OCA-style packages, examples include:

- product command descriptors;
- domain workflow definitions;
- agent-specific UI descriptors;
- product approval rules;
- OCA session refs;
- domain runtime state;
- user preferences.

Generic OpenClaw Telegram adapter stores should not absorb LifeOS/OCA product behavior unless the package is explicitly scoped as a composite product integration.

## Backend choices

Recommended backend decision order for adapter state:

1. OpenClaw native storage API if it supports required consistency and durability.
2. SQLite for single-process local/small deployments.
3. Postgres for multi-worker production deployments.
4. Redis for short-lived idempotency/locks only when persistence guarantees are sufficient.
5. In-memory only for tests and local demos.

Core should not import backend drivers for these stores.

## Consistency requirements

### Topic binding

Must prevent duplicate active bindings for the same canonical external coordinates.

### Outbox claim

Must preserve core claim semantics. Only one worker should deliver a claimed item.

### Token consume

Must be atomic enough that two callbacks cannot both consume the same token successfully.

### Callback replay

Must not dispatch twice after restart.

### Delivery attempt

Should avoid duplicate external sends where possible and record enough state for operator diagnosis.

## Restart behavior

A production OpenClaw Telegram adapter should define restart behavior for:

- active topic bindings;
- pending presentation items;
- delivering/claimed presentation items;
- issued but unconsumed action tokens;
- consumed tokens;
- inbound idempotency records;
- delivery attempts in progress;
- approval cards awaiting action;
- home card refs;
- runtime bridge state.

Restart tests should simulate process crash between:

- claim and external send;
- external send and mark delivered;
- callback receive and token consume;
- token consume and intent submit;
- approval card delivery and click;
- topic rename and binding update.

## Migration and schema state

Adapter storage should include schema/migration metadata where durable stores exist.

Recommended migration metadata:

- storeName;
- schemaVersion;
- appliedAt;
- compatibleCoreVersion;
- compatibleAdapterVersion;
- migrationStatus;
- backupRequired;
- destructive flag;
- safe message.

Migrations should run from deployment or lifecycle package code, not hidden inside `hazeteam-core`.

## Safe serialization

Public snapshots of adapter state may include:

- bindingRef;
- workspaceRef;
- agentRef;
- hostSessionRef;
- channelRef;
- chatId;
- messageThreadId;
- messageId;
- status;
- safe code/message;
- timestamps;
- correlation ids;
- detailsRef.

They must not include:

- bot token;
- raw Telegram update;
- raw OpenClaw event;
- raw provider response;
- stack trace;
- database URL;
- local path;
- SDK object;
- mutable transaction/lock handle;
- raw approval/tool payload.

## Readiness checks by store

Recommended readiness checks:

- topic binding store configured;
- topic binding schema compatible;
- session binding store configured;
- presentation outbox store configured;
- action token store configured;
- idempotency store configured;
- delivery attempt store configured;
- required bindings exist;
- home card refs valid or refreshable;
- OpenClaw channel reachable/configured;
- runtime bridge configured;
- permission policy loaded.

Readiness should distinguish missing, degraded, failed, and ready.

## Test matrix

Storage tests should cover:

- create topic binding;
- duplicate topic binding conflict;
- topic rename updates display metadata only;
- disabled binding blocks inbound/delivery;
- archived binding inactive but inspectable;
- lookup by external coordinates;
- lookup by workspace/agent;
- inbound idempotency duplicate;
- callback idempotency duplicate;
- delivery attempt success/failure;
- external message ref update;
- home card ref update;
- restart reload;
- stale delivery claim behavior;
- token consume conflict;
- safe serialization no raw payloads;
- schema migration readiness.

## Implementation checklist

Before implementing production OpenClaw Telegram storage, verify:

- store category is explicit;
- core contract stores preserve public semantics;
- adapter stores do not leak raw provider payloads;
- topic binding uses stable ids, not display names;
- delivery target derives from binding;
- token consume is atomic enough;
- idempotency keys are deterministic;
- restart behavior is documented and tested;
- schema migration policy exists;
- readiness covers stores and schema;
- CI runs store contract and restart tests.
