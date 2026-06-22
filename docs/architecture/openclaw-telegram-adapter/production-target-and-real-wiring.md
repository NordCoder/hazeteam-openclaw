# Production Target and Real OpenClaw Wiring

Status: S00 focused architecture baseline

## 1. Why fake OpenClaw appears in early phases

The early adapter phases use fake OpenClaw components deliberately.

They are not the product goal. They are test doubles used to stabilize the adapter before real OpenClaw APIs are wired.

Fake components are needed because the adapter has several high-risk invariants that must be proven independently:

- topic binding correctness;
- topic-aware command routing;
- safe mapping into `hazeteam-core`;
- outbox-driven delivery;
- tokenized callback flow;
- permission-before-consume ordering;
- approval routing to originating topic;
- no raw Telegram/OpenClaw payload leaks.

Without fakes, every worker would depend on a moving real OpenClaw runtime and Telegram environment, making regression tests fragile and slow.

## 2. What S01A-S11C produce

S01A-S11C produce an **adapter foundation release candidate**, not the final production adapter.

Expected result after S11C:

- package skeleton exists;
- adapter contracts are stable;
- fake OpenClaw testkit exists;
- topic binding registry works;
- message event mapping works;
- command routing works;
- core host composition works through public `hazeteam-core` exports;
- presentation delivery pump works against fake channel;
- callback/action token flow works;
- approval card routing works against fake approval source;
- fake end-to-end smoke tests prove the intended adapter lifecycle.

This is not yet deployable to real Telegram/OpenClaw unless real OpenClaw API shape already matches the fake contracts and only a thin binding layer remains.

## 3. Definition of production-ready adapter

The adapter is production-ready only when all of the following are true:

- it consumes real OpenClaw Telegram channel events;
- it receives real `chatId`, `messageThreadId`, `messageId`, and callback ids from OpenClaw;
- it sends real delivery requests through OpenClaw channel API;
- it can create/edit/pin topic messages if required by UI features;
- it resolves real OpenClaw runtime dispatch through `AgentControlHost`;
- it resolves real OpenClaw tool approvals;
- it uses durable storage for topic bindings, core stores, delivery attempts, idempotency, and UI message refs;
- it has real startup readiness checks;
- it has at least one real Telegram forum supergroup smoke test;
- it has safe failure behavior for missing topics, deleted topics, runtime failures, delivery failures, and replayed callbacks;
- no staging fake is used in production path except explicitly named dev/test mode.

## 4. Production milestones after fake foundation

The implementation plan must continue after S11C with real wiring phases.

## S12A — Real OpenClaw channel event adapter

Goal:

Connect the adapter to real OpenClaw Telegram channel events.

Depends on:

- S02B;
- S03A;
- S05A;
- S04A.

Required behavior:

- consume real message event shape;
- consume real callback event shape;
- preserve or map real `messageThreadId`;
- map real actor identity;
- map real message ids;
- normalize raw OpenClaw event into adapter contract;
- reject/handle missing forum topic context safely.

DoD:

- real OpenClaw event fixture maps to adapter event contract;
- unit tests cover at least message and callback;
- no raw Telegram update passed to core;
- no bot token/secret enters adapter public object;
- fake and real event paths share the same downstream mapper.

## S12B — Real OpenClaw channel delivery adapter

Goal:

Send adapter delivery requests through real OpenClaw Telegram channel delivery API.

Depends on:

- S02C;
- S08B.

Required behavior:

- send message to `chatId + messageThreadId`;
- optionally edit message if `editMessageId` provided and OpenClaw supports it;
- optionally pin home card if supported;
- return external message refs;
- normalize delivery failures with retryable flag;
- never expose raw Telegram/OpenClaw error publicly.

DoD:

- fake delivery sink still works for tests;
- real delivery adapter is isolated behind interface;
- delivery result shape matches S02C;
- delivery failure tests include retryable/non-retryable cases.

## S12C — Real topic provisioning/discovery

Goal:

Connect topic binding registry with real Telegram forum topic state exposed by OpenClaw.

Depends on:

- S04A;
- S12A;
- S12B.

Required behavior:

- read or receive topic metadata;
- bind existing topic to workspace/agent;
- update display name on rename event if available;
- optionally create missing topic if OpenClaw channel supports topic creation;
- optionally create/pin home card.

DoD:

- manual binding path works;
- topic rename does not break binding;
- deleted/closed topic fails safely;
- create-topic behavior is optional and capability-gated.

## S13A — Real OpenClaw runtime AgentControlHost bridge

Goal:

Dispatch core inbound actions into real OpenClaw agent runtime.

Depends on:

- S07A;
- S07B;
- S12A.

Required behavior:

- map core action/session/workspace/agent refs to OpenClaw runtime call;
- route to correct agent for topic;
- normalize success;
- normalize failure;
- catch thrown runtime errors;
- preserve correlation id;
- avoid raw provider/runtime payload in public output.

