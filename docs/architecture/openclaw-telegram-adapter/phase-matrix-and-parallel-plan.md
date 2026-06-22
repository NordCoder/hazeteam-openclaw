# OpenClaw Telegram Adapter Phase Matrix and Parallel Plan

Status: S00 focused architecture baseline

## 1. Why this file exists

The first S00 roadmap intentionally described the adapter in broad waves. That was enough for architecture discussion, but not enough for reliable worker execution.

This file splits the OpenClaw + Telegram adapter into smaller implementation slices with:

- exact branch names;
- file/path ownership;
- dependencies;
- parallelization groups;
- implementation boundaries;
- test expectations;
- merge gates;
- known risks.

Workers should treat this file as the primary execution plan after S00 is merged.

## 2. Naming and merge policy

Base trunk:

```text
staging/package-openclaw
```

Worker branches:

```text
staging/package-openclaw-s01a-skeleton
staging/package-openclaw-s01b-boundary-tests
staging/package-openclaw-s02a-contracts-channel-events
```

Target branch for all worker PRs:

```text
staging/package-openclaw
```

Never target:

```text
main
```

Reason: this is temporary OpenClaw integration staging, not `hazeteam-core` production work.

## 3. Dependency graph overview

### Foundation group

These should run first and mostly sequentially:

```text
S01A package skeleton
  -> S01B boundary/static tests
  -> S02A core adapter contracts
```

### Contract/testkit group

These can partially run in parallel after S02A:

```text
S02B Telegram channel event contracts
S02C delivery/result contracts
S02D readiness/error/idempotency contracts
S03A testkit event factories
S03B testkit fake delivery/runtime/storage
```

### Adapter behavior group

These depend on contracts and testkit:

```text
S04A topic binding types/store
S04B topic binding edge cases/static safety
S05A message event mapper
S05B command parser/router shell
S06A minimal agent UI descriptors
S06B help/home renderers
```

### Core integration group

These depend on S04/S05 and core public exports:

```text
S07A core host factory
S07B fake AgentControlHost bridge
S07C readiness aggregation
```

### Delivery/callback group

These can be split after S07A and S06B:

```text
S08A presentation renderer contract
S08B delivery pump drainOnce
S08C delivery failure/retry state
S09A callback token parser/permission gate
S09B verify/consume/dispatch flow
S09C replay/expired/wrong-topic matrix
```

### Approval/e2e group

These come after callback and delivery are stable:

```text
S10A approval request contract/source fake
S10B approval card renderer/routing
S10C approve/reject resolution flow
S11A e2e message-to-delivery smoke
S11B e2e callback smoke
S11C e2e approval smoke
```

## 4. Parallelization rules

### Safe to run in parallel

After S01A is merged:

- S01B boundary tests;
- S02A adapter shared contracts draft;
- S03A testkit skeleton if it only creates empty package scaffolding.

After S02A is merged:

- S02B channel event contracts;
- S02C delivery contracts;
- S02D readiness/idempotency contracts;
- S03A testkit event factories.

After S02B/S02C/S02D/S03A are merged:

- S04A topic binding store;
- S05A message event mapper;
- S06A minimal UI descriptors.

After S04A and S05A are merged:

- S05B command router shell;
- S07A core host factory;
- S07B fake runtime bridge.

After S06B and S07A are merged:

- S08A presentation renderer;
- S09A callback token parser;
- S10A approval request fake.

### Do not run in parallel

Do not run these concurrently unless one is explicitly read-only docs/test-only:

- S04A topic store and S04B edge-case store changes;
- S08B delivery pump and S08C retry state if they edit the same delivery module;
- S09B token consume flow and S09C replay matrix if implementation is not stable;
- S11 e2e smoke before S08/S09/S10 are merged.

## 5. Phase details

## S01A — Package skeleton

Branch:

```text
staging/package-openclaw-s01a-skeleton
```

Goal:

