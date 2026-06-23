# Extension and Plugin Taxonomy

## Purpose

This document classifies the kinds of packages that may be built around `hazeteam-core`.

The goal is to prevent boundary confusion. Not every extension is a transport adapter, not every runtime bridge is a product package, and not every durable implementation belongs in core.

`hazeteam-core` stays transport-neutral and domain-neutral. Extensions are external packages that depend on public core contracts and provide concrete integration, infrastructure, runtime, product, or deployment behavior.

## Taxonomy overview

Common extension categories:

1. Transport adapter.
2. Runtime bridge.
3. Durable store package.
4. Product/domain package.
5. Presentation renderer.
6. Permission/policy adapter.
7. Observability plugin.
8. Lifecycle/migration plugin.
9. Testkit/simulator package.
10. Deployment package.
11. Composite product integration.

A single repository may contain multiple categories, but each package or module should declare which role it plays.

## 1. Transport adapter

A transport adapter connects an external communication channel to core-facing adapter flows.

Examples:

- Telegram adapter;
- Slack adapter;
- Discord adapter;
- email adapter;
- web dashboard adapter;
- CLI adapter;
- webhook/API adapter;
- mobile push adapter.

### Responsibilities

A transport adapter owns:

- receiving external messages/events;
- external callback endpoint or callback event handling;
- external delivery API calls;
- external message formatting rules;
- external channel/conversation/thread/topic identity;
- provider rate limits and acknowledgement rules;
- provider SDK/client lifecycle;
- transport-specific error mapping;
- transport readiness checks;
- safe rendering of core output.

### Core-facing responsibilities

It should translate external events into:

- safe actor refs;
- safe external conversation refs;
- binding lookup keys;
- `HostInboundAction` or `UserIntent` inputs;
- public delivery result values;
- safe readiness/health output.

### Must not own

A transport adapter must not:

- define core runtime semantics;
- mutate workflow state directly;
- bypass presentation outbox claim lifecycle;
- bypass token verify/consume;
- store raw provider payloads in core values;
- import private core files.

## 2. Runtime bridge

A runtime bridge connects core host/runtime surfaces to an external runtime or orchestrator.

Examples:

- OpenClaw runtime bridge;
- Codex worker bridge;
- local worker runtime;
- queue-backed runtime bridge;
- domain-specific automation runtime;
- remote execution bridge.

### Responsibilities

A runtime bridge owns:

- implementing `AgentControlHost` or other public runtime-facing ports;
- mapping core host actions to external runtime calls;
- converting runtime success/failure into safe core-facing results;
- managing external runtime clients and credentials outside core;
- runtime readiness and health checks;
- runtime-specific telemetry and safe diagnostics;
- adapter/deployment-owned retry or scheduling where not core-owned.

### Must not own

A runtime bridge must not:

- expose raw runtime objects through core values;
- leak tool payloads, logs, secrets, or stack traces;
- start hidden core-owned daemons;
- mutate core workflow/runtime internals directly;
- override core policy, approval, retry, or dead-letter semantics.

## 3. Durable store package

A durable store package implements public core store contracts or adapter-owned integration stores using a real backend.

Examples:

- SQLite host session binding store;
- Postgres presentation outbox store;
- Redis idempotency store;
- OpenClaw storage API store;
- object-store backed artifact/ref store;
- adapter topic binding store.

### Responsibilities

A durable store package owns:

- backend connection lifecycle;
- schema definitions;
- migrations;
- atomic claim/consume/idempotency semantics;
- restart behavior;
- safe serialization boundary;
- backend readiness checks;
- concurrency behavior in the supported deployment mode.

### Must preserve

When implementing a public core store contract, it must preserve:

- public contract shape;
- validation expectations;
- outbox claim semantics;
- action token consume-once behavior;
- idempotency uniqueness where applicable;
- safe public serialization;
- failure semantics.

### Must not own

A durable store package must not:

- change core lifecycle semantics;
- add product-specific behavior to generic core stores;
- expose connection strings or storage paths in public outputs;
- hide a global production store inside core constructors.

## 4. Product/domain package

A product/domain package defines product vocabulary, workflows, commands, and domain-specific behavior.

Examples:

- LifeOS domain package;
- CRM assistant package;
- finance/reconciliation workflow package;
- support-agent package;
- project-management workflow package;
- domain-specific approval catalog.

### Responsibilities

A product/domain package owns:

- product commands;
- domain entities and vocabulary;
- workflow catalogs;
- domain-specific renderable summaries;
- product permission concepts;
- product-specific agent descriptors;
- domain-specific validation and policies;
- product test fixtures.

