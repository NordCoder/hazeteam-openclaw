# Adapter Implementation Roadmap

## Purpose

This roadmap gives a reusable phase model for building external adapter packages on top of `hazeteam-core`.

It is intentionally generic enough for Telegram, Slack, web, CLI, OpenClaw, durable store packages, runtime bridges, and composite product integrations. OpenClaw Telegram is used as the reference target in several examples, but the sequencing applies to other adapters as well.

## Roadmap principles

1. Start with contracts and boundaries before implementation.
2. Build fake/testkit semantics before real provider wiring.
3. Keep every phase small enough to review.
4. Make CI see the package source and package-local tests from the first real code slice.
5. Keep core imports public-only.
6. Preserve core lifecycle semantics instead of reimplementing them privately.
7. Add durable/restart/replay behavior before production wiring.
8. Gate real external tests behind environment/secrets.

## Phase 00 — Repository/package foundation

Goal:

- create package skeleton;
- configure TypeScript/build/test tooling;
- add CI;
- add static boundary tests;
- document package scope.

Required outputs:

- package README;
- `package.json` scripts;
- TypeScript config;
- root CI that compiles package source;
- root CI that runs package-local tests;
- static boundary tests.

DoD:

- `npm run check` or equivalent compiles package source and runs local tests;
- no package source sits outside CI;
- no real provider SDK wiring unless explicitly scoped.

## Phase 01 — Shared adapter contracts

Goal:

- define package-local refs, safe errors, operation result types, and common helpers.

Required outputs:

- common refs;
- operation context/correlation refs;
- safe error type;
- success/failure result helpers;
- public barrel exports;
- unit tests.

DoD:

- contracts are pure;
- no real SDK imports;
- no private core imports;
- public barrel is tested.

## Phase 02 — External channel/event contracts

Goal:

- define normalized external event contracts owned by the adapter.

Examples:

- Telegram message event;
- callback event;
- topic/system event;
- Slack event;
- webhook event;
- CLI command event.

DoD:

- event contracts are normalized, not raw provider payloads;
- raw payload can only be referenced by opaque debug ref;
- actor and attachment refs are safe;
- event discriminants are stable;
- tests forbid raw update fields.

## Phase 03 — Delivery request/result contracts

Goal:

- define adapter-owned delivery request/result shapes.

Required concepts:

- delivery target;
- content;
- tokenized action buttons;
- external message ref;
- safe delivery error;
- delivery result discriminant.

DoD:

- delivery target is explicit;
- action payloads are tokenized/opaque;
- errors are safe and retryability-aware;
- no renderer or delivery pump yet unless scoped.

## Phase 04 — Readiness, idempotency, and permission primitives

Goal:

- define support contracts for later production flows.

Required concepts:

- adapter readiness status;
- component check result;
- inbound/delivery/callback idempotency keys;
- permission requirement and decision;
- safe denial reasons.

DoD:

- helpers are pure and deterministic;
- no store implementation;
- no permission engine;
- no readiness aggregation implementation.

## Phase 05 — Testkit factories and fakes

Goal:

- make adapter behavior testable before real provider wiring.

Required fakes:

- event factories;
- fake delivery sink;
- fake runtime bridge;
- fake approval source/resolver;
- fake clock/id generator;
- fake stores where needed.

DoD:

- no real network;
- deterministic ids/timestamps;
- success/failure/throw modes;
- unsafe payload attempts are testable.

## Phase 06 — Binding store and external identity resolution

Goal:

- implement adapter-owned external conversation/session binding.

Examples:

- Telegram topic binding;
- Slack channel/thread binding;
- web route/session binding;
- CLI local workspace binding.

DoD:

- lookup by external coordinates;
- lookup by workspace/agent/session where needed;
- create/upsert policy;
- disabled/archived behavior;
- duplicate conflict handling;
- safe serialization;
- no display-name canonical identity.

## Phase 07 — Inbound mapper

Goal:

- map normalized external events into public core inputs.

DoD:

- binding resolution before dispatch;
- actor mapping safe;
- idempotency key deterministic;
- correlation id propagated;
- malformed/missing/unauthorized cases safe;
- no raw provider payload enters core values.

## Phase 08 — Command router and UI descriptors

Goal:

- define adapter-owned command parsing and agent/UI descriptor model.

DoD:

- commands are topic/session/context aware;
- native provider command limits are respected;
- descriptors are safe and product-neutral where intended;
- duplicate command conflicts tested;
- no runtime dispatch yet unless scoped.

## Phase 09 — Renderer

Goal:

- map core or adapter presentation DTOs into adapter delivery requests.

DoD:

- safe text fallback;
- provider markup escaping;
- tokenized buttons;
- layout limits;
- missing binding failure;
- no external send side effect inside pure renderer unless package intentionally combines renderer/delivery.

## Phase 10 — Core host factory

Goal:

- create adapter-owned composition helper around `createCoreInteractionHost` using public core imports only.

DoD:

- required ports injected explicitly;
- in-memory stores only for tests/dev;
- fake runtime bridge works;
- readiness can report missing/degraded ports safely;
- no private core imports.

## Phase 11 — Runtime bridge

Goal:

- bridge validated core host actions to the external runtime.

Examples:

