# hazeteam-openclaw

`hazeteam-openclaw` is an external OpenClaw/Telegram adapter and product repository built over `hazeteam-core`.

`hazeteam-core` stays transport-neutral and domain-neutral. This repository owns the OpenClaw/Telegram adapter boundary: adapter contracts, normalized events, testkit fakes, topic binding, command/UI descriptors, future event mapping, rendering, delivery, callbacks, runtime and approval bridges, durable adapter stores, real OpenClaw wiring, and later product layers.

Current status: workspace/package foundation, shared adapter contracts, channel/delivery/readiness/idempotency/permission contracts, Wave 3 testkit fakes, topic binding, and UI/command descriptor primitives are present. The next expected engineering step is fan-in/export consolidation for the already-merged Wave 3 leaves.

There is no real OpenClaw SDK wiring, Telegram listener/webhook/callback endpoint, OCA implementation, or LifeOS product implementation yet.

## Mental model

```text
OpenClaw / Telegram / product runtime
-> hazeteam-openclaw safe adapter boundary
-> hazeteam-core public API
```

The adapter may understand OpenClaw/Telegram concepts, but core must receive only safe public inputs, refs, and envelopes. Raw provider/platform objects stay outside core and outside public adapter DTOs unless represented as bounded safe refs.

## Packages

- `packages/openclaw-adapter` — active TypeScript package for OpenClaw/Telegram adapter contracts and future adapter implementation.
- `packages/openclaw-testkit` — active TypeScript package for deterministic adapter fakes, event factories, and future certification utilities.
- `packages/domain-lifeos` — README-only placeholder.
- `packages/oca-wrapper` — README-only placeholder.

## Documentation

Start here:

- `docs/README.md` — documentation index and worker reading order.
- `docs/roadmap/current-development-state.md` — current handoff, completed foundations, and next development gate.
- `docs/adapter-authoring/README.md` — imported core adapter-authoring guide for boundaries, flows, safety rules, blueprints, and certification checklists.
- `docs/architecture/adapter-worker-onboarding.md` — worker-facing project mental model and layer map.
- `docs/architecture/core-boundary.md` — boundary between `hazeteam-core`, this adapter, and OpenClaw platform concerns.
- `docs/architecture/openclaw-telegram-adapter.md` — target Telegram/OpenClaw adapter flow.
- `docs/roadmap/implementation-waves.md` — implementation waves, parallel leaves, and fan-in slices.

## Commands

```sh
npm run build
npm run test
npm run check
```
