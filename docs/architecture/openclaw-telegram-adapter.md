# OpenClaw Telegram adapter architecture

## Target flow

~~~text
Telegram or OpenClaw channel edge
-> safe channel event descriptor
-> topic binding and command routing
-> hazeteam-openclaw adapter
-> hazeteam-core public host facade
-> presentation/callback outputs
-> injected delivery or callback boundary
~~~

The adapter is responsible for all OpenClaw/Telegram-specific behavior. Core receives only safe public refs, safe public inputs, and public envelopes.

## W14 transport package boundary

`@hazeteam/openclaw-telegram-transport` now exposes the W14A-F safe transport surfaces through package-root fan-in.

The W14 state is deliberately bounded:

- safe transport ports and injected boundaries are present;
- default check and test paths require no real credentials;
- default check and test paths perform no real network calls;
- no provider SDK client is constructed by default;
- real smoke is opt-in and secret-gated;
- blocked or skipped real smoke is not a pass;
- production listener, webhook, polling daemon, production provider runtime, and deployment runtime are not implemented in W14.

## Topic binding and routing authority

Canonical binding key:

~~~text
channelRef + chatRef + threadRef
~~~

A topic title is display metadata only. It must not be used as routing authority. Routing decisions must use the safe tuple `channelRef+chatRef+threadRef`.

## Delivery boundary

Delivery is exposed as an injected port. W14 may normalize a rendered request and call an injected boundary only when a caller explicitly invokes that port. The package root itself performs no delivery execution.

Provider acknowledgement is not business success. A provider-acknowledged delivery result still reports business completion separately.

## Callback boundary

Callback handling preserves permission-before-token-consume:

~~~text
normalize callback
-> check permission
-> verify token when present
-> consume token only after permission and verification
-> return safe acknowledgement and decision descriptors
~~~

Provider callback acknowledgement does not mean business success. Replay-safe and failed-safe outcomes remain distinct.

## Real smoke posture

Real smoke is secret-gated and opt-in. It can report skipped, blocked by profile, blocked by missing credential, blocked by missing injected port, ready-to-run, passed, or failed-safe. A skipped or blocked report is safety evidence, not proof that a real provider call succeeded.

## Out of scope after W14G

W14G does not implement OCA wrapper mechanics, domain product packages, sidecar behavior, deployment runtime, production provider runtime, production credential loading, listener/webhook/polling runtime, or W15 behavior.
