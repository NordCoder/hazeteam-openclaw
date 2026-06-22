# OpenClaw Telegram UI Rendering and Commands

Status: S00 focused architecture baseline

## 1. Goal

The Telegram UI must make one bot feel like many agent-specific workspaces while still using OpenClaw as the channel owner.

The implementation should provide:

- topic-aware command routing;
- pinned agent home cards;
- per-agent quick actions;
- tokenized callback buttons;
- approval cards in originating topic;
- safe and concise failure messages.

## 2. Native Telegram command policy

Native bot commands must stay small and generic.

Recommended native list:

```text
/help
/status
/actions
/sessions
/cancel
/settings
```

Reason:

- native bot commands are scoped by Telegram command scopes, not by forum topic;
- Telegram has a command count limit;
- per-agent command discoverability should be implemented through topic-aware `/help`, pinned home cards, and inline buttons.

## 3. Topic-aware command router

Command execution context:

```text
CommandExecutionContext:
  commandName: string
  argsText?: string
  sourceText: string
  topicBinding: TopicBinding
  workspaceRef: { id: string }
  agentRef: { id: string, kind?: string }
  actor: ActorRef
  correlationId: string
```

Resolution algorithm:

1. Parse message text.
2. Resolve topic binding.
3. Load command set for agent kind.
4. Match command name or alias.
5. Check permission.
6. Resolve handler.
7. Execute handler or map to core user intent.
8. Return presentation result.

Rules:

- same command may exist for multiple agents;
- same command may mean different things by agent;
- unknown command returns current agent help;
- command router must not dispatch before binding/permission checks.

## 4. Minimal agent UI descriptor for adapter stage

The full domain package can come later. For the adapter stage, define a minimal local descriptor contract.

```text
AgentTelegramUiDescriptor:
  uiRef: string
  agentKind: string
  displayName: string
  icon?: string
  homeCard:
    title: string
    description?: string
    commandRefs: string[]
    quickActionRefs: string[]
  commands: TelegramCommandDescriptor[]
  quickActions: TelegramQuickActionDescriptor[]
  renderers?: RendererDescriptor[]
```

### TelegramCommandDescriptor

```text
TelegramCommandDescriptor:
  commandRef: string
  name: string
  aliases?: string[]
  description: string
  visibleInHelp: boolean
  requiredPermission?: string
  handlerRef: string
```

### TelegramQuickActionDescriptor

```text
TelegramQuickActionDescriptor:
  actionRef: string
  label: string
  description?: string
  style?: "primary" | "secondary" | "danger"
  requiredPermission?: string
  handlerRef: string
  tokenTtlSeconds?: number
```

This descriptor is intentionally minimal. It should be easy to move or replace with `domain-lifeos` later.

## 5. Home card rendering

Each active topic should have a home card.

Home card content:

- icon + agent display name;
- workspace id/name;
- topic display name;
- status summary;
- common commands;
- quick actions;
- pending approval/session counters if available;
- safe setup hints.

Home card lifecycle:

1. render on topic binding creation;
2. deliver to topic;
3. pin if OpenClaw channel supports pinning;
4. store external message ref;
5. edit on status updates if possible;
6. replace if edit unavailable.

Home card failures should not block the whole adapter, but readiness may report degraded UI state.

## 6. Presentation rendering

Renderer input:

```text
PresentationRenderInput:
  presentation: public core presentation/outbox item
  topicBinding: TopicBinding
  agentUi: AgentTelegramUiDescriptor
  correlationId: string
```

Renderer output:

```text
OpenClawTelegramDeliveryRequest
```

Rendering rules:

- choose safe text fallback first;
- rich/structured Telegram messages are optional later enhancement;
- all action buttons must be tokenized;
- target topic comes from binding, not presentation free-form metadata;
- renderer must not leak raw core/private payloads.

## 7. Button rendering

Button creation flow:

1. Renderer receives abstract action.
2. Adapter/core issues action token.
3. Adapter creates callback payload, for example `hz:<tokenRef>`.
4. Delivery request contains label and token payload.
5. Telegram channel sends inline keyboard/button equivalent.

Button rules:

- label is user-facing and safe;
- callback payload is opaque;
- destructive actions use danger style if channel supports it;
- token TTL should be explicit;
- no action body in callback payload.

## 8. Approval card rendering

Approval card should include:

- requesting agent;
- workspace;
- topic;
- tool/capability;
- risk level;
- requested action summary;
- safe details preview;
- expiry;
- approve/reject/action buttons.

Example structure:

```text
🛠 Coder Agent requests approval

Tool: codex.apply_patch
Risk: medium
Workspace: workspaceA

Summary:
Apply test-only changes to adapter contract fixtures.

[Approve once] [Reject]
[Show details]
```

Approval buttons may use Hazeteam action token to protect Telegram callback. The actual permission resolution goes through OpenClaw approval API.

## 9. Status and session cards

The first adapter stage does not implement real OCA, but the UI model should already support status cards.

Generic status card fields:

```text
StatusCard:
  title: string
  status: "idle" | "running" | "needs_approval" | "failed" | "done"
  summary: string
  details?: string[]
  actions?: quick actions
```

Later OCA wrapper can render coding session status through this generic card model.

## 10. Error message rendering

User-visible errors must be short and safe.

Examples:

- unknown topic: “This topic is not connected to an agent yet.”
- disabled topic: “This agent topic is disabled.”
- permission denied: “You do not have permission to do this.”
- expired action: “This action expired. Run /actions to refresh.”
- replayed action: “This action was already processed.”
- runtime unavailable: “Agent runtime is temporarily unavailable.”

No stack traces, raw OpenClaw errors, raw Telegram payloads, secrets, or file paths.

## 11. Command fixtures for first implementation

Initial fake agents for adapter tests:

### Router

Commands:

- `/help`
- `/status`
- `/actions`

Quick actions:

- Show workspaces;
- Show agent topics.

### Coder fake

Commands:

- `/help`
- `/status`
- `/sessions`
- `/output`
- `/continue`
- `/cancel`

Quick actions:

- New task;
- Active sessions;
- Last output;
- Pending approvals.

No real OCA integration yet. These commands may return fake/test presentations.

### Reviewer fake

Commands:

- `/help`
- `/status`
- `/review`
- `/check`

Quick actions:

- Review latest;
- Check CI;
- Show risks.

## 12. Testing requirements

UI/command tests should cover:

- `/help` in coder topic returns coder help;
- `/help` in reviewer topic returns reviewer help;
- `/sessions` in coder topic resolves coder handler;
- unknown command returns agent-specific help;
- quick action is rendered with token payload only;
- approval card targets originating topic;
- disabled topic blocks commands;
- unauthorized actor cannot execute command;
- unsafe renderer input is not leaked in output;
- renderer target uses binding chat/thread, not free-form data.
