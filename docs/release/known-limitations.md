# Known Limitations

## Current limitations

The current repository is a safe OpenClaw/Telegram adapter foundation, not a production OpenClaw/Telegram runtime and not yet an adapter-ready-for-real-system-integration release.

Current limitations:

- No production OpenClaw SDK or provider runtime is shipped.
- No production Telegram/OpenClaw network integration is shipped.
- No Telegram listener, webhook server, callback HTTP endpoint, polling loop, or daemon is shipped.
- No production runtime-value loader is shipped; foundation libraries must not read sensitive runtime values directly.
- No production HTTP health endpoint is shipped by the current source.
- No packaged migration, backup, restore, replay, or recovery CLI is shipped.
- No production database, cache, queue, scheduler, process supervisor, or deployment worker is shipped.
- No remote sidecar support is shipped.
- No real OCA client execution, OCA credential loading, Codex product runtime, LifeOS behavior, or domain-product implementation is shipped as part of adapter readiness.

These limitations must remain visible in release documentation until current source, tests, and an explicit implementation slice prove otherwise.

## Readiness ladder limitations

The repository must not currently claim `adapter-ready-for-real-system-integration`, `adapter-real-integration-ready`, or `production-ready`.

The following evidence is still required before the adapter-ready gate may be claimed:

- package-root no-side-effect matrix for readiness-relevant public entrypoints;
- fake E2E matrix for inbound, outbound, callback, durable replay/idempotency, readiness aggregation, and failure/no-leak paths;
- unified readiness aggregation across plugin runtime, OpenClaw adapter, Telegram transport, core facade, credentials posture, durable stores, smoke state, and production-claim status;
- durable state fakes for topic bindings, callback tokens, delivery attempts, inbound idempotency, replay, correlation, and readiness snapshots;
- no-leak matrix covering public DTOs, readiness output, smoke output, delivery/callback output, docs examples, and error paths;
- opt-in redacted real smoke that can pass a narrow real edge or report a precise blocked reason without leaking secrets or making default CI networked;
- release closure evidence that states exactly which behavior is contract-ready, fake-e2e-ready, secret-gated-ready, and still future production work.

A missing, skipped, or blocked evidence item is not a pass. A release candidate may report safe blockage honestly, but it may not convert blockage into adapter readiness.

## Default check and CI limitations

The default check path must remain no-network and secret-free. It must not require real Telegram/OpenClaw credentials, real provider network access, deployment secrets, production infrastructure, or a running sidecar.

Default checks can prove deterministic contract, unit, static, fake, and acceptance behavior. They cannot prove real provider reachability unless an explicitly gated smoke command is run and reported separately.

## Real smoke limitations

Real smoke is opt-in and gated. A skipped or blocked real-smoke report is safe posture, not a successful real-provider pass.

A passed real smoke proves only the specific narrow edge that was executed. It does not prove production runtime behavior, durable backend correctness, listener/webhook/polling availability, sidecar support, OCA execution, LifeOS behavior, or overall production readiness.

Smoke summaries, blocked reasons, and failures must stay redacted. They must not reveal tokens, credentials, endpoints, raw provider payloads, raw callback payloads, provider clients, SDK handles, stack traces, filesystem paths, raw logs, raw diffs, or command output.

## Parked overlays

OCA, Codex, LifeOS, and domain/product overlays are parked downstream overlays until the OpenClaw/Telegram adapter reaches the adapter-ready-for-real-system-integration gate.

Existing fake/inert OCA surfaces and descriptor-only LifeOS/domain surfaces are not evidence for:

- plugin runtime composition readiness;
- Telegram/OpenClaw fake E2E readiness;
- adapter-wide readiness aggregation;
- durable adapter-state readiness;
- opt-in real smoke readiness;
- production readiness.

Future work on parked overlays must not start merely because those files exist. The unlock condition is the adapter-ready gate, not the presence of fake wrappers or descriptors.

## Boundary limitations

The current boundary discipline remains mandatory:

- raw provider payloads stay outside public DTOs;
- raw callback payloads stay outside public DTOs;
- resolved secrets and runtime-only values stay outside public output;
- core receives safe refs and envelopes only;
- package-root imports must not perform network calls, read environment secrets, construct provider clients, start listeners, or connect stores;
- provider acknowledgement remains distinct from business success;
- callback handling must preserve permission-before-token-consume;
- topic routing authority is `channelRef + chatRef + threadRef`, not topic title.

## Future work

The following work is future work, not current release support:

- CD11.2 plugin runtime composition/readiness shell completion;
- adapter and Telegram transport fake E2E completion through public package roots;
- adapter-wide readiness aggregation;
- durable adapter-state fake contracts and replay/idempotency evidence;
- no-leak acceptance matrix;
- package-root no-side-effect matrix;
- real OpenClaw SDK/client wiring behind explicit adapter-owned ports;
- real Telegram/OpenClaw listener, delivery, callback, runtime, and approval network execution;
- real gated smoke execution that actually calls a provider after explicit gates;
- production runtime-value loading and rotation strategy;
- production HTTP health/readiness endpoint, if a deployment layer requires one;
- production durable backend implementation;
- sidecar support, if explicitly implemented later;
- OCA, Codex, LifeOS, or other product-layer branches after the adapter-ready gate unlocks them.

Future work must preserve the current boundary discipline and must be introduced only by explicitly approved slices.
