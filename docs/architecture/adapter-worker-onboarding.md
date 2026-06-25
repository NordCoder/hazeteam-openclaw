# Adapter worker onboarding

This guide is the worker-facing mental model for `hazeteam-openclaw` under the CD11.2 adapter-first plan. Read it before implementing W17/W18 adapter slices.

## What this repository is

`hazeteam-openclaw` is an external OpenClaw/Telegram adapter repository over `hazeteam-core`.

The active architecture is an anti-corruption layer:

~~~text
OpenClaw / Telegram / explicit runtime edge
-> hazeteam-openclaw safe adapter boundary
-> hazeteam-core public API
~~~

`hazeteam-core` stays transport-neutral and domain-neutral. This repository owns OpenClaw/Telegram-specific contracts, normalized events, topic binding, rendering, delivery, callbacks, runtime composition descriptors, approval/runtime bridges, adapter-owned state contracts, deterministic fakes, and later explicit real-edge wiring.

OCA and LifeOS are parked downstream overlays. They must not be advanced or used as adapter-readiness evidence until the adapter-ready-for-real-system-integration gate is explicitly reached and downstream work is reopened.

## Current implementation stage

The repository is in the CD11.2 adapter-readiness reset. The baseline is a safe adapter foundation with W12/W13/W14/W15 surfaces, not a complete real-system adapter and not a production runtime.

Current architecture facts:

- `@hazeteam/openclaw-plugin-runtime` has W13 lifecycle, tool registry, capability registry, and readiness helpers, but not the full CD11.2 runtime composition/profile alignment.
- `@hazeteam/openclaw-adapter` exports many safe adapter foundation surfaces, including binding, mapping, rendering, host, permissions, delivery, callbacks, runtime, approvals, storage, and OpenClaw bridge shells.
- `@hazeteam/openclaw-telegram-transport` exposes W14 safe transport ports, redacted config/credential descriptors, injected delivery/callback boundaries, routing helpers, and an opt-in real-smoke gate.
- `@hazeteam/openclaw-testkit` exposes deterministic event factories and fakes for tests, despite older README wording underclaiming the current surface.
- Existing `@hazeteam/oca-wrapper` and `@hazeteam/domain-lifeos` surfaces are parked downstream overlays and do not count as generic adapter evidence.

The next implementation lanes must close CD11.2 runtime composition, fake E2E, no-leak, package-root side-effect, runtime-value, provider-port, and readiness-classification gaps without adding production behavior early.

## Target runtime flow

The adapter target flow is:

~~~text
provider-shaped Telegram/OpenClaw update
-> raw edge quarantine
-> safe channel event descriptor
-> topic binding lookup using channelRef + chatRef + threadRef
-> command routing
-> adapter/core-safe command input
-> hazeteam-core public host facade
-> safe adapter result / presentation / callback output
-> renderer
-> safe delivery request
-> injected provider delivery boundary
-> provider acknowledgement normalization
-> durable attempt/correlation/idempotency records
~~~

Callback flow is:

~~~text
provider-shaped callback update
-> raw edge quarantine
-> safe callback descriptor
-> permission check
-> token verify when present
-> token consume only after permission and verification
-> adapter/core action result
-> safe callback acknowledgement or delivery request
~~~

Raw provider objects, SDK clients, deployment handles, stack traces, runtime-only values, local paths, and private platform state must not cross into core values or public adapter DTOs. Use bounded safe refs, safe summaries, redacted descriptors, and adapter-owned state instead.

## Layer map

Use this map to decide where a change belongs.