Create portable package skeleton for the OpenClaw + Telegram adapter stage.

Allowed paths:

```text
packages/openclaw-adapter/**
packages/openclaw-testkit/**
packages/domain-lifeos/README.md
packages/oca-wrapper/README.md
docs/architecture/openclaw-telegram-adapter/**
```

Required files:

```text
packages/openclaw-adapter/README.md
packages/openclaw-adapter/src/.gitkeep
packages/openclaw-adapter/tests/.gitkeep
packages/openclaw-testkit/README.md
packages/openclaw-testkit/src/.gitkeep
packages/openclaw-testkit/tests/.gitkeep
packages/domain-lifeos/README.md
packages/oca-wrapper/README.md
```

Implementation requirements:

- no runtime logic;
- no package manager changes unless absolutely required;
- package READMEs describe responsibility and non-goals;
- domain/OCA READMEs must say “placeholder, out of scope until adapter foundation is ready”.

DoD:

- folders exist;
- docs explain package responsibilities;
- no core source touched;
- no imports added;
- branch can be copied to future `hazeteam-openclaw` repo.

Checks:

- inspect `git diff --name-only`;
- no `src/*` under root core modified;
- existing repo tests should remain unaffected.

## S01B — Boundary/static test skeleton

Branch:

```text
staging/package-openclaw-s01b-boundary-tests
```

Depends on:

- S01A.

Goal:

Add initial static tests that protect staging boundaries.

Allowed paths:

```text
packages/openclaw-adapter/tests/static/**
packages/openclaw-testkit/tests/static/**
tests/static/package-openclaw-boundary.test.mjs
```

Implementation requirements:

- static tests must check no `packages/**` import `hazeteam-core/src/*`;
- static tests must check no branch/package files modify root `src/*` in this staging work if feasible by path scan;
- static tests must check no direct Telegram bot token strings or obvious secret names in docs/package fixtures;
- tests may be repository-level if package test runner is not set yet.

DoD:

- static test exists and passes;
- test is deterministic;
- no production implementation logic.

## S02A — Shared adapter public contracts barrel

Branch:

```text
staging/package-openclaw-s02a-adapter-contracts-barrel
```

Depends on:

- S01A.

Goal:

Create the public contract entrypoint for `packages/openclaw-adapter`.

Allowed paths:

```text
packages/openclaw-adapter/src/contracts/**
packages/openclaw-adapter/src/index.ts
packages/openclaw-adapter/tests/unit/**
```

Required contracts:

- `AdapterRef` or equivalent common refs;
- `WorkspaceRef`;
- `AgentRef`;
- `ActorRef`;
- `CorrelationRef` or string conventions;
- `SafeError`;
- base operation result type if needed.

Implementation requirements:

- pure TypeScript types and simple validators only;
- no real OpenClaw import;
- no Telegram SDK import;
- no core private import;
- export through package index.

DoD:

- downstream phases can import common contract types;
- minimal unit tests or type-shape tests exist;
- public exports are documented.

## S02B — Channel event contracts

Branch:

```text
staging/package-openclaw-s02b-channel-event-contracts
```

Depends on:

- S02A.

Goal:

Define normalized OpenClaw Telegram event contracts consumed by the adapter.

Required contracts:

- `OpenClawTelegramChannelRef`;
- `TelegramForumTopicRef`;
- `OpenClawTelegramMessageEvent`;
- `OpenClawTelegramCallbackEvent`;
- `OpenClawTelegramSystemEvent`;
- attachment ref metadata if needed.

Implementation requirements:

- raw Telegram update is not part of public contract;
- optional `rawDebugRef` only as string ref;
- `messageThreadId` optional only at event edge, but mapper later must enforce required behavior.

DoD:

- fake events can be represented without Telegram SDK;
- docs/tests cover message, callback, system event examples;
- no raw payload field named `raw` or `update` unless private debug ref only.

## S02C — Delivery request/result contracts

Branch:

