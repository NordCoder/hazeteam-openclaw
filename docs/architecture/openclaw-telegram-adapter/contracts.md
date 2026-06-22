# OpenClaw Telegram Adapter Contracts

Status: S00 focused architecture baseline

## 1. Contract goal

This document defines the minimal contracts implementers need before writing code for the OpenClaw Telegram adapter.

The adapter must be written against normalized OpenClaw abstractions, not raw Telegram bot SDK objects.

The real OpenClaw API may differ. Until it is available, `packages/openclaw-testkit` should provide fake implementations matching these contracts.

## 2. Dependency contract

Allowed:

- `packages/openclaw-adapter` imports public `hazeteam-core` package exports;
- `packages/openclaw-adapter` imports OpenClaw public channel/runtime/storage abstractions, once available;
- `packages/openclaw-adapter` imports local testkit fakes in tests only;
- `packages/openclaw-testkit` imports adapter public contracts for fixtures.

Forbidden:

- any package imports `hazeteam-core/src/*`;
- any package imports core private `dist` paths;
- `hazeteam-core` imports OpenClaw or Telegram;
- raw Telegram update objects cross into `hazeteam-core`;
- full action payloads are embedded into Telegram callback data.

## 3. Channel refs

### 3.1 OpenClawTelegramChannelRef

Represents the OpenClaw-owned Telegram channel integration.

Fields:

```text
OpenClawTelegramChannelRef:
  id: string
  kind: "telegram"
  botRef?: string
  deploymentRef?: string
```

Notes:

- `botRef` is a public-safe reference, not bot token.
- Secrets remain in OpenClaw deployment config.

### 3.2 TelegramForumTopicRef

Represents a Telegram forum topic as seen through OpenClaw.

Fields:

```text
TelegramForumTopicRef:
  chatId: string
  messageThreadId: string
  topicName?: string
  isGeneralTopic?: boolean
```

Notes:

- `messageThreadId` is required for agent topic routing except explicitly configured fallback cases.
- Topic name is display metadata only.

## 4. Topic binding contract

### 4.1 TopicBinding

Canonical durable mapping from OpenClaw Telegram topic to Hazeteam workspace/agent surface.

Fields:

```text
TopicBinding:
  bindingRef: string
  channelRef: OpenClawTelegramChannelRef
  telegram: TelegramForumTopicRef
  workspaceRef:
    id: string
  agentRef:
    id: string
    kind: string
  uiRef?: string
  displayName: string
  mode: "workspace_group" | "multi_workspace_group"
  status: "active" | "disabled" | "archived"
  createdAt: string
  updatedAt: string
```

Rules:

- lookup key is `channelRef.id + chatId + messageThreadId`;
- topic rename must not break binding;
- disabled binding fails safely;
- archived binding does not accept new commands;
- bindingRef must be stable and public-safe.

### 4.2 TopicBindingStore

Required operations:

```text
getByTelegramTopic(channelRef, chatId, messageThreadId)
listByWorkspace(workspaceRef)
listByAgent(workspaceRef, agentRef)
upsertBinding(binding)
disableBinding(bindingRef)
archiveBinding(bindingRef)
```

Initial implementation may be in-memory. Production implementation must be durable.

## 5. Incoming channel event contract

OpenClaw Telegram channel should emit normalized events.

### 5.1 OpenClawTelegramMessageEvent

Fields:

```text
OpenClawTelegramMessageEvent:
  eventRef: string
  eventType: "telegram.message"
  channelRef: OpenClawTelegramChannelRef
  telegram:
    chatId: string
    messageThreadId?: string
    messageId: string
    topicName?: string
  actor:
    externalUserId: string
    displayName?: string
    username?: string
    isBot?: boolean
  text?: string
  attachments?: OpenClawTelegramAttachmentRef[]
  occurredAt: string
  correlationId?: string
  rawDebugRef?: string
```

Rules:

- `rawDebugRef` may point to private OpenClaw debug storage, not raw payload in public adapter object;
- text may be absent for non-text messages;
- attachments are refs/metadata, not file bytes.

### 5.2 OpenClawTelegramCallbackEvent

Fields:

```text
OpenClawTelegramCallbackEvent:
  eventRef: string
  eventType: "telegram.callback"
  channelRef: OpenClawTelegramChannelRef
  telegram:
    chatId: string
    messageThreadId?: string
    messageId?: string
    callbackQueryId: string
  actor:
    externalUserId: string
    displayName?: string
    username?: string
  callbackData: string
  occurredAt: string
  correlationId?: string
  rawDebugRef?: string
```

Rules:

- callbackData must contain only an opaque token envelope, such as `hz:<tokenRef>`;
- missing `messageThreadId` requires explicit fallback or safe failure;
- do not trust callbackData before permission and token validation.

### 5.3 OpenClawTelegramSystemEvent

Examples:

- topic created;
- topic renamed;
- topic closed;
- bot added/removed;
- chat permission changed.

Fields:

```text
OpenClawTelegramSystemEvent:
  eventRef: string
  eventType: "telegram.topic.created" | "telegram.topic.renamed" | "telegram.topic.closed" | "telegram.chat.permissions_changed"
  channelRef: OpenClawTelegramChannelRef
  telegram:
    chatId: string
    messageThreadId?: string
    topicName?: string
  actor?: ActorRef
  occurredAt: string
  correlationId?: string
```

