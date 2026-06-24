# Known Limitations

## Current limitations

The OpenClaw adapter foundation after W9A is intentionally limited. It is a safe foundation for adapter contracts, fake composition, durable store shells, OpenClaw integration shells, and secret-gated smoke posture. It is not a complete production adapter or product runtime.

Current limitations:

- No production OpenClaw SDK or client implementation is shipped.
- No production Telegram/OpenClaw network integration is shipped.
- No Telegram listener, webhook server, callback HTTP endpoint, or polling loop is shipped.
- No production credential loader is shipped; production source must not read secrets or environment settings directly.
- No production HTTP health endpoint is shipped by the current source. Existing readiness and health-like values are in-process summaries over injected boundaries, not an HTTP server.
- No packaged migration, backup, restore, replay, or recovery CLI is shipped.
- No production database, cache, queue, scheduler, process supervisor, or deployment worker is shipped.
- No OCA, Codex, LifeOS, or other product-layer implementation is shipped in the generic adapter foundation.
- W9 real smoke remains dry-run or blocked by design. The current smoke harness composes safe shells with fake ports and cleanup planning only, and it does not call remote services.

These limitations must remain visible in release documentation until current source, tests, and an explicit implementation slice prove otherwise.

## Boundaries and non-goals

`hazeteam-core` remains transport-neutral. It must not import OpenClaw, Telegram, deployment, SDK, storage-driver, credential, or product-layer concerns.

The `hazeteam-openclaw` repository owns OpenClaw/Telegram adapter-specific concerns. Inside this repository, the generic adapter foundation must stay separate from future product layers. Generic foundation slices may define safe DTOs, adapter shells, fake test coverage, durable store boundaries, and redacted smoke posture, but they must not silently implement OCA, Codex, LifeOS, or operational product workflows.

Future product layers must be scoped as separate product branches or explicit implementation slices. They must not be smuggled into release-hardening, documentation-only, fan-in, static-boundary, or generic foundation work.

## Future work

The following work is future work, not current release support:

- real OpenClaw SDK/client wiring behind explicit adapter-owned ports;
- real Telegram/OpenClaw listener, delivery, callback, runtime, and approval network execution;
- real secret-gated smoke execution with explicit network opt-in, cleanup behavior, and no-leak assertions;
- production credential loading and rotation strategy;
- production HTTP health/readiness endpoint, if a deployment layer requires one;
- packaged migration, backup, restore, replay, and recovery tooling;
- deployment docs fan-in and release documentation index wiring;
- OCA, Codex, LifeOS, or other product-layer branches.

Future work must preserve the current boundary discipline: raw provider payloads and secrets stay outside public DTOs; core receives safe refs and envelopes only; real infrastructure behavior is introduced only by explicitly approved slices.

## Risk notes

The main release risks if future work is added incorrectly are:

- secret leakage through logs, docs examples, smoke output, readiness summaries, or error envelopes;
- raw provider, runtime, tool, approval, or core payload persistence in durable stores;
- duplicated deliveries caused by bypassing delivery attempt idempotency, outbox claim semantics, or external message reference tracking;
- callback token replay caused by consuming before permission, failing to verify token context, or not recording consumed/denied terminal states durably;
- product concerns leaking into `hazeteam-core`, which would break the transport-neutral core boundary;
- product concerns leaking into generic adapter foundation slices, which would make later OCA/Codex/LifeOS work harder to review and release safely;
- real network or SDK behavior being added without opt-in gates, cleanup planning, and no-leak coverage.

Treat these risks as release blockers when they appear in production source, public DTOs, tests, or documentation examples.