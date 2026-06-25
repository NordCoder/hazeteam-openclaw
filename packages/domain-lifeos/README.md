# domain-lifeos

Minimal W15G LifeOS domain fixture package.

Under `hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip`, LifeOS and domain-product work are parked downstream overlays. They must not be advanced until the generic OpenClaw/Telegram adapter reaches adapter-ready-for-real-system-integration, except for explicitly assigned docs-only parked-status wording or narrow compile/test safety fixes.

## Current status

This package declares an example LifeOS agent descriptor with an OCA capability binding, bounded allowed operations, profile reference, command surface metadata, and safe UI hints.

It is descriptor-only. It does not implement OCA session lifecycle, stores, operation handlers, approval execution, topic presentation, provider SDK calls, credential loading, filesystem access, network access, sidecar behavior, deployment runtime, production provider runtime, or domain-product behavior.

## Adapter-readiness classification

This package is not adapter-readiness evidence.

The LifeOS descriptor fixture may demonstrate a safe shape for a future domain overlay, but it does not prove Telegram transport readiness, generic adapter fake E2E readiness, real-system integration readiness, production readiness, OCA runtime execution, or LifeOS product behavior.

Workers must not treat this package as permission to continue LifeOS/domain implementation before the adapter-ready-for-real-system-integration gate is met.
