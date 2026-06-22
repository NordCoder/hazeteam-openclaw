# OpenClaw Telegram Adapter Runtime Flows

Status: S00 focused architecture baseline

## 1. Flow design goal

The adapter must make Telegram forum topics feel like separate agent surfaces while keeping OpenClaw as the owner of Telegram transport and runtime.

The adapter is responsible for deterministic mapping, idempotency, core lifecycle usage, and safe delivery.

## 2. Message flow: user text to agent runtime

### 2.1 Happy path

1. User writes message in Telegram forum topic.
2. OpenClaw Telegram channel receives raw Telegram update.
3. OpenClaw normalizes update into `OpenClawTelegramMessageEvent`.
4. Adapter receives event.
5. Adapter derives message idempotency key.
6. Adapter resolves topic binding using `channelRef.id + chatId + messageThreadId`.
7. Adapter resolves workspace and agent from topic binding.
8. Adapter parses command if text starts with `/`; otherwise treats it as user intent.
9. Adapter maps event to core `submitUserIntent` input.
10. `hazeteam-core` resolves/creates host session binding.
11. Core dispatches through injected `AgentControlHost`.
12. Adapter's `AgentControlHost` bridge calls OpenClaw runtime.
13. OpenClaw runtime returns normalized dispatch result.
14. Core returns public envelope.
15. If user-visible output is needed, it is represented as presentation outbox item.
16. Delivery pump delivers presentation back to the same topic or configured target topic.

### 2.2 Required invariants

- Topic binding determines workspace and agent, not free-text prompt parsing.
- Raw Telegram update does not enter core.
- Raw OpenClaw runtime result does not become public output without normalization.
- User-visible response goes through outbox, not direct ad-hoc send.
- Correlation id follows the whole flow.

### 2.3 Missing topic handling

If `messageThreadId` is missing:

- if chat is configured with a default router topic, route to router;
- otherwise reply with safe setup/error message;
- do not guess a random agent.

If topic binding is missing:

- admin-only auto-bind may be supported later;
- default behavior should be safe failure with setup instructions;
- no runtime dispatch should happen.

## 3. Command flow

### 3.1 Topic-aware command resolution

1. Message event text starts with `/`.
2. Adapter resolves topic binding.
3. Adapter loads agent command registry.
4. Adapter strips bot username suffix if present, for example `/status@bot`.
5. Adapter resolves command by agent.
6. Adapter checks actor permission.
7. Adapter executes command handler or maps command to core/user intent.
8. Result is delivered as presentation.

### 3.2 Rules

- Same command name may exist for multiple agents.
- Command meaning is determined by topic binding.
- Unknown command returns current agent help.
- Global commands are implemented as command descriptors available in all agent topics.
- Native Telegram command menu remains small; rich per-agent command list is rendered by `/help` and pinned home card.

## 4. Callback flow: tokenized button click

### 4.1 Happy path

1. Adapter previously rendered a button using opaque token payload.
2. User clicks Telegram button.
3. OpenClaw emits `OpenClawTelegramCallbackEvent`.
4. Adapter resolves topic binding.
5. Adapter extracts tokenRef from callbackData.
6. Adapter checks actor permission before token consume.
7. Adapter verifies action token with core.
8. Adapter consumes action token with core.
9. Adapter dispatches consumed action or command.
10. Adapter acknowledges callback through OpenClaw channel if supported.
11. User-visible result goes through presentation delivery.

### 4.2 Replay path

If token was already consumed:

- do not dispatch again;
- return safe “already processed” response;
- optionally refresh UI state.

### 4.3 Expired token path

If token expired:

- do not dispatch;
- return safe “action expired” response;
- suggest `/actions` or refresh home card.

### 4.4 Unauthorized actor path

If actor lacks permission:

- do not consume token;
- return safe permission denied response;
- log public-safe event.

This order is mandatory. Unauthorized clicks must not burn valid tokens.

## 5. Presentation delivery flow

### 5.1 Happy path

1. Core has pending presentation outbox item.
2. Delivery worker lists pending items.
3. Delivery worker claims item.
4. Adapter resolves target topic binding.
5. Renderer converts presentation to `OpenClawTelegramDeliveryRequest`.
6. OpenClaw channel sends/edits Telegram message.
7. Delivery result returns external message ref.
8. Adapter marks outbox item delivered.
9. Adapter stores UI message ref if future edits are needed.