Initial waves may only define this contract and fake events. Full system-event handling can come later.

## 6. Actor contract

### 6.1 ActorRef

Fields:

```text
ActorRef:
  externalUserId: string
  displayName?: string
  username?: string
  roles?: string[]
```

Adapter must map actor to permission policy before executing commands or consuming tokens.

Actor identity is per-message/callback. Topic is the conversation surface, not the actor.

## 7. Adapter command contract

### 7.1 AdapterCommand

Fields:

```text
AdapterCommand:
  commandName: string
  argsText?: string
  sourceText: string
  workspaceRef: { id: string }
  agentRef: { id: string, kind?: string }
  topicBindingRef: string
  actor: ActorRef
  correlationId: string
```

Resolution rules:

- command names are topic-aware;
- same command name may behave differently in different agent topics;
- unknown command returns agent-specific help;
- global fallback must not route to the wrong agent.

## 8. Core input mapping contract

Message event to core:

```text
OpenClawTelegramMessageEvent
  -> TopicBinding
  -> CoreInteractionSubmitUserIntentInput
```

Required mapping fields:

- workspaceRef from topic binding;
- agentRef from topic binding;
- externalConversationRef from channelRef + chatId + messageThreadId;
- actor from event actor;
- text/attachments as safe public intent content;
- correlationId from event or generated adapter idempotency key.

Core must not receive raw Telegram update or raw OpenClaw event.

## 9. Delivery contract back to OpenClaw

### 9.1 OpenClawTelegramDeliveryRequest

Fields:

```text
OpenClawTelegramDeliveryRequest:
  deliveryRef: string
  channelRef: OpenClawTelegramChannelRef
  telegram:
    chatId: string
    messageThreadId: string
    replyToMessageId?: string
    editMessageId?: string
  content:
    text?: string
    richMessageRef?: string
    parseMode?: "plain" | "markdown" | "html" | "rich"
  actions?: TelegramActionButtonGroup[]
  notificationPolicy?: "normal" | "silent"
  correlationId: string
```

Rules:

- delivery target must come from topic binding, not from user-provided payload;
- `messageThreadId` is required for agent topic delivery;
- rich messages may be supported later, but text/markdown-compatible fallback is required;
- actions must already be tokenized.

### 9.2 TelegramActionButtonGroup

Fields:

```text
TelegramActionButtonGroup:
  rows:
    - buttons:
        - label: string
          tokenPayload: string
          style?: "primary" | "secondary" | "danger"
```

`tokenPayload` is adapter-rendered opaque callback data, not raw action payload.

## 10. Delivery result contract

### 10.1 OpenClawTelegramDeliveryResult

Fields:

```text
OpenClawTelegramDeliveryResult:
  ok: boolean
  deliveryRef: string
  externalMessageRef?:
    chatId: string
    messageThreadId?: string
    messageId: string
  error?:
    code: string
    safeMessage: string
    retryable: boolean
  correlationId: string
```

Rules:

- no raw Telegram error payload in public result;
- retryable must be explicit;
- external message ref is stored for edit/reply/update flows.

## 11. Approval request contract

OpenClaw tool/runtime approvals should be normalized before rendering.

### 11.1 OpenClawApprovalRequest

Fields:

```text
OpenClawApprovalRequest:
  approvalRef: string
  workspaceRef: { id: string }
  agentRef: { id: string }
  topicBindingRef?: string
  capabilityRef?: string
  toolRef: string
  riskLevel: "low" | "medium" | "high" | "critical"
  summary: string
  detailsPreview?: string
  privateDetailsRef?: string
  requestedAction: string
  expiresAt?: string
  correlationId: string
```

Routing rule:

- if topicBindingRef exists, deliver approval to that topic;
- otherwise resolve by workspaceRef + agentRef;
- if no topic exists, fail safely or route to configured admin/router topic.

## 12. Readiness contract

Adapter readiness result should include:

```text
OpenClawTelegramAdapterReadiness:
  status: "ready" | "degraded" | "not_configured" | "failed"
  coreReadiness: unknown
  checks:
    topicBindingStore: CheckResult
    channelRegistry: CheckResult
    deliveryCapability: CheckResult
    domainRegistry: CheckResult
    runtimeBridge: CheckResult
    storeBindings: CheckResult
  safeSummary: string
  generatedAt: string
```

Check result:

```text
CheckResult:
  status: "ready" | "missing" | "degraded" | "failed"
  code: string
  safeMessage: string
```

No secrets or raw provider payloads in readiness output.

## 13. Idempotency contract

Idempotency key derivation:

Message event:

```text
telegram-message:<channelId>:<chatId>:<messageThreadId>:<messageId>
```

Callback event:

```text
telegram-callback:<channelId>:<chatId>:<messageThreadId>:<callbackQueryId>
```

Delivery attempt:

```text
delivery:<outboxRef>:<claimRef>:<attemptNumber>
```

Rules:

- duplicate callback never dispatches action twice;
- duplicate message should not create duplicate host action if idempotency store is available;
- idempotency store may start as fake/in-memory, but contract must be explicit.

## 14. Minimum fake OpenClaw testkit contract

Testkit should provide:

- fake channel event factory;
- fake delivery sink;
- fake runtime dispatcher;
- fake approval source;
- fake storage adapter;
- fake clock/id generator;
- assertion helpers for no-leak public outputs.

These fakes are necessary before real OpenClaw APIs are available.