| Layer | Path or package | Owns | Must not own |
| --- | --- | --- | --- |
| Core public boundary | `hazeteam-core` public APIs only | Transport-neutral host, outbox, token, approval, policy, workflow, runtime semantics | Telegram/OpenClaw provider objects, credentials, provider SDKs, deployment runtime |
| Plugin runtime composition | `packages/openclaw-plugin-runtime/**` | Lifecycle, profile descriptors, registries, readiness aggregation, composition descriptors, safe diagnostics | Telegram payload parsing, provider SDK construction in safe shell, OCA/domain behavior, production deployment |
| Adapter foundation | `packages/openclaw-adapter/**` | Safe DTOs/refs, mapping, topic binding, rendering abstractions, delivery/callback/runtime/approval shells, adapter-state contracts | Raw provider parsing as public DTOs, provider client construction, `process.env` reads, OCA/domain behavior |
| Telegram transport | `packages/openclaw-telegram-transport/**` | Transport config, redacted credential refs, raw-edge quarantine, safe channel-event/callback normalization, injected delivery/callback ports, opt-in smoke gate | Core private access, domain/OCA behavior, default network, production listener/webhook/polling daemon |
| Testkit | `packages/openclaw-testkit/**` | Deterministic fakes, safe fixtures, fake delivery/runtime/approval/token/store ports, no-leak helpers | Real provider calls, real credentials, production runtime dependencies |
| Parked overlays | `packages/oca-wrapper/**`, `packages/domain-lifeos/**` | Existing fake/inert or descriptor-only downstream surfaces | Adapter-readiness evidence, active runtime/product expansion before gate |
| Shared integration surfaces | `packages/*/src/index.ts`, package READMEs, root docs, CI, static tests | Only the Worker with explicit reservation | Opportunistic leaf edits |

If a change touches several layers, split it. A Worker slice should usually own one row of this table plus local tests or docs.

## Runtime topology rule

The runtime composition root is `@hazeteam/openclaw-plugin-runtime`. It may eventually coordinate lifecycle, registries, core facade, adapter foundation, transport ports, stores, credentials, observability, and optional capability/domain bindings. It must keep each binding behind declared interfaces and safe descriptors.

Package-root import must remain side-effect-free:

- no provider SDK/client construction;
- no network calls;
- no listener, webhook, polling loop, or daemon start;
- no environment reads;
- no secret resolution;
- no durable store connection;
- no timer or process creation;
- no token consume;
- no runtime tool execution;
- no automatic OCA/domain loading.

A later explicit initialize/start function may validate injected dependencies and return safe readiness. Real provider calls still require an explicitly scoped runtime profile and real-edge phase.

## Runtime profile vocabulary

CD11.2 uses these planning profiles:

- `fake`: deterministic fake tests, no network, no secrets;
- `dry-run`: validation/planning only, no external effects;
- `secret-gated-smoke`: opt-in real-edge proof, excluded from default CI, redacted output only;
- `real-edge`: explicit integration-environment edge through injected ports;
- `production-candidate`: future production-like runtime with operational controls.

Current source still has older W13/W14 terms such as `test`, `dry-run`, `embedded-core`, `sidecar-core`, `real-smoke`, and `production`. Treat those as a vocabulary gap until a scoped implementation lane aligns source. Do not infer real-edge or production support from the names alone.

## Core boundary rules

Adapter code may read `hazeteam-core` docs, source, and tests for understanding. Production adapter code must import only public `hazeteam-core` root or declared public subpaths.

Never import:

- `hazeteam-core/src/**`;
- private `hazeteam-core/dist/**` implementation paths;
- relative paths into a checked-out core repository;
- production code from `hazeteam-core/tests/**`.

If the adapter needs a symbol that is not public in core, report a core API gap. Do not work around it with private imports or copied core source.

## Topic binding model

A Telegram topic is a UI surface, not core identity.

Canonical external topic identity is:

~~~text
channelRef + chatRef + threadRef
~~~

Canonical binding value points to adapter/core-facing refs such as:

~~~text
workspaceRef + agentRef + hostSessionRef
~~~

Topic names are display metadata only. They may change and must not be used as routing authority.

Delivery targets and callback context must be derived from trusted binding state, not from message text, topic title, rendered presentation metadata, or unsafe callback contents.

## Callback and action token rule

Callback payloads should be opaque references, not embedded commands or provider objects. The intended public shape is an opaque token ref such as:

