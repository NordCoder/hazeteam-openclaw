# Implementation waves

## S00 — workspace/docs foundation

S00 establishes the repository foundation.

- S00A owns workspace, package skeleton, tooling, CI, and first static boundary checks.
- S00B owns architecture docs, ADRs, roadmap, and the local core context digest.

S00B is docs-only and must not touch package, tooling, source, package, or test files.

## S01 — shared adapter contracts

Add shared adapter-owned contracts: refs, operation context, safe errors/results, and public barrels. No mapper, renderer, delivery pump, callback flow, runtime bridge, durable stores, or real OpenClaw/Telegram wiring.

## S02A — channel event contracts

Define normalized OpenClaw Telegram event contracts for messages, callbacks, and topic/system events. Raw Telegram/OpenClaw payloads stay outside public DTOs and may only be referenced by an opaque debug/details ref.

## S02B — delivery contracts

Define adapter delivery request/result contracts: delivery target, content, tokenized buttons, external message refs, safe delivery errors, and retryability metadata. No renderer or real delivery side effect yet.

## S02C — readiness/idempotency/permission contracts

Define adapter readiness, idempotency key, idempotency record, permission requirement, permission decision, and safe denial primitives. No store implementation, permission engine, or readiness aggregation yet.

## S03 — testkit fakes/factories

Add deterministic testkit fakes before real provider wiring.

- S03A can add fake event factories.
- S03B can add fake delivery/runtime/approval fakes after the relevant S02 contracts exist.

Keep fakes deterministic: fake events, fake delivery sink, fake runtime bridge, fake approval source/resolver, fake clock/id helpers, and safe fixture data must not require real network or credentials.

## S04 — topic binding

Implement canonical topic binding:

```text
channelId + chatId + messageThreadId
-> workspaceRef + agentRef + hostSessionRef
```

S04A can introduce the binding contract/store shell after the S02 batch. Later S04 slices can add persistence variants when scoped. Include status, safe snapshots, duplicate conflict behavior, and in-memory test support where scoped. Topic name is display-only.

## S05 — inbound mapper

Map normalized OpenClaw Telegram events into public core-facing inputs after binding resolution. Cover missing binding, disabled binding, malformed commands, unsupported attachments, deterministic idempotency, correlation propagation, and raw payload no-leak behavior.

## S06 — UI descriptors/renderer

Add topic-aware UI descriptors and renderer behavior.

- S06A can add UI/command descriptor contracts after the S02 batch.
- S06B can add renderer behavior after delivery and descriptor dependencies exist.

The renderer produces safe OpenClaw/Telegram delivery requests with escaped text, layout limits, safe fallbacks, and tokenized buttons. It should not send external messages unless a slice explicitly scopes delivery.

## S07 — core host factory

Create adapter-owned composition helpers around public `createCoreInteractionHost`. Inject required ports explicitly. Use only public `hazeteam-core` root/subpath imports. In-memory stores remain test/dev only.

## S08 — permission evaluator

Implement adapter-side permission evaluation for commands, callbacks, and approvals. External permission checks happen before token consume. Denials are safe and do not expose raw provider role/account payloads.

## S09 — delivery pump

Implement deterministic delivery drain:

```text
list pending
-> claim
-> resolve binding
-> render
-> deliver through fake or scoped delivery sink
-> mark delivered/failed
```

Scheduling, retry timers, provider rate limits, and production worker lifecycle remain adapter/deployment-owned.

## S10 — callback token flow

Implement callback parsing, binding resolution, external permission check, public token verification, consume-once handling, and user-intent submission. Unauthorized callbacks should not consume tokens by default. Replay must not dispatch twice.

## S11 — runtime bridge

Bridge public core dispatch to OpenClaw runtime behind `AgentControlHost` or another public port. Convert success, safe failure, and thrown failure into safe public results. Do not expose raw runtime payloads or SDK objects.

## S12 — approval bridge

Route approval cards and approve/reject callbacks. Approval buttons are tokenized. Permission check precedes token consume. Replay, wrong topic, wrong workspace, and wrong agent cases fail safely.

## S13 — fake E2E/no-leak matrix

Prove complete semantics without real network:

- fake message to delivery;
- callback token lifecycle;
- approval approve/reject lifecycle;
- public serialization and no-leak checks;
- readiness matrix.

Real SDK/API wiring is blocked until this wave is green.

## S14 — durable stores

Add durable adapter/core-contract store implementations where scoped. Cover atomic claim, atomic consume, idempotency uniqueness, restart/replay, stale claims, schema/migration readiness, backend failure safety, and no-leak serialization.

## S15 — real OpenClaw wiring

After fake E2E/no-leak matrix, add real OpenClaw channel event, delivery, runtime, and approval wiring. Raw payload boundaries must be explicit and real provider errors must be redacted.

## S16 — real Telegram/OpenClaw smoke

Add narrow real smokes only when the external environment is intentionally configured. These tests are gated and not part of default CI.

## S17 — deployment/release hardening

Add production readiness, health, config, credential handling docs, migration/backup notes, operations guidance, release checklist, and known limitations.

## Future OCA/domain-LifeOS layers

OCA/Codex and LifeOS are future product/composite integration layers. They must not be implemented in generic adapter foundation phases unless explicitly scoped.

## Parallelization rules

- S02A, S02B, and S02C can run in parallel after S01.
- S03A, S03B, S04A, and S06A can run in parallel after the S02 batch.
- S05, S06B, S07, and S08 can run in parallel after their relevant dependencies.
- S09, S10, S11, and S12 can run in parallel after mapper, renderer, host, and permission dependencies exist.
- Parallel workers must not import files that exist only in sibling branches.
- Real SDK/API wiring is allowed only after fake E2E/no-leak matrix.