- OpenClaw runtime bridge;
- local worker bridge;
- Codex/OCA bridge;
- queue-backed runtime bridge.

DoD:

- valid dispatch success;
- safe failure;
- thrown runtime error redacted;
- unsafe runtime payload does not leak;
- runtime readiness reported safely.

## Phase 12 — Delivery pump

Goal:

- implement adapter-owned deterministic delivery drain operation.

Canonical operation:

```text
list pending
-> claim
-> render
-> deliver externally/fake sink
-> mark delivered/failed
```

DoD:

- claim before delivery;
- target from binding;
- success marks delivered;
- failure marks failed safely;
- duplicate drain does not duplicate delivery;
- scheduling remains outside core.

## Phase 13 — Callback parser and token flow

Goal:

- implement callback parsing, permission gate, token verify/consume, and intent submission.

DoD:

- opaque token payload;
- permission before consume;
- verify expected context;
- consume exactly once;
- replay safe;
- wrong workspace/agent/topic safe;
- malformed callback safe.

## Phase 14 — Approval bridge

Goal:

- implement adapter-owned approval UI/source/resolution flow.

DoD:

- approval card routing;
- approve/reject tokenized;
- permission before consume;
- approve/reject consumes once;
- replay safe;
- raw approval payload redacted.

## Phase 15 — Fake end-to-end acceptance

Goal:

- prove complete semantics without real provider/network.

Required scenarios:

- fake message -> binding -> core -> fake runtime -> outbox -> fake delivery;
- fake action button -> callback -> verify/consume -> user intent;
- fake approval -> card -> approve/reject -> safe resolution;
- readiness matrix.

DoD:

- no real network/secrets;
- public envelopes safe;
- replay/mismatch/unauthorized cases tested;
- logs/output redacted.

## Phase 16 — Durable stores

Goal:

- replace dev/in-memory stores with durable implementations where production requires them.

DoD:

- schema versioning;
- migration readiness;
- atomic claim;
- atomic consume;
- idempotency uniqueness;
- restart simulation;
- stale claim handling;
- backend errors safe;
- no backend internals leaked.

## Phase 17 — Real external event wiring

Goal:

- connect real provider/OpenClaw external event source to normalized adapter contracts.

DoD:

- raw payload boundary explicit;
- normalized events safe;
- real provider errors redacted;
- environment-gated real smoke tests;
- no real tests in default CI without secrets.

## Phase 18 — Real delivery wiring

Goal:

- send adapter delivery requests through real provider/OpenClaw delivery APIs.

DoD:

- external target from binding;
- safe external message refs;
- provider failure safe;
- rate-limit behavior documented;
- real smoke secret-gated.

## Phase 19 — Real runtime and approval wiring

Goal:

- connect runtime and approval bridges to real OpenClaw/product runtime.

DoD:

- safe runtime success/failure;
- approval source/resolver safe;
- no raw runtime payload leakage;
- readiness covers runtime/approval;
- real smoke secret-gated.

## Phase 20 — Production readiness and deployment hardening

Goal:

- make the adapter operationally deployable.

Required outputs:

- config docs;
- secret handling docs;
- readiness/health endpoints or status surface;
- migration/backup plan;
- deployment examples;
- logging/metrics guidance;
- failure mode docs.

DoD:

- no secrets in repo;
- readiness distinguishes ready/degraded/not configured/failed;
- restart/replay tests pass;
- release checklist passes.

## Phase 21 — Release candidate certification

Goal:

- certify adapter package for production or controlled pilot.

DoD:

- public import audit;
- safe serialization audit;
- replay matrix;
- delivery failure matrix;
- durable restart matrix;
- readiness matrix;
- real smoke test evidence;
- version compatibility docs;
- known limitations documented.

## Parallelization guidance

Safe parallel groups:

- event contracts, delivery contracts, and readiness/idempotency/permission primitives after shared contracts;
- testkit event factories after event contracts;
- fake delivery/runtime fakes after delivery/support contracts;
- renderer and binding store after delivery/event contracts;
- callback flow after token/support contracts and binding;
- approval flow after renderer/callback primitives;
- durable stores after fake semantics stabilize.

Avoid parallelizing:

- phases that both edit public barrels without merge planning;
- real provider wiring before fake semantics;
- durable stores before contracts are stable;
- callback consume flow before permission and binding model exist.

## Branching guidance

Use small branches with explicit scope.

Recommended branch naming:

```text
contracts/<adapter>-events
contracts/<adapter>-delivery
impl/<adapter>-topic-binding
impl/<adapter>-inbound-mapper
impl/<adapter>-delivery-pump
impl/<adapter>-callback-token-flow
test/<adapter>-e2e-fake-smoke
docs/<adapter>-release-hardening
```

Each worker prompt should include:

- base branch;
- target branch;
- allowed files;
- forbidden files;
- exact contracts or behavior required;
- non-goals;
- required checks;
- final report template.

## Merge readiness rule

A slice is merge-ready only when:

- changed files match scope;
- implementation stays within phase boundary;
- public imports only;
- static boundaries pass;
- package source is included in build;
- package-local tests run in CI;
- safe serialization/redaction rules are preserved;
- no real provider/secrets appear unless explicitly scoped;
- branch is current with base or conflicts are resolved.

Green CI is not sufficient if CI does not see the changed package source.
