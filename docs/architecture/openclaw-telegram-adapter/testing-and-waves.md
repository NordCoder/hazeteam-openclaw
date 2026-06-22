# OpenClaw Telegram Adapter Testing and Waves

Status: S00 focused architecture baseline

## 1. Goal

Implementation should proceed in small waves with tests that prove each boundary before real OpenClaw APIs are wired.

The first product target is not the full LifeOS domain and not OCA. It is the OpenClaw + Telegram adapter foundation.

## 2. Test strategy

Use three levels.

### 2.1 Static boundary tests

Prevent architecture drift:

- no imports from `hazeteam-core/src/*`;
- no production source changes to `hazeteam-core/src/*`;
- no raw Telegram SDK dependency outside adapter shim if ever added;
- no domain/OCA implementation required for adapter skeleton;
- no secrets/raw payload keywords in public serializers;
- worker branches target `staging/package-openclaw`, not `main`.

### 2.2 Unit tests

Prove deterministic mapping and state behavior:

- topic binding lookup;
- message event mapping;
- callback token extraction;
- command routing;
- renderer output;
- delivery attempt state;
- permission-before-token-consume;
- readiness aggregation.

### 2.3 Acceptance/fake integration tests

Use `openclaw-testkit` fake channel/runtime/storage:

- fake Telegram topic message -> core -> fake runtime -> outbox -> fake delivery sink;
- fake callback -> token verify/consume -> dispatch once;
- fake approval request -> originating topic approval card -> approve/reject;
- delivery retry and safe failure behavior.

## 3. S01 — OpenClaw Telegram workspace skeleton

Branch:

- `staging/package-openclaw-s01-openclaw-telegram-skeleton`

Base:

- `staging/package-openclaw`

Goal:

Create portable package skeleton focused on OpenClaw + Telegram adapter.

Expected paths:

- `packages/openclaw-adapter/README.md`
- `packages/openclaw-adapter/src/` placeholder or `.gitkeep`
- `packages/openclaw-adapter/tests/` placeholder or `.gitkeep`
- `packages/openclaw-testkit/README.md`
- `packages/openclaw-testkit/src/` placeholder or `.gitkeep`
- `packages/openclaw-testkit/tests/` placeholder or `.gitkeep`
- optional placeholder READMEs for `packages/domain-lifeos` and `packages/oca-wrapper` saying out of scope for current adapter phase.

DoD:

- no `hazeteam-core/src/*` touched;
- package responsibilities documented;
- no runtime implementation yet;
- no fake contracts yet except README outline;
- branch is portable to future `hazeteam-openclaw` repo.

## 4. S02 — Adapter contract types and static boundaries

Goal:

Add first real type/contract files and static tests.

Scope:

- channel ref types;
- topic binding types;
- channel event types;
- delivery request/result types;
- actor/permission basics;
- readiness result shape;
- static import boundary tests.

DoD:

- package exports public contract entrypoint;
- static tests prevent private core imports;
- tests prevent adapter code from entering core `src/*`;
- no real OpenClaw dependency required yet.

## 5. S03 — OpenClaw testkit fake contracts

Goal:

Create fake OpenClaw channel/runtime/storage around adapter contracts.

Scope:

- fake message event factory;
- fake callback event factory;
- fake delivery sink;
- fake runtime dispatcher;
- fake approval source;
- fake storage primitives;
- deterministic ids/clock.

DoD:

- adapter tests can build without real OpenClaw;
- fake events include chatId/messageThreadId/messageId/callbackQueryId;
- delivery sink records chatId/messageThreadId/messageId;
- no raw Telegram SDK objects.

## 6. S04 — Topic binding registry

Goal:

Implement topic binding model and in-memory store.

Scope:

- create binding;
- lookup by channel/chat/thread;
- list by workspace/agent;
- update topic display name;
- disable/archive binding;
- tests for rename-safe behavior and multi-workspace collisions.

DoD:

- missing binding safe failure helper;
- disabled binding blocks operations;
- archived binding blocks delivery;
- public-safe serialization.

## 7. S05 — Message event mapper and command parser

Goal:

