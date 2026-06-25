# Current development state

This document is the short worker-facing handoff for continuing `hazeteam-openclaw` development from current `main` after W12 core integration fan-in over the W10/W11 release-hardened adapter foundation and the W13 OpenClaw plugin runtime shell fan-in.

## Repository role

`hazeteam-openclaw` is the external OpenClaw-native plugin and integration repository over `hazeteam-core`.

`hazeteam-core` owns transport-neutral semantics and public adapter-facing facades. This repository owns OpenClaw/Telegram adapter reality: normalized external events, topic binding, rendering, delivery, callbacks, runtime and approval bridges, durable adapter state, future real OpenClaw wiring, deployment docs, and future product layers.

The adapter must use `hazeteam-core` public APIs only. If a needed core symbol is not public, treat it as a core API gap. W12 and later core integration work must consume `hazeteam-core` as a pinned external package source through public exports, not by copying core code or importing private paths.

## Required context before new implementation

Read in this order:

1. The assigned phase prompt and the Hazeteam OpenClaw Workflow Manifest.
2. `hazeteam-openclaw-contract-pack-cd10.zip`, especially the contract docs named by the phase prompt.
3. `docs/index.md`
4. `docs/README.md`
5. `docs/development/core-integration.md` for W12 and later core-integration work
6. `packages/openclaw-plugin-runtime/README.md` for W13 and later plugin-runtime work
7. `docs/core-context.md`
8. `docs/architecture/adapter-worker-onboarding.md`
9. `docs/architecture/core-boundary.md`
10. `docs/architecture/openclaw-telegram-adapter.md`
11. `docs/architecture/parallel-execution-and-fanin.md`
12. `docs/roadmap/implementation-waves.md`
13. `docs/roadmap/file-ownership-matrix.md`
14. The assigned source and tests.

Also read the authoritative `hazeteam-core` adapter authoring docs from `NordCoder/hazeteam-core` on the pinned or assigned core ref when a phase touches core integration. Start at:

~~~text
docs/adapter-authoring/README.md
~~~

The local `docs/core-context.md` is a digest, not a replacement for the core docs or the current contract pack. For W12 and later, `docs/development/core-integration.md` records the pinned core ref, inspected public export inventory, private-import boundary policy, local packed-core install strategy, and W12 fan-in gate.

## Completed W10/W11 foundation baseline

The foundation baseline includes:

- workspace and package foundation;
- shared safe adapter contracts, refs, result envelopes, readiness summaries, and DTO boundaries;
- deterministic testkit fakes and fake-first composition surfaces;
- channel event, delivery, readiness, idempotency, permission, topic binding, UI, and command descriptor contracts;
- mapper, renderer, delivery, callback token, runtime bridge, approval bridge, core host shell, readiness composition, fake E2E, and no-leak foundation coverage;
- adapter-owned durable store interfaces and durable store shells for topic bindings, idempotency, callback lifecycle, delivery attempts, external message references, and core-facing store boundaries;
- OpenClaw-facing channel, delivery, runtime, and approval integration shells over injected safe boundaries;
- W9 secret-gated smoke harness posture that remains dry-run or blocked by design;
- W10 deployment, operations, release checklist, known-limitations, and documentation index fan-in;
- W11 acceptance-gate, package-status, status-doc, and static-boundary consistency cleanup.

This is a foundation baseline, not a production OpenClaw/Telegram runtime.

## Completed consistency gate

The completed cleanup gate is W11 — Test and Documentation Consistency.

W11 made the W10 foundation more honest and ready for core integration work. It removed stale status language, ensured acceptance tests are represented in the official check gate, refreshed package status metadata from skeleton to foundation semantics, and removed or narrowed obsolete historical phase-scope static checks while preserving meaningful safety boundaries.

W11 did not add real OpenClaw, Telegram, OCA, database, queue, scheduler, sidecar, or product runtime behavior.

## W11 completed scope

At the wave level, the completed cleanup areas are:

- root package scripts for explicit acceptance-test gating;
- current-state and documentation index wording that no longer treats W3 or W3E as current;
- package status metadata that no longer describes the package as a skeleton;
- final fan-in consistency after the W11 leaves were manually merged.

