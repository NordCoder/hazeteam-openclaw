# OpenClaw Telegram adapter architecture

This document describes the generic Telegram/OpenClaw adapter boundary for CD11.2. It is not a production runtime design and does not claim adapter-ready-for-real-system-integration.

## Target flow

Inbound flow:

~~~text
Telegram or OpenClaw provider-shaped update
-> raw boundary quarantine
-> safe channel event descriptor
-> topic binding lookup
-> command routing
-> adapter/core-safe command input
-> hazeteam-core public host facade
-> safe adapter result
~~~

Outbound flow:

~~~text
hazeteam-core public result or presentation outbox item
-> adapter renderer
-> safe Telegram/OpenClaw delivery request
-> injected provider delivery boundary
-> provider acknowledgement normalization
-> delivery attempt and correlation records
~~~

Callback flow:

~~~text
Telegram or OpenClaw provider-shaped callback update
-> raw boundary quarantine
-> safe callback descriptor
-> permission check
-> token verify when present
-> token consume only after permission and verification
-> adapter/core action result
-> safe callback acknowledgement or rendered delivery request
~~~

The adapter is responsible for all OpenClaw/Telegram-specific behavior. Core receives only safe public refs, safe public inputs, and public envelopes.

## Package split

| Package | Role in this architecture |
| --- | --- |
| `@hazeteam/openclaw-plugin-runtime` | Generic runtime composition, lifecycle/profile/readiness/tool/capability descriptors, and safe diagnostics. |
| `@hazeteam/openclaw-adapter` | Safe adapter foundation: DTOs, refs, topic binding, mapping, rendering abstractions, delivery/callback/runtime/approval shells, adapter-state contracts. |
| `@hazeteam/openclaw-telegram-transport` | Telegram/OpenClaw edge: safe normalization, redacted config/credential descriptors, injected delivery/callback boundaries, topic/thread transport support, opt-in smoke gate. |
| `@hazeteam/openclaw-testkit` | Deterministic fake events, fake delivery/runtime/approval/token/store ports, no-leak helpers, fake E2E support. |

OCA and LifeOS packages are parked downstream overlays. Their existing fake/inert or descriptor-only surfaces must not be used as evidence for the generic Telegram/OpenClaw adapter.

## W14 transport package boundary

`@hazeteam/openclaw-telegram-transport` currently exposes W14 safe transport surfaces through package-root fan-in.

The W14 state is deliberately bounded:

- safe transport ports and injected boundaries are present;
- default check and test paths require no real credentials;
- default check and test paths perform no real network calls;
- no provider SDK client is constructed by default;
- real smoke is opt-in and secret-gated;
- blocked or skipped real smoke is not a pass;
- production listener, webhook, polling daemon, production provider runtime, and deployment runtime are not implemented.

This state is useful foundation evidence. It is not adapter-wide fake E2E completion, real-system integration readiness, or production readiness.

## CD11.2 readiness gaps

The adapter path still needs CD11.2 evidence before any adapter-ready-for-real-system-integration claim:

- runtime composition/profile/readiness alignment in `@hazeteam/openclaw-plugin-runtime`;
- adapter-wide readiness aggregation across plugin runtime, adapter flows, transport, stores, credentials, fake E2E, no-leak, and smoke posture;
- inbound fake E2E from safe channel event through command/core facade input;
- outbound fake E2E from core/adapter result through rendering, delivery request, injected delivery port, acknowledgement normalization, and delivery attempt record;
- callback fake E2E with permission-before-token-consume and replay-safe behavior;
- durable adapter-state contracts/fakes for topic bindings, callback tokens, delivery attempts, idempotency/replay, correlation, and readiness snapshots;
- no-leak matrix over public outputs;
- package-root no-side-effect matrix;
- runtime value boundary and provider client port boundary before real-edge work.

Package-root exports alone prove visibility only. They do not prove fake E2E, secret-gated real provider success, adapter-ready-for-real-system-integration, or production readiness.

## Topic binding and routing authority

Canonical binding key:

~~~text
channelRef + chatRef + threadRef
~~~

A topic title is display metadata only. It must not be used as routing authority. Routing decisions must use the safe tuple `channelRef+chatRef+threadRef` and trusted adapter binding state.

Unbound topics should produce safe binding/help guidance. They must not infer authority from message text or topic display names.

## Raw boundary quarantine

Raw provider payloads may exist only at the provider edge or in explicit test fixtures that simulate that edge.

Raw payloads must not enter:

- `hazeteam-core` values;
- public adapter DTOs;
- domain package values;
- OCA values;
- public readiness summaries;
- public delivery/callback results;
- durable safe records;
- user/operator-facing logs or smoke reports except as redacted category codes.

Allowed public transformations include safe refs and summaries such as `channelRef`, `chatRef`, `threadRef`, `externalMessageRef`, `callbackRef`, `credentialRef`, `correlationRef`, and safe failure categories.

## Delivery boundary

Delivery is exposed as an injected port. The safe foundation may normalize a rendered request and call an injected boundary only when a caller explicitly invokes that port. Package-root import itself performs no delivery execution.

Provider acknowledgement is not business success. A provider-acknowledged delivery result still reports business completion separately.

Delivery failures must return safe status, retryability, diagnostic codes, and redacted summaries. They must not expose raw provider response bodies, tokens, endpoints, client handles, stack traces, or local paths.

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

Callback payloads should be treated as opaque token references. Unsafe callback contents must not be echoed in public output.

## Runtime profile and real-edge boundary

The architecture uses these profile classes for planning:

- `fake`: deterministic fake tests with no network and no secrets;
- `dry-run`: safe validation/planning with no external effects;
- `secret-gated-smoke`: narrow opt-in real-edge proof with redacted output and no default CI execution;
- `real-edge`: controlled integration edge through injected ports and runtime value resolver;
- `production-candidate`: future production-like runtime only after operational gates exist.

Real transport edge code may be introduced only behind explicit interfaces:

- real provider client factory or injected client port;
- runtime credential resolver;
- network allow gate;
- test profile/workspace/topic refs;
- cleanup policy;
- redacted smoke output;
- no default CI execution.

Real edge code must live outside safe foundation package-root side effects. Safe package roots must remain importable without provider SDK clients, credential resolution, network calls, listeners, webhooks, polling, store connections, timers, or runtime tool execution.

## Real smoke posture

Real smoke is secret-gated and opt-in. It can report skipped, blocked by profile, blocked by missing credential, blocked by missing injected port, ready-to-run, passed, or failed-safe. A skipped or blocked report is safety evidence, not proof that a real provider call succeeded.

Secret-gated smoke may know whether a credential was resolved inside the runtime edge, but public output must include only redacted descriptors, provider acknowledgement status, blocked reason, and redacted failure summary.

## Current non-goals

The current architecture docs do not implement OCA wrapper mechanics, domain product packages, sidecar behavior, deployment runtime, production provider runtime, production credential loading, listener/webhook/polling runtime, production durable backend, or production health/readiness endpoint.

Real-system integration readiness is a later W17/W18 evidence gate. Production deployment readiness remains a separate later gate.
