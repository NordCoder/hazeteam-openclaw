# Testing and Certification Guide

## Purpose

Adapter packages need more than happy-path unit tests. They sit on trust boundaries, route external events, deliver public core output, and handle replay-prone callbacks.

This guide defines the recommended test and certification matrix for adapter and extension packages built on `hazeteam-core`.

## Testing layers

A production-quality adapter should use layered tests:

1. Static boundary tests.
2. Contract/unit tests.
3. Fake integration tests.
4. Core facade integration tests.
5. Restart and durability tests.
6. Security/redaction tests.
7. Real wiring smoke tests.
8. Release certification checklist.

Not every early slice needs every layer, but each production release should have coverage across all relevant layers.

## Static boundary tests

Static tests prevent architectural drift.

Recommended checks:

- no imports from `hazeteam-core/src/**`;
- no imports from private `hazeteam-core/dist/**` implementation paths;
- no relative imports into a core checkout;
- no production imports from `hazeteam-core/tests/**`;
- no provider SDK imports in core packages;
- no bot token/API key/secret terms in public contracts;
- no raw update public field names;
- placeholder packages remain README-only until scoped;
- package TypeScript source is included in build;
- package-local tests are included in root CI.

Static tests should be deterministic and should use only local files and Node built-ins when possible.

## Public API tests

Adapter packages should pin the public core API they rely on.

Recommended tests:

- import required symbols from public subpaths;
- fail if a required public export disappears;
- verify no private import workaround exists;
- document any API gap as a failing or skipped test until core exports it;
- test adapter package public barrels.

This prevents accidental dependency on private implementation details.

## Contract tests

Contract tests validate adapter-owned DTOs and helper functions.

Examples:

- normalized inbound event contract shape;
- delivery request/result contract shape;
- readiness check result shape;
- idempotency key helpers;
- permission decision helpers;
- topic/channel binding refs;
- callback payload parser;
- safe error helpers.

Contract tests should assert that raw payloads, SDK objects, secrets, and private internals are absent.

## Mapper tests

Inbound mapper tests should cover:

- valid external message maps to expected core input;
- valid command maps to expected core input;
- valid callback maps only after token verification/consume path;
- missing binding fails safely;
- disabled/archived binding fails safely;
- wrong workspace/agent/topic fails safely;
- malformed external event fails safely;
- unsupported attachments fail safely;
- actor mapping is bounded and safe;
- idempotency keys are deterministic;
- raw provider payload does not leak.

## Delivery tests

Delivery tests should cover:

- list pending items;
- claim item;
- claim conflict;
- render simple text/card;
- render tokenized buttons;
- derive target from binding;
- reject unsafe target override;
- fake external delivery success;
- fake external delivery failure;
- mark delivered;
- mark failed;
- retryable vs non-retryable error;
- safe external message ref;
- raw provider error redaction.

## Callback and token tests

Callback tests should cover:

- valid opaque token payload;
- malformed callback payload;
- missing token;
- expired token;
- mismatched workspace;
- mismatched agent;
- mismatched outbox/action;
- mismatched external binding/topic;
- unauthorized actor does not consume token;
- valid actor consumes token exactly once;
- replay does not dispatch twice;
- consume failure prevents user intent submission;
- safe callback denial response.

## Runtime bridge tests

Runtime bridge tests should cover:

- valid dispatch to fake runtime;
- runtime returns safe success;
- runtime returns safe failure;
- runtime throws and adapter converts to safe failure;
- unsafe runtime payload is not exposed;
- missing runtime port produces safe not-configured diagnostics;
- runtime drain is one deterministic step;
- no hidden loop starts during construction.

## Approval tests

Approval tests should cover:

- approval card rendering;
- approve/reject token issue;
- permission denied before consume;
- approve consumes once;
- reject consumes once;
- replay is safe;
- wrong topic/workspace/agent denied;
- missing approval denied;
- raw approval/tool payload redacted;
- post-decision external delivery/update is safe.

## Durable store tests

Durable store tests should cover:

- schema creation;
- schema version compatibility;
- migration readiness;
- atomic outbox claim;
- atomic token consume;
- duplicate idempotency insert;
- restart reload;
- stale claim recovery;
- backend unavailable safe failure;
- serialization safety;
- concurrent workers where deployment supports them.

