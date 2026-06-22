# hazeteam-openclaw

`hazeteam-openclaw` owns the OpenClaw integration packages for Hazeteam. It is separate from `hazeteam-core` so product and transport adapters can evolve without leaking product-specific vocabulary, SDK objects, or runtime dependencies into the core domain model.

## Current scope

The primary package is `packages/openclaw-adapter`. The current focus is an OpenClaw + Telegram adapter layer over `hazeteam-core`, but this repository is still at the contracts/foundation stage. It is not production-ready real OpenClaw wiring and does not contain a real Telegram bot, webhook, polling loop, OpenClaw runtime client, OCA wrapper, n8n integration, or durable adapter storage.

`packages/openclaw-testkit` is intentionally a skeleton for future fake/testkit support. `packages/domain-lifeos` and `packages/oca-wrapper` are README-only placeholders until later slices.

## Foundation path

The fake/testkit foundation comes first: S01-S11 prove adapter semantics with deterministic contracts, testkit support, and boundary checks. S12-S16 wire real OpenClaw/Telegram integration and harden the release candidate once the fake foundation is stable.

## Local development

```bash
npm ci
npm run build
npm run test
npm run check
```

`npm run check` compiles the TypeScript project graph and runs both root static tests and package-local unit tests.

## Migration note

This repository promotes the OpenClaw Telegram adapter planning work from `hazeteam-core` staging into a dedicated product/integration repository. The promoted foundation keeps adapter contracts standalone and avoids a staging-package gap: package-local TypeScript sources and tests are included in root checks and CI from the first slice.
