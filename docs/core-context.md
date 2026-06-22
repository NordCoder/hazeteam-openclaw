# Core context digest

This file is the local `hazeteam-openclaw` digest for future implementation workers. Read it before writing package code, then inspect the authoritative `hazeteam-core` docs and public API surfaces when implementing a phase.

## Required `hazeteam-core` reading

Read from `NordCoder/hazeteam-core` `main`:

- `docs/adapter-authoring/README.md`
- `docs/adapter-authoring/core-boundary-and-ownership.md`
- `docs/adapter-authoring/public-api-and-import-rules.md`
- `docs/adapter-authoring/core-interaction-facade-guide.md`
- `docs/adapter-authoring/session-binding-guide.md`
- `docs/adapter-authoring/inbound-event-mapping-guide.md`
- `docs/adapter-authoring/presentation-outbox-delivery-guide.md`
- `docs/adapter-authoring/action-tokens-and-callbacks-guide.md`
- `docs/adapter-authoring/runtime-workflow-approval-guide.md`
- `docs/adapter-authoring/durable-stores-guide.md`
- `docs/adapter-authoring/readiness-health-observability-guide.md`
- `docs/adapter-authoring/security-redaction-guide.md`
- `docs/adapter-authoring/testing-and-certification-guide.md`
- `docs/adapter-authoring/extension-taxonomy.md`
- `docs/adapter-authoring/reference-openclaw-adapter-blueprint.md`
- `docs/adapter-authoring/reference-openclaw-telegram-blueprint.md`
- `docs/adapter-authoring/reference-openclaw-telegram-state-and-storage.md`
- `docs/adapter-authoring/adapter-implementation-roadmap.md`
- `docs/adapter-authoring/checklists/adapter-design-checklist.md`
- `docs/adapter-authoring/checklists/adapter-pr-checklist.md`
- `docs/adapter-authoring/checklists/adapter-release-checklist.md`
- `docs/adapter-readiness.md`
- `docs/public-api-map.md`
- `docs/release/adapter-handoff.md`
- `docs/host/core-interaction-facade.md`

## Ownership summary

`hazeteam-core` owns deterministic, transport-neutral, domain-neutral semantics:

- public refs, validation, safe result/error envelopes, and safe serializers;
- host session binding contracts;
- `createCoreInteractionHost` as the adapter-facing facade;
- `AgentControlHost` contracts and host inbound dispatch semantics;
- presentation outbox lifecycle;
- presentation action token issue, verify, consume, expiry, mismatch, and replay semantics;
- workflow, policy, runtime, approval, diagnostics, lifecycle, and readiness models;
- in-memory test implementations only where explicitly public.

`hazeteam-openclaw` owns OpenClaw/Telegram integration reality:

- normalized OpenClaw Telegram event contracts;
- topic binding and adapter-owned routing state;
- event mapping into public core inputs;
- Telegram/OpenClaw rendering and delivery contracts;
- callback parsing, external permission checks, token dispatch, and callback acknowledgements;
- OpenClaw runtime bridge behind public core ports;
- approval card routing and approve/reject callback flow;
- adapter readiness, idempotency, replay, and durable adapter stores;
- fake testkit before real SDK wiring;
- real OpenClaw/Telegram wiring and deployment docs when scoped.

OpenClaw platform owns provider/platform concerns: raw Telegram updates, bot credentials, channel edge, send/edit/delete/pin/callback acknowledgement APIs, OpenClaw runtime/tool execution environment, approval source/resolver APIs, SDK clients, deployment handles, and secrets.

## Public import rule

Adapter code may import only from public package entrypoints such as:

- `hazeteam-core`
- `hazeteam-core/host`
- `hazeteam-core/presentation`
- `hazeteam-core/foundation`
- `hazeteam-core/adapters`
- `hazeteam-core/diagnostics`
- `hazeteam-core/lifecycle`

Use only subpaths declared and documented as public by `hazeteam-core`.

Forbidden:

- `hazeteam-core/src/**`
- private `hazeteam-core/dist/**` implementation paths
- relative imports into a checked-out core repository
- production imports from `hazeteam-core/tests/**`

Workers may read core source and tests to understand behavior. They must not import private files. If a needed symbol is missing from public entrypoints, report a core API gap.

## Canonical core concepts

### `createCoreInteractionHost`

The composed adapter-facing facade. It is created with explicit ports and returns public envelopes. It does not open external connections, deliver messages, start background workers, render Telegram UI, own deployment lifecycle, or implement OpenClaw-specific behavior.

