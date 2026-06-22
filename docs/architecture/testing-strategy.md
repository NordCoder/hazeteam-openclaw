# Testing strategy

## Purpose

The adapter sits on trust boundaries: external events, callback payloads, transport delivery, runtime bridge, approval UI, durable stores, and public core envelopes. Tests must protect the boundary, not only the happy path.

## Test layers

### Static boundary tests

Static tests should fail when code violates architecture rules:

- imports from `hazeteam-core/src/**`;
- private `hazeteam-core/dist/**` implementation imports;
- relative imports into a core checkout;
- production imports from `hazeteam-core/tests/**`;
- raw Telegram/OpenClaw payload field names in public contracts;
- obvious secret-bearing fields in public DTOs;
- placeholder packages becoming active outside their scoped phase;
- package source or package-local tests excluded from root checks;
- implementation directories appearing before their phase;
- sibling branch modules being imported by parallel leaf slices.

### Public import tests

Public import tests should import required symbols only from public `hazeteam-core` root/subpaths and local package barrels. A missing public core symbol should be reported as an API gap rather than bypassed with a private import.

### Contract tests

Contract tests validate pure adapter-owned DTOs and helpers:

- shared refs and safe result/error helpers;
- normalized channel event shapes;
- delivery request/result shapes;
- readiness/idempotency/permission primitives;
- topic binding keys and snapshots;
- tokenized callback payload parser;
- no raw provider payload or secret fields in public contracts.

### Fan-in export snapshots

Every parallel wave that has multiple leaves must end with a fan-in export snapshot when leaves need public barrels or global static boundaries.

Fan-in tests should assert:

- all intended runtime exports exist from package root and subpath barrels;
- TypeScript-only types are not asserted as runtime values;
- shared static boundaries reflect all merged leaves;
- future-phase files and directories are still absent;
- no leaf lost its tests or exports during merge conflict resolution.

### Package-local unit tests

Package-local unit tests cover implementation units without real network or provider SDKs:

- topic binding lookup and status behavior;
- inbound mapper success/failure cases;
- renderer escaping, layout, and tokenized buttons;
- permission evaluator allow/deny decisions;
- callback parser and safe errors;
- runtime bridge safe success/failure conversion.

### Fake integration tests

Fake integration tests connect adapter components to public core surfaces without real OpenClaw or Telegram:

```text
fake event
-> binding
-> mapper
-> createCoreInteractionHost
-> fake AgentControlHost
-> public envelope
```

They should also cover delivery claim/mark flows and callback verify/consume flows using public core imports only.

### Fake E2E

Fake E2E is required before real wiring:

- fake message -> binding -> mapper -> core host -> fake runtime -> presentation outbox -> fake delivery;
- fake action button -> callback -> permission -> verify/consume -> user intent;
- fake approval -> approval card -> approve/reject callback -> safe resolution;
- readiness matrix over missing/degraded/ready adapter components.

### No-leak serialization tests

No-leak tests should assert that public outputs, logs, readiness, health, and delivery/callback errors do not contain:

- raw Telegram updates;
- raw OpenClaw runtime objects;
- provider SDK objects;
- raw callback bodies;
- bot credentials;
- database URLs;
- host filesystem paths;
- stack traces;
- raw approval/tool payloads;
- unbounded provider error bodies.

### Durable restart/replay tests

Durable store tests are required before production durability claims:

- topic binding restart reload;
- duplicate topic binding conflict;
- inbound idempotency duplicate;
- outbox claim conflict;
- callback replay duplicate;
- token consume conflict;
- crash between claim and delivery;
- crash between delivery and mark delivered;
- crash between callback receive and token consume;
- crash between token consume and intent submit;
- schema migration readiness;
- backend unavailable safe failure.

### Real smoke tests

Real Telegram/OpenClaw smoke tests are opt-in, secret-gated, and not default CI. They may cover:

- real OpenClaw channel readiness;
- real Telegram topic delivery of a safe test message;
- real callback acknowledgement path;
- real runtime no-op dispatch;
- real approval source/resolver smoke.

These tests must have cleanup behavior and must not require secrets in ordinary CI.

## CI expectations

Root CI must see package source and package-local tests. A green root check is not sufficient if it ignores `packages/**/src` or package-local tests.

Recommended default layers for non-real CI:

- build/typecheck package source;
- static boundary tests;
- public import tests;
- package-local unit tests;
- contract tests;
- fan-in export snapshots when their phases exist;
- fake integration tests;
- fake E2E/no-leak tests when their phases exist.

## Merge readiness rule

A slice is merge-ready only when changed files match scope, public imports are respected, no future phase has been implemented accidentally, relevant checks pass or tooling limitations are reported, and no raw payload or secret leakage is introduced.

For parallel waves, individual leaves can be merge-ready without public barrel exposure only if the wave plan explicitly assigns public exposure to a later fan-in slice. The wave itself is not complete until fan-in is merged.