Use the assigned prompt and contract pack as the source of truth for each future slice. Do not borrow files or implementation assumptions from sibling branches unless the Orchestrator explicitly makes a phase stacked.

## Current W12 integration-proof baseline

The current `main` after W12E is intended to be a W12 integration-proof baseline against pinned `hazeteam-core` public APIs with fake adapter edges.

W12A establishes the core ref/import policy and static boundary foundation in `docs/development/core-integration.md` and `tests/static/w12-core-public-import-boundary.test.mjs`.

W12B adds the real public core host composition proof target. W12C adds the fake Telegram/OpenClaw inbound adapter flow through the real public core host facade and fake delivery/presentation surfaces. W12D adds the fake callback token issue, verify, consume, and replay proof target through the real public core host facade.

W12E is the fan-in that wires the script and cross-repo CI strategy. The root script `npm run test:core-integration` runs the W12B, W12C, and W12D integration targets. The W12 core integration workflow checks out `NordCoder/hazeteam-core` at `8eb7a3b3675a0779763067a1022cce75e63d1226`, builds it, packs it locally, installs the tarball into `hazeteam-openclaw`, and runs the static and W12 integration gates.

The W12 proof remains fake-edge and real-core-public-API only. W12 does not add real OpenClaw SDK/client behavior, real Telegram listener, webhook, polling loop, callback endpoint, network delivery, database, cache, queue, scheduler, sidecar, credential loading, or product runtime behavior.

## Current W13 plugin runtime shell

W13 introduces `packages/openclaw-plugin-runtime` as the OpenClaw plugin runtime shell package.

W13A created the package skeleton and package status descriptor. W13B added a side-effect-free plugin lifecycle state machine. W13C added safe OpenClaw tool registry descriptors and validators. W13D added a runtime capability registry and readiness projection model. W13E added plugin readiness aggregation over lifecycle, core facade, adapter foundation, transport, capabilities, config, stores, and tools. W13F fans those leaves into the package root, refreshes package-level status, adds cross-leaf smoke coverage, and documents the package boundary.

The W13 package is fake/dry-run capable only. It reports `productionReady: false`, `effects: "none"`, and runtime-shell status. Public outputs are intended to be JSON-serializable and no-leak safe.

W13 does not implement real OpenClaw SDK/client wiring, Telegram listener, webhook, polling loop, callback endpoint, network delivery, OCA runtime/session behavior, production credential loading, sidecar support, production durable infrastructure, production deployment runtime, production HTTP readiness endpoint, or product-layer behavior.

## Next major implementation direction

The next major implementation direction after W13F should remain contract-led and explicit about readiness level.

Future work may move toward real transport ports, runtime capabilities, OCA wrapper capability, domain packages, sidecar support, or deployment/runtime operations only when a phase prompt explicitly scopes those behaviors, lists allowed files, adds tests, and preserves the `hazeteam-core` transport-neutral boundary.

Do not treat W12 integration proof or the W13 plugin runtime shell as permission to add production runtime behavior opportunistically.

## Preserved limitations

Until explicit future slices implement and test the capability, the current repository still has:

- no real OpenClaw SDK/client wiring;
- no real Telegram listener, webhook, callback HTTP endpoint, polling loop, or network delivery;
- no OCA implementation;
- no Codex, LifeOS, or other product-layer implementation;
- no production credential loader;
- no production HTTP health/readiness endpoint;
- no production database, cache, queue, scheduler, process supervisor, migration CLI, backup CLI, restore command, or replay runtime;
- no sidecar support.

These limitations must remain visible in docs, release notes, smoke summaries, and worker prompts until source, tests, and an explicit implementation slice prove otherwise.

## Worker prompt guidance

For normal worker prompts:

- keep branch, base, expected base SHA, allowed files, forbidden files, non-goals, and report format strict;
- require the contract pack docs relevant to the slice before design or implementation;
- keep implementation details flexible inside the assigned layer unless contract-critical;
- list unconfirmed files as “inspect if present / search nearby if missing”;
- do not require missing optional files to block work when scope remains clear;
- distinguish parallel leaves, stacked leaves, fix slices, self-review, and fan-in slices;
- never ask a normal Worker to merge or touch sibling branches;
- prefer GitHub connector for small isolated repository updates;
- use SSH/local git only for explicitly assigned fixer or merger work when connector-only review is insufficient.
