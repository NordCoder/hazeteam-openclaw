# @hazeteam/openclaw-testkit

TypeScript package for deterministic OpenClaw/Telegram adapter test utilities and fakes.

## Current status

This package now contains deterministic fake/testkit surfaces beyond package metadata. The package root exports Telegram event factories plus fake delivery, fake runtime, and fake approval helpers for adapter tests.

These surfaces support fake-first adapter development and local deterministic testing. They do not prove real provider behavior and do not make the repository adapter-ready-for-real-system-integration by themselves.

## CD11.2 posture

Under `hazeteam-openclaw-contract-pack-cd11.2-max-parallel-adapter-readiness.zip`, the active priority is to finish the generic OpenClaw/Telegram adapter before advancing OCA, LifeOS, or domain-product overlays.

The testkit should stay deterministic, credential-free, network-free, and no-leak safe. Public fake outputs should remain bounded, JSON-serializable descriptors or results, not raw provider payloads, SDK/client handles, secrets, credentials, stack traces, filesystem paths, or network endpoints.

## Explicit limitations

This package does not ship:

- real Telegram/OpenClaw provider calls;
- production OpenClaw SDK/client wiring;
- production credential loading;
- listener, webhook, polling daemon, or callback HTTP endpoint behavior;
- production provider runtime;
- sidecar behavior;
- deployment runtime;
- real OCA client execution;
- LifeOS or domain-product behavior.

Skipped or blocked real smoke elsewhere in the repository is not a successful real-provider pass. Fake/inert OCA and descriptor-only LifeOS/domain surfaces are parked downstream overlays and must not be treated as adapter-readiness evidence.