```text
staging/package-openclaw-s02c-delivery-contracts
```

Depends on:

- S02A.

Goal:

Define adapter-to-OpenClaw delivery contracts.

Required contracts:

- `OpenClawTelegramDeliveryRequest`;
- `OpenClawTelegramDeliveryResult`;
- `TelegramActionButtonGroup`;
- `ExternalMessageRef`;
- `DeliveryError`.

Implementation requirements:

- target must include chatId and messageThreadId;
- action buttons use token payload string only;
- delivery result has safe error code/message and retryable flag;
- no raw provider error field.

DoD:

- renderer and fake delivery sink can use these types;
- unit tests cover successful and failed result shapes;
- serialization is public-safe.

## S02D — Readiness, idempotency, and permission contracts

Branch:

```text
staging/package-openclaw-s02d-readiness-idempotency-contracts
```

Depends on:

- S02A.

Goal:

Define support contracts needed across mapper/delivery/callback.

Required contracts:

- `OpenClawTelegramAdapterReadiness`;
- `CheckResult`;
- `InboundIdempotencyRecord`;
- `PermissionDecision`;
- `PermissionRequirement`;
- idempotency key helpers or documented pure functions.

DoD:

- readiness output is public-safe;
- permission decision can distinguish allow/deny/reason;
- idempotency keys are deterministic;
- no hidden runtime dependency.

## S03A — Testkit event factories

Branch:

```text
staging/package-openclaw-s03a-testkit-event-factories
```

Depends on:

- S02B.

Goal:

Create fake OpenClaw Telegram event factories for tests.

Allowed paths:

```text
packages/openclaw-testkit/src/events/**
packages/openclaw-testkit/src/index.ts
packages/openclaw-testkit/tests/unit/**
```

Required factories:

- `createFakeTelegramMessageEvent`;
- `createFakeTelegramCallbackEvent`;
- `createFakeTelegramTopicSystemEvent`;
- deterministic id/correlation helpers.

DoD:

- factories produce valid contract objects;
- can override chatId/messageThreadId/messageId/actor/text;
- no Telegram SDK;
- unit tests cover defaults and overrides.

## S03B — Testkit fake delivery/runtime/storage

Branch:

```text
staging/package-openclaw-s03b-testkit-fakes
```

Depends on:

- S02C;
- S02D.

Goal:

Create fake OpenClaw execution environment for adapter tests.

Required fakes:

- fake delivery sink;
- fake runtime dispatcher;
- fake approval source/resolver;
- fake storage map;
- fake clock/id generator.

DoD:

- fake delivery sink records requests and returns deterministic message refs;
- fake runtime supports success/failure/throw modes;
- fake storage can back in-memory adapter stores;
- tests prove deterministic behavior.

## S04A — Topic binding model and in-memory store

Branch:

```text
staging/package-openclaw-s04a-topic-binding-store
```

Depends on:

- S02A;
- S02B.

Goal:

Implement topic binding model and in-memory store.

Required operations:

- get by bindingRef;
- get by channel/chat/thread;
- list by workspace;
- list by agent;
- create/upsert binding;
- update topic display;
- update home message ref;
- disable;
- archive.

DoD:

- topic rename does not change canonical lookup;
- disabled binding blocks operations via helper/status;
- archived binding is visible but not active;
- multi-workspace same agent names do not collide;
- public-safe serialization test.

## S04B — Topic binding failure matrix

Branch:

```text
staging/package-openclaw-s04b-topic-binding-failure-matrix
```

Depends on:

- S04A.

Goal:

Deep negative tests and helpers for topic binding resolution.

Cases:

- missing messageThreadId;
- unknown topic;
- disabled binding;
- archived binding;
- duplicate binding conflict;
- chat mismatch;
- channel mismatch;
- workspace/agent collision;
- topic display rename.

DoD:

- deterministic safe failure objects;
- no runtime dispatch on missing/disabled/archived binding;
- tests document fallback policy.

