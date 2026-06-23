# Current development state

This document is the short handoff for continuing `hazeteam-openclaw` development from `main`.

## Repository role

`hazeteam-openclaw` is the external OpenClaw/Telegram adapter and product repository over `hazeteam-core`.

The core repository owns transport-neutral semantics and public adapter-facing facades. This repository owns OpenClaw/Telegram adapter reality: normalized external events, topic binding, rendering, delivery, callbacks, runtime and approval bridges, durable adapter state, real OpenClaw wiring, deployment docs, and future product layers.

The adapter must use `hazeteam-core` public APIs only. If a needed core symbol is not public, treat it as a core API gap.

## Required context before new implementation

Read in this order:

1. `docs/README.md`
2. `docs/core-context.md`
3. `docs/architecture/adapter-worker-onboarding.md`
4. `docs/architecture/core-boundary.md`
5. `docs/architecture/openclaw-telegram-adapter.md`
6. `docs/architecture/parallel-execution-and-fanin.md`
7. `docs/roadmap/implementation-waves.md`
8. `docs/roadmap/file-ownership-matrix.md`
9. The assigned source and tests.

Also read the authoritative `hazeteam-core` adapter authoring docs from `NordCoder/hazeteam-core` on `main`, starting at:

```text
docs/adapter-authoring/README.md
```

The local `docs/core-context.md` is a digest, not a replacement for the core docs.

## Completed foundations

The following foundations are present in `main`:

- workspace and package skeleton;
- CI and package-local test discovery;
- shared adapter contracts;
- channel event contracts;
- delivery contracts;
- readiness, idempotency, and permission contracts;
- W3A deterministic Telegram event factories in the testkit;
- W3B fake delivery, fake runtime, and fake approval primitives;
- W3C topic binding contracts and in-memory binding store;
- W3D UI and command descriptor primitives;
- worker-facing documentation for adapter architecture and development boundaries.

## Current engineering gate

The next engineering step is:

```text
W3E — Wave 3 Export / Static Fan-in
```

W3E should expose already-merged W3 leaf modules through the intended package barrels and update public/static boundary tests.

W3E must not add new behavior. It is a fan-in/export consolidation slice.

## W3E expected scope

W3E may need to inspect and update files such as:

- `packages/openclaw-testkit/src/index.ts`
- `packages/openclaw-adapter/src/index.ts`
- `packages/openclaw-adapter/src/binding/index.ts`
- `packages/openclaw-adapter/src/commands/index.ts`
- `packages/openclaw-adapter/tests/unit/public-barrel-contracts.test.mjs`
- `packages/openclaw-testkit/tests/unit/public-barrel.test.mjs`
- `tests/static/repository-boundary.test.mjs`
- a W3 fan-in static test if the roadmap calls for one

Use the roadmap and ownership matrix as the source of truth. Do not invent runtime behavior in W3E.

## What W3E must preserve

- No real OpenClaw SDK/API wiring.
- No Telegram listener, webhook, callback endpoint, or network delivery.
- No durable stores.
- No mapper, renderer, delivery pump, runtime bridge, approval bridge, or callback flow implementation.
- No package dependency changes unless explicitly justified by the fan-in task.
- No changes to `hazeteam-core`.

## After W3E

After W3E is merged and CI is green, development can proceed to behavior-shell waves:

- inbound event mapper;
- renderer;
- core host factory integration;
- permission evaluator shell;
- fake delivery/callback/runtime/approval flows;
- fake E2E and no-leak matrix.

Real provider wiring remains later-phase work and should wait until fake E2E/no-leak and durable readiness gates are in place.

## Worker prompt guidance

For normal worker prompts:

- keep branch, base, allowed files, forbidden files, and non-goals strict;
- keep implementation details flexible inside the assigned layer;
- list unconfirmed files as “inspect if present / search nearby if missing”; 
- do not require missing optional files to block work;
- distinguish leaf slices from fan-in slices;
- prefer SSH/local git when checks and commit shape matter;
- prefer GitHub connector for small isolated file updates.