### Relationship to core

Product packages may use public core contracts to:

- describe agents;
- register workflows;
- render presentation payloads;
- map domain actions into core workflows;
- interpret safe execution results.

### Must not own

A product package must not:

- modify core semantics;
- place product vocabulary in generic core modules;
- bypass core approval/runtime/policy paths;
- depend on a specific transport unless intentionally coupled through an adapter package.

## 5. Presentation renderer

A presentation renderer maps core presentation payloads into external UI or transport-specific messages.

Examples:

- Telegram markdown renderer;
- Telegram inline keyboard renderer;
- Slack blocks renderer;
- Discord embed renderer;
- email HTML/text renderer;
- web dashboard card renderer;
- CLI renderer.

### Responsibilities

A renderer owns:

- external markup escaping;
- layout limits;
- message length handling;
- button grouping;
- attachment presentation;
- safe fallback content;
- tokenized action payload construction;
- provider-specific UI conventions.

### Must not own

A renderer must not:

- deliver messages by itself unless explicitly combined with a delivery adapter;
- embed raw action payloads in callbacks;
- expose unsafe presentation metadata;
- mutate outbox state;
- consume tokens;
- make runtime decisions.

A clean renderer should usually produce an adapter-owned delivery request DTO.

## 6. Permission/policy adapter

A permission adapter maps external authorization context into safe allow/deny decisions for adapter flows.

Examples:

- Telegram admin/member permission checker;
- OpenClaw role adapter;
- organization/team permission backend;
- workspace membership adapter;
- approval-role adapter;
- command allowlist adapter.

### Responsibilities

A permission adapter owns:

- external actor lookup;
- external role/group membership lookup;
- external channel/topic permissions;
- adapter command permission checks;
- callback permission checks before token consume;
- safe denial codes and messages;
- permission readiness/degraded state.

### Relationship to core policy

External permissions do not replace core policy.

External permission answers:

```text
may this external actor invoke this adapter action in this external context?
```

Core policy answers:

```text
may this core action proceed under core policy/workflow semantics?
```

Both may be required.

### Must not own

A permission adapter must not:

- consume core action tokens before denying unauthorized actors;
- treat callback payload parsing as authorization;
- bypass core policy and approval semantics;
- expose raw role payloads or identity tokens in core values.

## 7. Observability plugin

An observability plugin exports safe diagnostics, logs, metrics, or traces to external systems.

Examples:

- OpenTelemetry exporter;
- JSON log sink;
- Prometheus metrics endpoint;
- status dashboard;
- OpenClaw health card publisher;
- Telegram admin status publisher;
- alerting integration.

### Responsibilities

An observability plugin owns:

- exporter/client lifecycle;
- metric naming;
- bounded labels;
- redaction;
- trace propagation;
- safe log formatting;
- delivery of status summaries;
- operational alerting.

### Must not own

An observability plugin must not:

- scrape private mutable core internals;
- log raw provider payloads;
- expose secrets, paths, tokens, or stack traces;
- use high-cardinality unsafe labels;
- mutate runtime/workflow/outbox/token state.

## 8. Lifecycle/migration plugin

A lifecycle or migration plugin owns deployment-time compatibility, schema, backup, and migration behavior.

Examples:

- adapter schema migration runner;
- backup/export/restore provider;
- compatibility gate;
- startup readiness gate;
- destructive migration approval tool;
- deployment version reporter.

### Responsibilities

A lifecycle plugin owns:

- adapter schema version tracking;
- migration planning;
- migration execution outside core;
- backup requirements;
- compatibility checks;
- startup/write gates;
- safe migration status output;
- deployment rollback notes.

### Must not own

A lifecycle plugin must not:

- run destructive migrations hidden inside core constructors;
- expose storage roots or connection strings in public status;
- mutate core state through private files;
- bypass public store contracts.

## 9. Testkit/simulator package

A testkit package provides deterministic fakes, factories, and acceptance references for adapter packages.

Examples:

- fake OpenClaw Telegram event factory;
- fake delivery sink;
- fake runtime bridge;
- fake approval source;
- fake clock/id generator;
- adapter E2E harness;
- generic external adapter simulator.

### Responsibilities

A testkit owns:

- deterministic fake events;
- fake stores where appropriate;
- fake delivery results;
- fake runtime success/failure/throw modes;
- replay/idempotency scenarios;
- safe fixture data;
- helpers for package-local tests.

### Must not own

A testkit must not:

- become production runtime code;
- require real external credentials;
- perform real network calls by default;
- hide production semantics behind fake-only behavior;
- import private core internals as a shortcut.

## 10. Deployment package