DoD:

- fake runtime bridge still works;
- real runtime bridge has tests with fixture/mocked OpenClaw runtime;
- runtime failure returns safe core envelope;
- no stack/raw payload leaks.

## S13B — Real OpenClaw approval bridge

Goal:

Route real OpenClaw tool approvals to the originating Telegram agent topic.

Depends on:

- S10C;
- S12B;
- S13A if approval source is runtime-bound.

Required behavior:

- receive/poll real approval requests;
- resolve originating workspace/agent/topic;
- render approval card;
- approve/reject through OpenClaw approval API;
- update UI after resolution;
- handle replay/expired/missing approval.

DoD:

- approval from real/fake OpenClaw source uses same card renderer;
- approve once works;
- reject once works;
- replay safe;
- permission denied before consume;
- safe logs.

## S14A — Durable topic/adapter state storage

Goal:

Replace in-memory adapter stores for production.

Depends on:

- S04A;
- S08C;
- S09C.

Required stores:

- topic binding store;
- UI message ref store;
- delivery attempt store;
- inbound idempotency store;
- permission binding store.

Preferred implementation:

- OpenClaw storage abstraction if available.

Fallback implementation:

- explicit SQLite/Postgres adapter only if OpenClaw storage is unavailable or intentionally bypassed.

DoD:

- storage implementation is behind interfaces;
- in-memory implementation remains test-only;
- restart simulation preserves topic bindings;
- restart simulation preserves pending delivery/idempotency enough for recovery tests.

## S14B — Durable core store wiring

Goal:

Provide durable implementations for `hazeteam-core` stores used by the adapter.

Depends on:

- S07A;
- S14A or storage substrate decision.

Required core stores:

- session binding store;
- presentation outbox store;
- action token store.

DoD:

- core host factory can run with durable stores;
- in-memory stores remain dev/test mode;
- restart simulation preserves session binding and tokens;
- action token consume remains atomic enough for replay safety.

## S15A — Real readiness and startup lifecycle

Goal:

Make adapter startup validate real dependencies before accepting traffic.

Depends on:

- S07C;
- S12A;
- S12B;
- S13A;
- S14A/S14B.

Required checks:

- OpenClaw channel connected;
- topic binding store available;
- delivery capability available;
- runtime bridge available;
- approval bridge available if configured;
- core host ready;
- durable stores ready;
- permission policy loaded.

DoD:

- readiness returns ready/degraded/not_configured/failed;
- startup can fail fast on missing required deps;
- degraded mode documented;
- readiness output is public-safe.

## S15B — Real Telegram forum smoke

Goal:

Prove the adapter works in a real or dev OpenClaw Telegram forum environment.

Depends on:

- S12A;
- S12B;
- S13A;
- S14A/S14B;
- S15A.

Smoke target:

1. real Telegram forum topic bound to `workspaceA/coder`;
2. message arrives through OpenClaw channel;
3. adapter resolves topic;
4. core submit flow runs;
5. OpenClaw runtime/fake-runtime-in-dev returns result;
6. outbox delivery posts back to same topic;
7. button callback is tokenized and consume-once;
8. replay is safe;
9. public logs contain no raw payloads/secrets.

DoD:

- manual smoke documented;
- automated smoke if environment supports it;
- screenshots/log excerpts optional but redacted;
- no staging fake path accidentally used in production config.

## S16 — Release candidate hardening

Goal:

Prepare first usable adapter RC.

Depends on:

- S15B.

Required hardening:

- config docs;
- deployment docs;
- failure modes docs;
- security/redaction checklist;
- public API export audit for adapter package;
- integration checklist with OpenClaw version/API assumptions;
- migration plan to future `hazeteam-openclaw` repo.

DoD:

- adapter can be installed/run in dev OpenClaw environment;
- known limitations documented;
- fake-only paths clearly marked test/dev;
- real OpenClaw/Telegram path has smoke evidence.

## 5. Final expected results by stage

### After S01A-S03B

You have package skeleton, contracts, and fakes. Not usable as product.

### After S04A-S07C

You have working adapter logic up to fake runtime/core host. Not usable as product, but most semantics are implemented.

### After S08A-S11C

You have fake end-to-end adapter foundation. This is a strong integration test harness and adapter RC against fake OpenClaw.

### After S12A-S15B

You have a real OpenClaw + Telegram adapter that should work in a dev/staging OpenClaw environment.

### After S16

You have a release-candidate adapter with docs, readiness, smoke coverage, and clear production limitations.

## 6. Practical recommendation

Do not skip fake phases.

But also do not treat fake end-to-end as final success.

The correct interpretation is:

```text
S01-S11 = prove adapter semantics without unstable platform dependency.
S12-S16 = wire to real OpenClaw/Telegram and make it usable.
```

Worker prompts should explicitly state whether they are building:

- fake/test foundation;
- real OpenClaw wiring;
- production readiness.