## S05A — Message event mapper

Branch:

```text
staging/package-openclaw-s05a-message-event-mapper
```

Depends on:

- S03A;
- S04A.

Goal:

Map fake OpenClaw Telegram message events to adapter input context and core submit input draft.

Required behavior:

- derive idempotency key;
- resolve binding;
- map actor;
- map externalConversationRef;
- map workspace/agent;
- generate/preserve correlationId;
- reject raw event leakage.

DoD:

- message in coder topic maps to coder;
- same message in reviewer topic maps to reviewer;
- missing/unknown topic safe failure;
- mapper output contains no raw Telegram update.

## S05B — Command parser and topic-aware router shell

Branch:

```text
staging/package-openclaw-s05b-command-router-shell
```

Depends on:

- S05A;
- S06A if descriptor registry already exists, otherwise use local fixture.

Goal:

Implement slash command parsing and topic-aware route decision.

Required behavior:

- parse `/command args`;
- parse `/command@bot args`;
- preserve source text;
- resolve by agent topic;
- unknown command returns help decision;
- permission hook placeholder.

DoD:

- same `/status` can route differently by agent;
- command parser rejects empty/invalid command safely;
- router shell does not execute runtime yet.

## S06A — Minimal agent UI descriptor fixtures

Branch:

```text
staging/package-openclaw-s06a-agent-ui-fixtures
```

Depends on:

- S02A.

Goal:

Define minimal local UI descriptors for adapter tests.

Required descriptors:

- router fake;
- coder fake;
- reviewer fake.

Required fields:

- display name;
- commands;
- quick actions;
- home card metadata;
- required permissions placeholders;
- handler refs.

DoD:

- duplicate command names allowed across agents;
- duplicate command names inside same agent detected;
- descriptors are platform-neutral except Telegram-oriented rendering hints allowed by adapter stage.

## S06B — Help and home card renderer

Branch:

```text
staging/package-openclaw-s06b-help-home-renderers
```

Depends on:

- S02C;
- S04A;
- S06A.

Goal:

Render agent-specific `/help` and home card delivery request.

DoD:

- coder help differs from reviewer help;
- home card uses topic binding target;
- renderer output is `OpenClawTelegramDeliveryRequest`;
- quick actions rendered as token placeholders or token builder callback;
- no raw action payload in buttons.

## S07A — Core host factory

Branch:

```text
staging/package-openclaw-s07a-core-host-factory
```

Depends on:

- S02A;
- S03B;
- S05A.

Goal:

Create adapter factory for `hazeteam-core.createCoreInteractionHost` using public exports only.

Required behavior:

- accept injected stores/runtime bridge;
- use in-memory core stores for tests if public exports provide them;
- expose submit helper for mapped message context;
- no direct OpenClaw real API yet.

DoD:

- imports only public `hazeteam-core` exports;
- fake runtime success returns safe public envelope;
- fake runtime failure/throw normalized;
- no core source changed.

## S07B — Fake AgentControlHost bridge

Branch:

```text
staging/package-openclaw-s07b-fake-agent-control-host
```

Depends on:

- S03B;
- S07A.

Goal:

Implement fake OpenClaw runtime bridge behind core AgentControlHost port.

Modes:

- success;
- public failure;
- thrown error;
- unsafe payload attempt.

DoD:

- core receives normalized result;
- thrown error does not leak stack;
- unsafe output is not public-serialized;
- tests through core host factory.

## S07C — Adapter readiness aggregation

Branch:

```text
staging/package-openclaw-s07c-readiness-aggregation
```

Depends on:

- S02D;
- S04A;
- S07A.

Goal:

Combine core readiness and adapter readiness.

Required checks:

- topic binding store;
- channel delivery capability;
- runtime bridge;
- core host;
- descriptor registry;
- storage/fake storage;
- permission policy.

DoD:

- ready/degraded/not_configured/failed statuses;
- safe summary;
- no secrets/raw payloads;
- tests for missing dependency states.

