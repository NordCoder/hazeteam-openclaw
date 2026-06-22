# OpenClaw Telegram Adapter State and Storage

Status: S00 focused architecture baseline

## 1. Goal

The adapter needs durable state around Telegram topics and OpenClaw delivery, but `hazeteam-core` should remain unchanged.

This document defines adapter-owned state and store contracts for the first OpenClaw + Telegram adapter implementation.

## 2. State ownership summary

### 2.1 hazeteam-core state

Owned by core contracts, implemented by adapter stores in production:

- host session bindings;
- presentation outbox items;
- action tokens.

### 2.2 Adapter state

Owned by `packages/openclaw-adapter`:

- topic bindings;
- UI message refs;
- delivery attempts;
- inbound idempotency records;
- permission bindings;
- adapter readiness snapshots;
- public-safe operation logs if stored locally.

### 2.3 OpenClaw state

Owned by OpenClaw platform:

- raw Telegram updates;
- channel configuration;
- bot token;
- webhook/polling lifecycle;
- runtime tool approval source;
- raw platform logs;
- deployment secrets;
- storage substrate.

Adapter may store refs to OpenClaw-managed objects, not raw private payloads.

## 3. TopicBindingStore

### 3.1 Entity

```text
TopicBinding:
  bindingRef: string
  channelId: string
  telegramChatId: string
  telegramMessageThreadId: string
  telegramTopicName?: string
  workspaceId: string
  agentId: string
  agentKind: string
  uiRef?: string
  mode: "workspace_group" | "multi_workspace_group"
  status: "active" | "disabled" | "archived"
  homeMessageRef?: string
  createdAt: string
  updatedAt: string
```

### 3.2 Unique constraints

Required logical unique keys:

- `channelId + telegramChatId + telegramMessageThreadId`;
- active binding uniqueness for `workspaceId + agentId` may be required in production mode, unless multiple topics per agent are explicitly supported.

### 3.3 Operations

```text
getByBindingRef(bindingRef)
getByTelegramTopic(channelId, chatId, messageThreadId)
listByWorkspace(workspaceId)
listByAgent(workspaceId, agentId)
createBinding(input)
updateTopicDisplay(bindingRef, topicName)
updateHomeMessageRef(bindingRef, homeMessageRef)
disableBinding(bindingRef)
archiveBinding(bindingRef)
```

### 3.4 Semantics

- topic rename updates display field only;
- disabled binding blocks command/action execution;
- archived binding is historical and should not receive normal deliveries;
- deleting binding should be rare; prefer archive.

## 4. UiMessageRefStore

Stores refs to Telegram/OpenClaw-delivered UI messages.

### 4.1 Entity

```text
UiMessageRef:
  uiMessageRef: string
  bindingRef: string
  purpose: "home_card" | "presentation" | "approval" | "status" | "session_card"
  externalMessageRef:
    chatId: string
    messageThreadId?: string
    messageId: string
  outboxRef?: string
  approvalRef?: string
  tokenRefs?: string[]
  status: "active" | "superseded" | "deleted" | "unknown"
  createdAt: string
  updatedAt: string
```

### 4.2 Use cases

- edit pinned home card;
- update approval card after approve/reject;
- update session status card;
- avoid creating duplicate UI cards on retry.

## 5. DeliveryAttemptStore

Tracks adapter delivery attempts independently of core outbox item state.

### 5.1 Entity

```text
DeliveryAttempt:
  deliveryRef: string
  outboxRef: string
  claimRef?: string
  bindingRef: string
  channelId: string
  attemptNumber: number
  status: "claimed" | "sent" | "failed" | "retry_scheduled" | "dead_lettered"
  externalMessageRef?:
    chatId: string
    messageThreadId?: string
    messageId: string
  errorCode?: string
  safeErrorMessage?: string
  retryable?: boolean
  nextAttemptAt?: string
  correlationId: string
  createdAt: string
  updatedAt: string
```

### 5.2 Semantics

- one outbox item may have multiple delivery attempts;
- successful delivery should persist external message ref;
- retry decision is adapter-owned;
- raw provider error must not be stored here.

## 6. InboundIdempotencyStore

Prevents duplicate handling of repeated message/callback events.

### 6.1 Entity

```text
InboundIdempotencyRecord:
  idempotencyKey: string
  eventRef: string
  eventType: string
  channelId: string
  bindingRef?: string
  status: "processing" | "processed" | "failed"
  resultRef?: string
  firstSeenAt: string
  updatedAt: string
  expiresAt?: string
```

### 6.2 Semantics

- message duplicate should not dispatch twice if key is processed;
- callback duplicate must not consume token twice;
- failed records may be retryable depending on failure class;
- TTL can be used to prevent unbounded growth.

## 7. PermissionBindingStore

Initial permissions may be simple config. Still define store contract to avoid hardcoding later.

### 7.1 Entity

```text
PermissionBinding:
  permissionRef: string
  workspaceId: string
  agentId?: string
  telegramUserId: string
  roles: string[]
  status: "active" | "disabled"
  createdAt: string
  updatedAt: string
```

### 7.2 Required permission checks

- can read topic;
- can execute command;
- can click action;
- can approve tool request;
- can manage topic binding;
- can cancel session/task.

Permission check must happen before action token consume.

## 8. Core store implementations

The adapter must provide production implementations for core contracts when running for real.

Required core stores/readers:

- session binding store;
- presentation outbox store;
- action token store;
- optional runtime/status/health readers if used by readiness.

Initial waves can implement adapter factory over in-memory core stores for smoke tests. Production durable stores come later.

## 9. Storage substrate decision

The adapter should not choose final DB prematurely if OpenClaw already provides a storage abstraction.

Preferred order:

1. use OpenClaw storage API if available;
2. use deployment-provided SQLite/Postgres adapter behind storage interface;
3. use in-memory only for tests/local smoke.

Do not add direct database dependency in early waves unless the storage decision is explicit.

## 10. Public-safe serialization

All adapter state exposed to logs/UI/readiness must be public-safe.

Never expose:

- bot token;
- raw Telegram update;
- raw callback payload beyond opaque token ref;
- raw OpenClaw provider payload;
- absolute local paths;
- stack traces;
- unredacted secrets;
- full raw OCA logs.

Allowed:

- refs;
- status;
- safe error code;
- safe error message;
- timestamps;
- correlation id;
- workspace/agent identifiers.

## 11. Recovery rules

On startup adapter should be able to detect:

- stale delivery attempts;
- in-progress inbound idempotency records;
- pending outbox items;
- active topic bindings;
- missing home card refs;
- pending approvals;
- unavailable channel/runtime/storage.

Recovery behavior:

- stale delivery claims may be retried or released;
- missing home cards may be recreated;
- archived topics should not receive normal delivery;
- readiness should report degraded if required stores are unavailable.

## 12. Testing requirements

State/storage tests should cover:

- create and lookup topic binding;
- topic rename keeps binding stable;
- disabled binding blocks command;
- archived binding blocks delivery;
- duplicate inbound message returns cached/ignored behavior;
- delivery attempt records success and failure;
- UI message ref updates;
- unauthorized actor rejected before token consume;
- public-safe serialization sweep;
- storage unavailable produces readiness degraded.