A deployment package wires configured adapter components into a runnable service or process.

Examples:

- OpenClaw adapter service;
- Telegram bot deployment package;
- Docker image entrypoint;
- Kubernetes chart;
- local dev process;
- worker process for delivery pump/runtime drain.

### Responsibilities

A deployment package owns:

- configuration loading;
- secrets access;
- process lifecycle;
- external client construction;
- scheduling loops;
- graceful shutdown;
- readiness/liveness endpoints;
- logging/metrics exporters;
- real environment wiring.

### Must not own

A deployment package must not:

- change core semantics;
- bypass adapter package contracts;
- embed secrets in code;
- treat fake stores as production unless explicitly non-production;
- merge raw external payloads into core values.

## 11. Composite product integration

A composite product integration combines multiple extension categories.

Example: an OpenClaw Telegram LifeOS integration may include:

- OpenClaw runtime bridge;
- Telegram transport adapter;
- topic binding durable store;
- Telegram renderer;
- OpenClaw permission adapter;
- LifeOS domain package;
- observability/status publisher;
- deployment package.

Composite integrations should keep module boundaries explicit. The repository may be integrated, but each layer should have clear responsibilities.

## Layering examples

### OpenClaw Telegram adapter stack

```text
Telegram/OpenClaw raw channel edge
-> transport adapter normalizes message/callback/system events
-> topic binding resolves workspace/agent/session
-> core facade handles inbound/presentation/token/runtime semantics
-> OpenClaw runtime bridge dispatches actions
-> presentation renderer creates Telegram delivery requests
-> delivery adapter sends through OpenClaw Telegram channel
-> callback handler verifies permissions and consumes tokens
```

### Web dashboard adapter stack

```text
HTTP request/websocket event
-> web adapter validates session/account
-> binding maps dashboard route to workspace/agent/session
-> core facade handles intent/presentation/token state
-> web renderer maps presentation to card JSON
-> browser callback posts tokenized action
-> adapter verifies permission/token and submits intent
```

### CLI adapter stack

```text
CLI command args
-> CLI parser normalizes command
-> local binding selects workspace/agent/session
-> core facade handles intent
-> CLI renderer prints safe envelope/presentation output
-> tokenized follow-up actions use local prompt/session state
```

## Dependency direction rules

Recommended dependency direction:

```text
product/domain package -> core public contracts
transport adapter -> core public contracts + adapter contracts
runtime bridge -> core public contracts + runtime SDK
renderer -> adapter contracts + core presentation DTOs
store package -> core public store contracts + backend driver
observability plugin -> safe DTOs/envelopes + exporter SDK
deployment package -> all selected packages + config/secrets
```

Forbidden dependency direction:

```text
core -> Telegram SDK
core -> OpenClaw SDK
core -> product/domain package
core -> database driver for adapter stores
core -> deployment package
core -> external observability exporter
```

## Package naming guidance

Recommended naming should make responsibility obvious.

Examples:

- `@hazeteam/openclaw-adapter` for OpenClaw integration contracts and adapter logic;
- `@hazeteam/openclaw-testkit` for fakes/factories;
- `@hazeteam/telegram-renderer` if rendering is split out;
- `@hazeteam/openclaw-store-postgres` for durable stores;
- `@hazeteam/domain-lifeos` for product/domain behavior;
- `@hazeteam/openclaw-deployment` for process wiring.

Avoid names that imply core owns provider behavior.

## Boundary declaration template

Every extension package should document:

```text
Package role:
Primary owned responsibilities:
Core public imports used:
External dependencies owned:
Durable state owned:
Runtime side effects owned:
Safe outputs:
Explicit non-goals:
Production readiness requirements:
```

This template should appear in the package README or architecture docs.

## Review checklist

When reviewing an extension package, ask:

1. What category is this package?
2. Does it import only public core entrypoints?
3. Does it own any external SDKs or credentials? If yes, are they outside core?
4. Does it preserve core lifecycle semantics?
5. Does it introduce hidden background behavior?
6. Does it leak raw payloads, secrets, paths, or stack traces?
7. Does it have package-local tests in CI?
8. Does it document durable state and restart guarantees?
9. Does it define readiness and safe failure behavior?
10. Does it belong in core, or should it remain an external package?

## Rule of thumb

If code needs a provider SDK, product vocabulary, durable backend driver, deployment secret, callback endpoint, process scheduler, or real network connection, it almost certainly does not belong in `hazeteam-core`.

If code defines a deterministic transport-neutral contract, validator, public serializer, safe envelope, state transition, or in-memory test implementation for a public core concept, it may belong in `hazeteam-core`.