If the adapter uses only in-memory stores in a test slice, document that production durability is out of scope for that slice.

## Readiness and observability tests

Readiness tests should cover:

- all required ports configured;
- required port missing;
- optional port missing;
- adapter store missing;
- external channel not configured;
- runtime bridge degraded;
- permission policy missing;
- schema migration required;
- raw provider error redacted;
- status output contains no secrets;
- logs and metrics use safe bounded fields.

## Fake end-to-end tests

Fake E2E tests should prove semantics before real SDK wiring.

Recommended fake scenarios:

```text
fake external message
-> binding
-> core submitHostAction
-> fake runtime bridge
-> presentation outbox item
-> fake delivery sink
-> delivered result
```

```text
fake presentation action
-> tokenized button
-> fake callback
-> permission check
-> verify/consume token
-> submit UserIntent
-> safe response
```

```text
fake approval request
-> approval card delivery
-> approve/reject callback
-> consume once
-> safe approval result
```

Fake tests should avoid real network, real provider SDKs, and real credentials.

## Real wiring smoke tests

Real wiring smoke tests should come after fake semantics are stable.

They should be narrow and environment-gated.

Examples:

- real Telegram topic receives a safe test message;
- real OpenClaw delivery API returns safe message ref;
- real callback endpoint receives a test callback;
- real runtime bridge dispatches a no-op test action;
- readiness detects configured external dependencies.

Real smoke tests must not run in default CI unless secrets and external environment are intentionally configured.

## CI requirements

Every adapter repository should run, at minimum:

- TypeScript build for package source;
- static boundary tests;
- package-local unit tests;
- fake integration tests;
- public API import tests.

Root CI must include package-local tests. A package directory outside the root build graph can hide syntax errors and broken public barrels.

Recommended root check:

```text
npm run build
npm run test:static
npm run test:unit
npm run test
npm run check
```

`npm run check` should compile package TypeScript and run all non-external tests.

## Certification checklist

Before certifying an adapter release, verify:

1. Public imports only.
2. Package source included in CI build.
3. Package-local tests included in CI.
4. No raw provider payloads in core-facing DTOs.
5. No secrets in public contracts, logs, readiness, or errors.
6. Session binding resolves before inbound dispatch.
7. Delivery target derives from trusted binding state.
8. Outbox claim happens before external delivery.
9. Delivery success/failure is marked after attempt.
10. Action tokens are issued for external actions.
11. Permission check happens before token consume.
12. Token consume happens exactly once before side-effecting callback intent.
13. Replay does not duplicate side effects.
14. Wrong workspace/agent/topic is denied safely.
15. Runtime bridge exposes only safe results.
16. Approval flows are tokenized and replay-safe.
17. Durable stores pass restart and conflict tests.
18. Readiness distinguishes ready/degraded/not configured/failed.
19. Health/logs/metrics are redacted.
20. Real wiring smoke tests are isolated and secret-gated.
21. Documentation names production limitations.
22. Release notes include supported core version and migration notes.

## Worker prompt checklist

When giving a worker an adapter implementation task, include:

- exact branch and base;
- allowed files;
- forbidden files;
- public import rules;
- scope boundaries;
- required contract names;
- required tests;
- safety rules;
- no real SDK wiring unless explicitly in scope;
- final report template;
- merge recommendation requirement.

This keeps adapter work reviewable and prevents broad, untestable changes.

## Common test gaps

Watch for these gaps:

- root CI ignores package-local tests;
- root build ignores package TypeScript;
- tests inspect happy path only;
- callback replay not tested;
- unauthorized callback consumes token;
- delivery failure leaks provider error;
- binding mismatch silently routes to fallback;
- readiness output leaks configuration;
- fake runtime tests pass raw runtime payload through core;
- static tests allow private imports;
- real smoke tests require secrets in default CI.

## Release recommendation rule

An adapter slice should be `MERGE_READY_AFTER_CI` only when:

- scope is correct;
- changed files match allowed paths;
- local/package tests pass or tooling limitations are clearly documented;
- no safety violations exist;
- public imports are respected;
- branch is current with its base or conflicts are resolved;
- CI can actually see the files changed by the slice.

If CI does not compile or test the changed package source, do not treat green CI as sufficient.