### 5.2 Failure path

If OpenClaw delivery fails:

- adapter marks delivery failed with safe reason;
- retry policy decides if item is retried;
- public logs include only safe error code/message;
- private raw provider error remains inside OpenClaw if needed.

### 5.3 Rendering target rule

Default target is the same topic binding that originated the interaction.

Cross-agent delivery is explicit:

- coder completion may also create reviewer task presentation;
- router summary may be delivered to router topic;
- admin/system errors may be delivered to configured admin topic.

No implicit cross-topic delivery.

## 6. Approval routing flow

### 6.1 OpenClaw tool approval appears in agent topic

1. Agent runtime requests tool approval.
2. OpenClaw creates approval request.
3. Adapter receives normalized approval request or polls approval source.
4. Adapter resolves originating topic by `workspaceRef + agentRef + optional topicBindingRef`.
5. Adapter creates approval presentation/card.
6. Adapter renders buttons with action tokens.
7. User approves/rejects in same topic.
8. Adapter checks permission.
9. Adapter resolves OpenClaw approval through runtime approval API.
10. Adapter updates UI and logs safe outcome.

### 6.2 Missing originating topic

Fallback order:

1. explicit `topicBindingRef`;
2. active binding for workspace + agent;
3. workspace router topic;
4. admin topic;
5. safe failure.

This fallback must be deterministic and configurable.

## 7. Home card flow

Home card is a pinned message per topic.

Creation/update flow:

1. Topic binding created or discovered.
2. Adapter loads agent UI descriptor.
3. Adapter renders home card.
4. OpenClaw channel sends message to topic.
5. Adapter asks OpenClaw/Telegram channel to pin message if supported.
6. Adapter stores home message ref.
7. Later updates edit message if supported, otherwise send replacement and update ref.

Home card must include:

- workspace;
- agent;
- status;
- key commands;
- quick actions;
- pending approval/session counters if available.

## 8. Topic lifecycle flow

### 8.1 Topic create/discover

Initial implementation may require manual fixture binding.

Later implementation can support:

- list configured workspaces/agents;
- ensure supergroup topics exist;
- create missing topics through OpenClaw channel if channel supports topic management;
- write topic binding after creation.

### 8.2 Topic rename

Topic rename must not break binding.

System event updates `topicName` display field only.

### 8.3 Topic close/archive

When topic is closed or binding archived:

- new inbound messages fail safely;
- pending deliveries should not target archived topic except configured final notification;
- outbox items may be rerouted or failed depending on policy.

## 9. Multi-workspace flow

Production recommendation:

- one Telegram supergroup per workspace;
- topic names can be simple agent names.

Dev mode:

- one Telegram supergroup for multiple workspaces;
- topic names can be `workspace/agent`.

Adapter must not rely on topic name for canonical workspace identity. Binding registry is authoritative.

## 10. Runtime failure flow

If OpenClaw runtime fails during dispatch:

- `AgentControlHost` bridge normalizes failure;
- core returns safe public envelope;
- adapter may create failure presentation;
- raw runtime error is not shown to user;
- readiness may become degraded.

If runtime throws:

- catch at bridge boundary;
- convert to safe failure;
- preserve correlation id;
- do not leak stack trace.

## 11. Delivery worker lifecycle

Delivery worker belongs to adapter/OpenClaw runtime, not core.

Required operations:

- start;
- stop accepting new work;
- claim pending items;
- release or finish in-flight claims on shutdown;
- recover stale claims after restart;
- expose readiness/status.

Initial waves may implement a manual `drainOnce()` instead of background daemon. Real scheduling can come later through OpenClaw process runtime.

## 12. End-to-end smoke target

Minimum fake smoke:

1. create topic binding for `workspaceA/coder`;
2. emit fake message event into coder topic;
3. adapter maps it to core input;
4. fake AgentControlHost returns presentation;
5. core/public envelope remains safe;
6. delivery pump delivers presentation to fake channel sink;
7. fake channel sink records chatId/messageThreadId;
8. test asserts output went to coder topic;
9. button click consumes token once;
10. replay does not dispatch twice.
