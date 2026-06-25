# @hazeteam/openclaw-telegram-transport

## W14G status

This package now fans in the W14A-F safe transport surfaces through the package root. It exposes configuration descriptors, redacted credential-reference helpers, channel-event normalization, injected delivery and callback boundaries, topic command routing, and the opt-in real-smoke gate.

The package is not production ready. The public package descriptor keeps `productionReady: false`, `effects: "none"`, `defaultNetworkBehavior: "none"`, and `realSmokeDefault: "skipped-or-blocked"`.

## Public surfaces

The package root exposes these safe surfaces:

- `config` for caller-provided transport configuration and readiness descriptors.
- `secrets` for redacted credential refs and opaque runtime-only handles.
- `channel-event-source` for safe Telegram/OpenClaw channel event normalization.
- `delivery-port` for an injected delivery boundary and safe delivery results.
- `callback-handler-port` for callback normalization, permission checks, and token consume ordering.
- `topic-command-router` for safe command routing by binding authority.
- `real-smoke-gate` for opt-in smoke readiness classification.

These exports are descriptors, factories, evaluators, and no-leak helpers over already-implemented W14 leaves. W14G does not add new feature behavior.

## Runtime posture

Default build, check, and test flows do not require real credentials and do not perform real network calls. The package root does not construct provider SDK clients, read `process.env`, open listeners, register webhooks, start polling, run daemons, deliver messages by default, execute callbacks by default, execute commands, or run smoke execution.

Real smoke is opt-in and secret-gated. A skipped or blocked real-smoke report is intentional safety behavior, not proof of a successful real provider run. Missing credentials, missing profile gates, closed network gates, unsafe operation classes, or missing injected ports remain skipped or blocked by design.

Provider acknowledgement is not business success. Delivery, callback, and smoke outputs keep provider acknowledgement separate from delivery completion, callback business acceptance, and smoke business result.

## Callback and topic-routing invariants

Callback handling preserves permission-before-token-consume. If permission fails, token consume must not run.

Topic routing authority is the tuple `channelRef+chatRef+threadRef`. Topic title is display metadata only and must not be used as routing authority.

## Explicit non-goals

W14G does not implement a production listener, webhook, polling daemon, production provider runtime, production credential loader, deployment runtime, OCA wrapper mechanics, domain product packages, sidecar behavior, or W15 behavior.
