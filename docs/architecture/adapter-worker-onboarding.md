# Adapter worker onboarding

This guide is the worker-facing mental model for `hazeteam-openclaw`. Read it before implementing adapter slices, especially after the contract and testkit foundation is in place.

## What this repository is

`hazeteam-openclaw` is an external OpenClaw/Telegram adapter and product repository built over `hazeteam-core`.

The adapter is an anti-corruption layer between two worlds:

```text
OpenClaw / Telegram / product runtime
-> hazeteam-openclaw safe adapter boundary
-> hazeteam-core public API
```

`hazeteam-core` stays transport-neutral and domain-neutral. This repository owns OpenClaw/Telegram-specific contracts, normalized events, topic binding, rendering, delivery, callbacks, runtime and approval bridges, durable adapter stores, real OpenClaw wiring, and future product layers.

The adapter may use OpenClaw/Telegram concepts internally, but it must not push those concepts into `hazeteam-core` or bypass core public APIs.

## Target runtime flow

The intended full flow is:

```text
Telegram user
-> OpenClaw Telegram channel edge
-> normalized adapter event
-> topic binding lookup
-> inbound mapper
-> hazeteam-core interaction host
-> OpenClaw runtime bridge behind public core ports
-> core presentation outbox / action token flow
-> adapter renderer
-> adapter delivery pump
-> OpenClaw Telegram delivery
-> Telegram forum topic
```

Raw provider objects, SDK clients, deployment handles, stack traces, and private platform state must not cross into core values or public adapter DTOs. Use bounded safe refs, safe summaries, and adapter-owned state instead.

## Current implementation stage

The repository is currently in the adapter foundation stage.

Implemented foundations include:

- workspace/package skeleton and CI;
- shared adapter-owned contracts;
- channel event, delivery, readiness, idempotency, and permission contracts;
- deterministic Telegram event factories in the testkit;
- fake delivery, fake runtime, and fake approval primitives;
- topic binding contracts and an in-memory binding store;
- UI and command descriptor primitives.

The next expected step after the W3 leaves is the W3E fan-in slice. W3E should expose already-merged W3 modules through the intended barrels and static/public boundary tests. It should not add new behavior.

## Layer map

Use this map to decide where a change belongs.

| Layer | Path | Owns | Must not own |
| --- | --- | --- | --- |
| Adapter contracts | `packages/openclaw-adapter/src/contracts/**` | Safe adapter DTOs, refs, delivery/readiness/idempotency/permission contracts | Runtime implementation, provider SDK calls, durable storage |
| Topic binding | `packages/openclaw-adapter/src/binding/**` | External topic identity to workspace/agent/session binding model and stores | Event mapping, delivery pump, command routing |
| Commands/UI descriptors | `packages/openclaw-adapter/src/commands/**` | Safe command descriptors and Telegram-safe UI descriptors | Command execution, callback endpoint, provider calls |
| Test event factories | `packages/openclaw-testkit/src/events/**` | Deterministic fake OpenClaw/Telegram event creation | Real provider events, SDK objects |
| Test fakes | `packages/openclaw-testkit/src/fakes/**` | Fake delivery/runtime/approval surfaces for deterministic tests | Real network, real platform integration |
| Root barrels / public snapshots / static boundaries | package roots and `tests/static/**` | Fan-in exports and repository boundary assertions | Leaf feature behavior |
| Future runtime adapter | future scoped adapter files | Mapper, renderer, host factory, delivery pump, callbacks, bridges | Core private imports or core semantic changes |

If a change seems to touch several layers, split it. A worker slice should usually own one row of this table plus local tests.

## Core boundary rules

Adapter code may read `hazeteam-core` docs, source, and tests for understanding. Production adapter code must import only public `hazeteam-core` root or declared public subpaths.

Never import:

- `hazeteam-core/src/**`;
- private `hazeteam-core/dist/**` implementation paths;
- relative paths into a checked-out core repository;
- production code from `hazeteam-core/tests/**`.

If the adapter needs a symbol that is not public in core, report a core API gap. Do not work around it with private imports.

## Topic binding model

A Telegram topic is a UI surface, not core identity.

Canonical external topic identity is based on:

```text
channelId + chatId + messageThreadId
```

Canonical binding value points to adapter/core-facing refs such as:

```text
workspaceRef + agentRef + hostSessionRef
```

Topic names are display metadata only. They may change and must not be used as routing authority.

Delivery targets and callback context must be derived from trusted binding state, not from message text, topic title, rendered presentation metadata, or callback payload contents.

## Callback and action token rule

Callback payloads should be opaque references, not embedded commands or provider objects. The canonical shape is:

```text
hz:<opaque-token-ref>
```

The adapter must resolve topic binding and check external permission before consuming the core action token. Unauthorized callbacks should not burn the token by default. Replay must not dispatch twice.

## Fake-first rule

Real OpenClaw/Telegram wiring must not come before fake E2E and no-leak coverage.

Implementation should progress through safe layers:

```text
contracts
-> testkit fakes
-> topic binding
-> mapper
-> renderer
-> core host factory
-> fake runtime/delivery/approval flow
-> callback/token flow
-> fake E2E and no-leak matrix
-> durable stores
-> real OpenClaw wiring
-> secret-gated real smoke
```

Before real wiring, workers should use deterministic fake surfaces and tests. Real provider APIs, bot listeners, webhooks, network delivery, deployment handles, and durable infrastructure are allowed only in explicitly scoped later slices.

## Leaf slice vs fan-in slice

Most implementation work is a leaf slice:

- changes one isolated area;
- adds local unit tests;
- does not touch root package barrels;
- does not touch public export snapshot tests;
- does not touch global static boundary tests;
- does not import sibling branch-only files.

A fan-in slice is different:

- it runs after leaf slices are merged;
- it updates barrels and public/static boundary tests;
- it exposes already-merged modules;
- it must not add new feature behavior.

If a worker prompt says a slice is a leaf, do not edit shared barrels or static boundary files. If public exports are missing, that is probably the next fan-in slice, not a reason to widen scope.

## Worker decision checklist

Before changing files, answer these questions:

1. Is this a leaf slice or a fan-in slice?
2. Which layer owns the change?
3. Are all dependencies already in the base branch?
4. Are public exports intentionally in scope?
5. Are real provider/network/durable behaviors explicitly allowed?
6. Does any data cross from OpenClaw/Telegram into core? If yes, is it normalized and safe?
7. Does the change depend on sibling branch-only files? If yes, stop or wait for merge.
8. Can the behavior be tested with deterministic fakes before real wiring?

## What good worker output looks like

A good slice is small, boring, and reviewable:

- the changed files match the assigned layer;
- tests import built dist subpaths or public surfaces according to the slice goal;
- unsafe/raw provider fields are rejected, redacted, or represented as safe refs;
- no package manifests, docs, CI, barrels, or static tests changed unless explicitly allowed;
- no future phase behavior is implemented early;
- checks are run when tooling supports them.

The main failure mode to avoid is implementing a future runtime path while working in a contract, fake, binding, descriptor, or fan-in phase.

## Reading order for new workers

1. `docs/README.md`
2. `docs/architecture/core-boundary.md`
3. `docs/architecture/openclaw-telegram-adapter.md`
4. This file
5. `docs/architecture/parallel-execution-and-fanin.md`
6. `docs/roadmap/implementation-waves.md`
7. `docs/roadmap/file-ownership-matrix.md`
8. The source/tests in the assigned allowed area