Convert fake OpenClaw Telegram message events into adapter command/context or core submit input.

Scope:

- derive idempotency key;
- resolve topic binding;
- parse slash command;
- strip `/command@bot` suffix;
- actor mapping;
- externalConversationRef mapping;
- correlation id.

DoD:

- message in coder topic maps to coder agent;
- same text in reviewer topic maps to reviewer agent;
- missing thread fails safely;
- unknown topic fails safely;
- raw event not passed to core.

## 8. S06 — Minimal command registry and help/home renderers

Goal:

Implement topic-aware command registry and basic Telegram-safe rendering.

Scope:

- minimal agent UI descriptors for router/coder/reviewer fakes;
- `/help` per agent;
- `/status` per agent;
- home card renderer;
- quick action renderer with token placeholders/fakes.

DoD:

- `/help` differs by topic;
- duplicate command names across agents allowed;
- duplicate command names within one agent rejected;
- renderer target comes from topic binding.

## 9. S07 — Core host factory over fake OpenClaw runtime

Goal:

Compose `hazeteam-core` host using public exports and fake OpenClaw runtime bridge.

Scope:

- adapter core host factory;
- fake `AgentControlHost` bridge;
- in-memory core stores for dev/test;
- readiness aggregation placeholder.

DoD:

- imports only public core exports;
- fake message can reach core submit flow;
- runtime success/failure/throw normalized safely;
- no direct delivery yet unless through test hook.

## 10. S08 — Presentation renderer and delivery pump

Goal:

Deliver core outbox items to fake OpenClaw Telegram channel sink.

Scope:

- list/claim/render/send/mark delivered;
- delivery attempt record;
- mark failed;
- deliveryRef/idempotency;
- fake sink assertions.

DoD:

- pending presentation delivered to correct chat/thread;
- delivery failure marks failed safely;
- no raw error leak;
- home/status/presentation renderer contract usable.

## 11. S09 — Callback action token flow

Goal:

Handle fake Telegram callback event through core token verify/consume.

Scope:

- extract opaque `hz:<tokenRef>` payload;
- resolve topic binding;
- check permission before consume;
- verify token;
- consume token;
- dispatch or render safe result;
- replay/expired/wrong-topic tests.

DoD:

- valid callback dispatches once;
- replay does not dispatch twice;
- unauthorized click does not consume token;
- expired token safe;
- callback ack result safe.

## 12. S10 — Approval card routing

Goal:

Render OpenClaw approval requests into originating agent topic.

Scope:

- approval request contract;
- topic resolution fallback;
- approval card renderer;
- approve/reject button tokenization;
- fake approval source/resolver;
- permission tests.

DoD:

- approval from coder routes to coder topic;
- approval from reviewer routes to reviewer topic;
- missing topic uses deterministic fallback;
- approve/reject resolves fake approval once;
- public-safe logs.

## 13. S11 — End-to-end fake adapter smoke

Goal:

Prove full adapter lifecycle without real OpenClaw.

Smoke scenarios:

1. message in coder topic -> core -> fake runtime -> outbox -> delivery sink;
2. command `/help` in coder/reviewer topics -> different output;
3. action button click -> token consume once;
4. approval request -> same-topic card -> approve once;
5. delivery failure -> retry/fail-safe state.

DoD:

- acceptance test uses only fake OpenClaw testkit;
- no direct Telegram SDK;
- no core private import;
- no modification to core source.

## 14. Later waves after adapter foundation

Only after S01-S11 are stable:

- wire real OpenClaw channel event API;
- wire real OpenClaw delivery API;
- wire real OpenClaw runtime bridge;
- wire real OpenClaw approval API;
- introduce real domain package;
- introduce real OCA wrapper;
- introduce n8n/capability integrations.

## 15. Merge discipline

Every worker branch:

- base: `staging/package-openclaw`;
- target: `staging/package-openclaw`;
- never target `main`;
- include final report;
- include checks or clear tooling blocker.

Recommended check commands until package scripts exist:

- inspect diff manually;
- `npm run build` if applicable;
- `npm run test` if applicable;
- `npm run check` if applicable;
- targeted node/static tests once added.