## S08A — Presentation renderer contract

Branch:

```text
staging/package-openclaw-s08a-presentation-renderer
```

Depends on:

- S02C;
- S04A;
- S06A.

Goal:

Render core/public presentation-shaped items into delivery requests.

DoD:

- renderer target uses topic binding;
- supports text fallback;
- supports button groups with tokenized payloads;
- rejects unsafe raw payloads;
- tests for coder/reviewer topic targets.

## S08B — Delivery pump drainOnce

Branch:

```text
staging/package-openclaw-s08b-delivery-pump-drain-once
```

Depends on:

- S03B;
- S07A;
- S08A.

Goal:

Implement manual delivery pump operation `drainOnce()` over core outbox and fake delivery sink.

DoD:

- list pending;
- claim;
- render;
- send;
- mark delivered;
- records delivery attempt;
- test proves correct chat/thread.

No background daemon yet.

## S08C — Delivery failure and retry state

Branch:

```text
staging/package-openclaw-s08c-delivery-failure-retry
```

Depends on:

- S08B.

Goal:

Add failed delivery handling and retry metadata.

DoD:

- fake delivery failure marks failed safely;
- retryable flag stored;
- max-attempt/dead-letter policy placeholder;
- no raw provider error leak;
- stale claim recovery documented or stubbed.

## S09A — Callback parser and permission gate

Branch:

```text
staging/package-openclaw-s09a-callback-permission-gate
```

Depends on:

- S02B;
- S02D;
- S04A;
- S03A.

Goal:

Parse callback events, resolve binding, extract token ref, check permission before consume.

DoD:

- supports `hz:<tokenRef>`;
- rejects malformed callback safely;
- missing topic safe failure;
- unauthorized actor does not consume token;
- tests use fake permission decisions.

## S09B — Core token verify/consume dispatch

Branch:

```text
staging/package-openclaw-s09b-token-consume-dispatch
```

Depends on:

- S07A;
- S09A.

Goal:

Wire valid callback token to core verify/consume and dispatch action.

DoD:

- valid token dispatches once;
- public success/failure result;
- correlation id preserved;
- no raw callback payload leak.

## S09C — Callback failure matrix

Branch:

```text
staging/package-openclaw-s09c-callback-failure-matrix
```

Depends on:

- S09B.

Goal:

Deep regression matrix for callback safety.

Cases:

- replay;
- expired;
- wrong workspace;
- wrong agent;
- wrong topic;
- malformed payload;
- unauthorized actor;
- token store missing;
- dispatch failure after consume.

DoD:

- no duplicate dispatch;
- unauthorized click does not consume;
- all failures safe for Telegram response/logging.

## S10A — Approval request fake source

Branch:

```text
staging/package-openclaw-s10a-approval-source-fake
```

Depends on:

- S02D;
- S03B;
- S04A.

Goal:

Define approval request contract and fake OpenClaw approval source/resolver.

DoD:

- approval has workspace/agent/topic refs;
- approve/reject state transitions;
- replay safe;
- missing approval safe.

## S10B — Approval card renderer and routing

Branch:

```text
staging/package-openclaw-s10b-approval-card-routing
```

Depends on:

- S06B;
- S08A;
- S10A.

Goal:

Render approval card to originating topic.

DoD:

- coder approval routes to coder topic;
- reviewer approval routes to reviewer topic;
- fallback order tested;
- approval buttons tokenized;
- safe details preview only.

## S10C — Approval action resolution

Branch:

```text
staging/package-openclaw-s10c-approval-action-resolution
```

Depends on:

- S09B;
- S10B.

Goal:

Click approve/reject button and resolve fake OpenClaw approval.

DoD:

- approve once;
- reject once;
- replay no-op;
- permission denied before token consume;
- UI update or safe response generated.

## S11A — E2E message to delivery smoke

Branch:

```text
staging/package-openclaw-s11a-e2e-message-delivery
```