~~~text
hz:<opaque-token-ref>
~~~

The adapter must resolve topic binding and check external permission before consuming the core action token. Unauthorized callbacks should not burn the token by default. Replay must not dispatch twice.

## Provider SDK and credential rule

Safe foundation package roots must not construct provider SDK clients or resolve credentials. Foundation packages may define safe ports, factories, descriptors, and redacted refs, but the actual provider client and resolved secret value belong only in later explicit real-edge or deployment/runtime edges.

Library packages must not read `process.env` directly. Environment access belongs to scoped edge scripts or deployment adapters and must produce safe redacted descriptors for public output.

## Fake-first rule

Real OpenClaw/Telegram wiring must not come before fake E2E and no-leak coverage.

Implementation should progress through safe layers:

~~~text
contracts and descriptors
-> testkit fakes
-> topic binding
-> inbound mapping
-> rendering
-> core host facade binding
-> fake runtime/delivery/approval flow
-> callback/token flow
-> fake E2E and no-leak matrix
-> adapter-state contracts and fakes
-> runtime value boundary
-> provider client port boundary
-> secret-gated real smoke
-> real-edge integration
~~~

Before real wiring, Workers should use deterministic fake surfaces and tests. Real provider APIs, bot listeners, webhooks, polling, network delivery, deployment handles, and durable infrastructure are allowed only in explicitly scoped later slices.

## Leaf slice vs fan-in slice

Most implementation work is a leaf or vertical integration slice:

- changes one isolated area;
- adds local tests or a uniquely owned acceptance file;
- does not touch root package barrels unless explicitly reserved;
- does not touch public export snapshot tests unless explicitly reserved;
- does not touch broad global static tests unless explicitly reserved;
- does not import sibling branch-only files.

A fan-in slice is different:

- it runs only when needed after owned leaves are merged;
- it updates package roots, shared static boundaries, aggregate docs, or release classifiers that were explicitly assigned;
- it exposes already-merged modules;
- it must not add new feature behavior.

If a Worker prompt says package_root_policy: none, do not edit `packages/*/src/index.ts`. If public exports are missing, report that as a deferred package-root reservation or fan-in issue.

## Worker decision checklist

Before changing files, answer these questions:

1. Is this a contract, leaf, vertical integration, acceptance, real-edge, or release-closure slice?
2. Which package owns the change?
3. Are all dependencies already in the base branch?
4. Are package roots, package READMEs, static tests, CI, and release docs explicitly reserved?
5. Are real provider/network/durable behaviors explicitly allowed?
6. Does any data cross from OpenClaw/Telegram into core? If yes, is it normalized and safe?
7. Does the change depend on sibling branch-only files? If yes, stop or wait for merge.
8. Can the behavior be tested with deterministic fakes before real wiring?
9. Does the result avoid OCA/LifeOS adapter-readiness evidence?
10. Does the output name its profile and avoid production overclaim?

## What good worker output looks like

A good slice is small, boring, and reviewable:

- changed files match the assigned package or doc reservation;
- tests import owned leaf paths, local barrels, or reserved package roots according to the prompt;
- unsafe/raw provider fields are rejected, redacted, or represented as safe refs;
- package roots, package metadata, docs, CI, shared tests, and release classifiers remain untouched unless explicitly allowed;
- no future phase behavior is implemented early;
- checks are run when tooling supports them and reported honestly.

The main failure mode to avoid is implementing production runtime, real provider wiring, OCA, LifeOS, sidecar, or deployment behavior while working in a contract, fake, descriptor, docs, or reserved package-root phase.

## Reading order for W17/W18 workers

1. `docs/architecture/openclaw-runtime-topology.md`
2. `docs/architecture/core-boundary.md`
3. `docs/architecture/openclaw-telegram-adapter.md`
4. This file
5. `docs/architecture/parallel-execution-and-fanin.md`
6. The Worker prompt and the required CD11.2 contract-pack docs
7. The source/tests in the assigned allowed area
