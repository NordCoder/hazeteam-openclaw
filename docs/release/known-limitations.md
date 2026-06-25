# Known Limitations

## Current limitations

The OpenClaw adapter foundation after W14G is intentionally limited. It includes safe contracts, fake-edge composition, W12 public-core integration proof, W13 plugin runtime shell descriptors, and W14A-F transport surfaces fanned into the Telegram transport package root.

It is not a complete production adapter or product runtime.

Current limitations:

- No production OpenClaw SDK or provider runtime is shipped.
- No production Telegram/OpenClaw network integration is shipped.
- No Telegram listener, webhook server, callback HTTP endpoint, polling loop, or daemon is shipped.
- No production runtime-value loader is shipped; production source must not read sensitive runtime values directly.
- No production HTTP health endpoint is shipped by the current source.
- No packaged migration, backup, restore, replay, or recovery CLI is shipped.
- No production database, cache, queue, scheduler, process supervisor, or deployment worker is shipped.
- No OCA, Codex, LifeOS, or other product-layer implementation is shipped in the generic adapter foundation.
- No remote sidecar support is shipped.

These limitations must remain visible in release documentation until current source, tests, and an explicit implementation slice prove otherwise.

## W14 transport boundary

W14G exposes safe transport ports and injected boundaries. Default check and test paths require no real runtime values and perform no real network calls.

Real smoke is opt-in and gated. A skipped or blocked real-smoke report is blocked or skipped by design and is not a successful real-provider pass.

Provider acknowledgement is not business success. Delivery, callback, and smoke descriptors keep these concepts separate.

Callback handling preserves permission-before-token-consume. Topic routing authority is `channelRef+chatRef+threadRef`; topic title is display metadata only.

## Future work

The following work is future work, not current release support:

- real OpenClaw SDK/client wiring behind explicit adapter-owned ports;
- real Telegram/OpenClaw listener, delivery, callback, runtime, and approval network execution;
- real gated smoke execution that actually calls a provider after explicit gates;
- production runtime-value loading and rotation strategy;
- production HTTP health/readiness endpoint, if a deployment layer requires one;
- production durable backend implementation;
- sidecar support, if explicitly implemented later;
- OCA, Codex, LifeOS, or other product-layer branches.

Future work must preserve the current boundary discipline: raw provider payloads and sensitive runtime values stay outside public DTOs; core receives safe refs and envelopes only; real infrastructure behavior is introduced only by explicitly approved slices.