Depends on:

- S08B;
- S07B;
- S05A.

Goal:

Full fake flow from Telegram topic message to delivered response.

DoD:

- fake message in coder topic;
- binding resolves;
- core submit called;
- fake runtime invoked;
- presentation outbox delivered to same topic;
- public envelope/log safe.

## S11B — E2E command and callback smoke

Branch:

```text
staging/package-openclaw-s11b-e2e-command-callback
```

Depends on:

- S06B;
- S09C.

Goal:

Full fake command and callback flow.

DoD:

- `/help` differs by topic;
- quick action button has token;
- valid click consumes once;
- replay safe;
- unauthorized click safe.

## S11C — E2E approval smoke

Branch:

```text
staging/package-openclaw-s11c-e2e-approval
```

Depends on:

- S10C.

Goal:

Full fake OpenClaw approval flow through Telegram topic UI.

DoD:

- fake approval from coder;
- approval card delivered to coder topic;
- approve resolves fake approval once;
- reject path covered;
- replay safe;
- safe logs.

## 6. Merge batches

### Batch A — Skeleton and boundaries

Sequential:

1. S01A
2. S01B
3. S02A

### Batch B — Contracts and testkit, mostly parallel after S02A

Parallel candidates:

- S02B
- S02C
- S02D

Then:

- S03A after S02B;
- S03B after S02C/S02D.

### Batch C — Independent adapter primitives

Parallel after Batch B:

- S04A;
- S06A;
- S05A after S04A/S03A;
- S06B after S06A/S02C/S04A.

### Batch D — Core integration and readiness

Parallel where possible:

- S07A after S05A/S03B;
- S07B after S07A;
- S07C after S07A/S04A/S02D.

### Batch E — Delivery and callback

Parallel starts:

- S08A after S06B/S04A/S02C;
- S09A after S04A/S02D/S03A.

Then:

- S08B after S08A/S07A/S03B;
- S09B after S09A/S07A;
- S08C after S08B;
- S09C after S09B.

### Batch F — Approval and e2e

Sequential enough to avoid churn:

1. S10A
2. S10B
3. S10C
4. S11A/S11B/S11C can run in parallel after dependencies.

## 7. Worker prompt minimum requirements

Every implementation worker prompt must include:

- exact branch name;
- exact base branch;
- target branch;
- allowed files;
- forbidden files;
- docs to read;
- concrete DoD;
- test commands;
- final report template.

Worker should not be asked to “implement adapter” generally. Each worker gets exactly one slice above.

## 8. Self-review focus per batch

### Batch A review focus

- paths only;
- no accidental core changes;
- skeleton clarity;
- boundary tests do not overfit.

### Batch B review focus

- contracts are stable enough;
- no raw Telegram payload leakage;
- no real OpenClaw assumptions hidden in fake contracts;
- serializable/public-safe types.

### Batch C review focus

- topic binding correctness;
- command routing by topic;
- descriptor validation;
- safe missing-topic behavior.

### Batch D review focus

- public core imports only;
- runtime failure normalization;
- no stack/raw leak;
- readiness useful and safe.

### Batch E review focus

- outbox lifecycle respected;
- no direct ad-hoc send;
- token consume order;
- replay and permission semantics.

### Batch F review focus

- approval routed to originating topic;
- fake e2e proves actual integration path;
- no duplicate dispatch/delivery;
- logs and outputs safe.

## 9. When to update docs

A worker should update docs only if:

- implementation reveals a contract mismatch;
- dependency order changes;
- a new invariant is discovered;
- a later phase becomes impossible as written.

Do not casually rewrite S00 docs from implementation branches.

## 10. Current recommended next actions

After this S00 focused docs branch is merged into `staging/package-openclaw`, run:

1. S01A package skeleton.
2. S01B boundary/static tests.
3. S02A shared adapter contracts barrel.

Only after these are merged should we parallelize S02B/S02C/S02D.
