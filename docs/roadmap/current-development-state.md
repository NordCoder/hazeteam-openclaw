# Current development state

This document is the short worker-facing handoff for continuing `hazeteam-openclaw` development from current `main` after W12 core integration fan-in, W13 plugin runtime shell fan-in, and W14G real transport port fan-in.

## Repository role

`hazeteam-openclaw` is the external OpenClaw-native plugin and integration repository over `hazeteam-core`.

`hazeteam-core` owns transport-neutral semantics and public adapter-facing facades. This repository owns OpenClaw/Telegram adapter reality: normalized external events, topic binding, rendering, delivery, callbacks, runtime and approval bridges, durable adapter state, future real OpenClaw wiring, deployment docs, and future product layers.

The adapter must use `hazeteam-core` public APIs only. If a needed core symbol is not public, treat it as a core API gap. Do not copy core source or import private core paths.

## Required context before new implementation

Read in this order:

1. The assigned phase prompt and the Hazeteam OpenClaw Workflow Manifest.
2. `hazeteam-openclaw-contract-pack-cd10.zip`, especially the contract docs named by the phase prompt.
3. `docs/index.md` and `docs/README.md`.
4. `packages/openclaw-telegram-transport/README.md` for W14 and later transport work.
5. `docs/architecture/openclaw-telegram-adapter.md`.
6. `docs/architecture/parallel-execution-and-fanin.md`.
7. The assigned source and tests.

Repository docs are context. The contract pack and implementation manifest remain authoritative.

## Current W14 transport state

W14G fans the W14A-F transport leaves into `@hazeteam/openclaw-telegram-transport` package-root exports.

The W14 package now has safe transport ports and injected boundaries for:

- W14A transport config and redacted credential-reference descriptors;
- W14B safe channel-event normalization;
- W14C injected delivery port results;
- W14D callback normalization, permission, token verify, and token consume boundary;
- W14E topic command routing;
- W14F opt-in real-smoke gate.

This is a fan-in over already implemented leaves, not new feature behavior.

The package remains non-production-ready. Default build, check, and test flows require no real credentials and perform no real network calls. Real smoke is opt-in and secret-gated. A missing credential, missing profile, closed network gate, missing injected port, or skipped gate is blocked or skipped by design, not a passing real-provider smoke result.

Provider acknowledgement is not business success. Delivery, callback, and smoke summaries keep provider acknowledgement distinct from business completion.

Callback handling preserves permission-before-token-consume. Topic routing authority is `channelRef+chatRef+threadRef`, not topic title.

## Preserved limitations

Until explicit future slices implement and test them, the repository still has:

- no production OpenClaw SDK or provider runtime;
- no Telegram listener, webhook server, callback HTTP endpoint, polling loop, or daemon;
- no production credential loader;
- no production deployment runtime;
- no OCA wrapper mechanics;
- no domain product packages;
- no sidecar support.

These limitations must remain visible in docs, release notes, smoke summaries, and worker prompts until source, tests, and an explicit implementation slice prove otherwise.