Primary method groups:

- inbound/session/dispatch: submit safe host actions or user intents;
- presentation delivery: list pending items, claim, mark delivered, mark failed;
- action tokens: issue, verify, consume;
- diagnostics/runtime/status where optional ports are injected.

### `AgentControlHost`

The core-facing dispatch port. In this repository, an OpenClaw runtime bridge should implement or wrap this public port. Raw OpenClaw runtime responses, tool payloads, logs, stack traces, provider SDK objects, and deployment handles must stay outside core values.

### Host session binding

A binding maps external conversation/session coordinates to `workspaceRef`, `agentRef`, and `hostSessionRef`. For OpenClaw Telegram, the adapter-owned topic binding resolves `channelId + chatId + messageThreadId` into the core-facing session context. Binding must be resolved before meaningful inbound dispatch, callback consume, and presentation delivery target derivation.

### Presentation outbox

Core owns the outbox state transitions. The adapter lists pending items, claims an item before external delivery, renders an adapter-owned delivery request, sends through OpenClaw Telegram APIs, then marks delivered or failed with safe results. Retry timers, worker loops, rate limits, and external delivery attempts are adapter/deployment concerns.

### Presentation action tokens

Core owns token issue, verify, consume-once, expiry, mismatch, and replay semantics. External buttons carry only an opaque callback payload, normally `hz:<tokenRef>`. Verification alone is not acceptance for side effects. The adapter must consume the token exactly once before submitting a side-effecting callback intent.

### Public result/error envelopes

Facade failures are safe public values, not transport exceptions. Values leaving the trusted runtime boundary should be public envelopes or safe adapter DTOs. Raw provider errors, stack traces, storage roots, raw payloads, SDK objects, and secrets must not be logged, delivered, or serialized.

### Readiness and diagnostics

Core readiness is descriptive over injected ports. It must not create stores, open external connections, start loops, or mutate infrastructure. Adapter readiness is deployment-aware and may check OpenClaw channel configuration, topic bindings, delivery capability, durable schemas, runtime bridge status, and permission policy.

### Workflow/runtime/approval semantics

Core owns workflow, policy, runtime, approval, retry, and execution semantics exposed through public contracts and injected ports. The adapter owns external runtime bridges, approval UI, callback acknowledgement, scheduling, and safe conversion of external runtime failures.

## Canonical adapter flows

### Inbound event -> binding -> core input

```text
raw Telegram/OpenClaw edge event
-> normalized OpenClaw Telegram event DTO
-> derive idempotency key
-> resolve topic binding
-> map actor/text/attachments into safe refs and payloads
-> submit through createCoreInteractionHost
-> handle public envelope
```

Raw Telegram/OpenClaw payloads must not enter core values. Store raw debug payloads only in protected adapter-owned debug storage and pass opaque `rawDebugRef` or `detailsRef` if needed.

### Presentation outbox -> claim -> render -> deliver -> mark result

```text
core.listPendingPresentations
-> core.claimPresentation
-> resolve binding and trusted delivery target
-> render Telegram/OpenClaw delivery request
-> deliver externally
-> core.markPresentationDelivered or core.markPresentationFailed
```

Delivery target comes from trusted binding state, not from untrusted user metadata.

### Callback -> binding -> permission -> verify -> consume -> user intent

```text
OpenClaw Telegram callback event
-> parse opaque payload such as hz:<tokenRef>
-> resolve topic binding and actor
-> check external permission
-> verify action token against expected context
-> consume token exactly once
-> map to UserIntent
-> submit through createCoreInteractionHost
```

Unauthorized callbacks should not consume tokens by default. Replays must not dispatch twice.

### Runtime bridge behind public port

```text
validated HostInboundAction or UserIntent
-> createCoreInteractionHost
-> AgentControlHost dispatch
-> OpenClaw runtime bridge
-> safe result envelope
```

The bridge converts OpenClaw runtime success/failure into safe core-facing results. It does not leak raw runtime objects.

### Approval card with tokenized approve/reject

```text
approval request/status
-> safe approval card
-> approve/reject buttons with opaque token refs
-> callback binding + permission
-> token verify/consume
-> public approval intent/resolution
```

Approval routing should use binding state. Raw approval/tool payloads must not be embedded in callback data or public output.

## Fake-first rule

Contracts, fakes, and fake E2E tests come before real OpenClaw SDK/API wiring. Real Telegram/OpenClaw smoke tests are secret-gated and must not be required by default CI.
