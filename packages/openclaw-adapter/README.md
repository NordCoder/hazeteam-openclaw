# @hazeteam/openclaw-adapter

TypeScript package for safe OpenClaw/Telegram adapter foundation code over public `hazeteam-core` APIs.

## Current status

This package now contains safe adapter-foundation surfaces beyond package metadata. The package root exports contract-level modules for refs, operation context, safe result/error primitives, topic binding, commands, mapping, rendering, host interaction, permissions, delivery, callbacks, runtime bridges, approval bridges, storage boundaries, and OpenClaw-facing descriptors.

These are foundation surfaces for adapter development. They are not proof that the repository is adapter-ready-for-real-system-integration.

## CD11.2 posture

Under `hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip`, the active priority is to finish the generic OpenClaw/Telegram adapter before advancing OCA, LifeOS, or domain-product overlays.

This package is part of that generic adapter foundation. It must not import private `hazeteam-core` paths, copy core source, expose raw provider payloads, expose SDK/client handles, load credentials, or perform network behavior by default.

## Explicit limitations

This package does not ship:

- production OpenClaw SDK/client wiring;
- production Telegram/OpenClaw provider runtime;
- Telegram listener, webhook server, callback HTTP endpoint, polling loop, or daemon;
- production credential loader;
- deployment runtime;
- sidecar behavior;
- real OCA client execution;
- LifeOS or domain-product behavior.

Skipped or blocked real smoke elsewhere in the repository is not a successful real-provider pass. Fake/inert OCA and descriptor-only LifeOS/domain surfaces are parked downstream overlays and must not be treated as adapter-readiness evidence.
