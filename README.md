# hazeteam-openclaw

`hazeteam-openclaw` is an external OpenClaw/Telegram adapter and product repository built over `hazeteam-core`.

`hazeteam-core` stays transport-neutral and domain-neutral. This repository owns OpenClaw/Telegram-specific adapter layers, testkit/fakes, runtime and approval bridges, delivery wiring, durable adapter stores, and later product layers.

Current status: workspace/package foundation plus shared adapter-owned contracts.

There is no real OpenClaw SDK wiring, Telegram bot/listener/webhook/callback endpoint, OCA implementation, or LifeOS product implementation in this skeleton.

## Packages

- `packages/openclaw-adapter` — active TypeScript package for OpenClaw/Telegram adapter contracts and future adapter code.
- `packages/openclaw-testkit` — active TypeScript package skeleton for future OpenClaw adapter fakes and certification utilities.
- `packages/domain-lifeos` — README-only placeholder.
- `packages/oca-wrapper` — README-only placeholder.

## Commands

```sh
npm run build
npm run test
npm run check
```
