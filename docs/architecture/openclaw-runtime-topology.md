# OpenClaw runtime topology

This document aligns the repository architecture with the CD11.2 adapter-first runtime topology. It is an architecture map for W16-W18 Workers. It does not add implementation behavior and does not claim adapter-ready-for-real-system-integration or production readiness.

## Scope

The active scope is the generic OpenClaw/Telegram adapter path:

~~~text
OpenClaw plugin host or test harness
-> @hazeteam/openclaw-plugin-runtime
-> @hazeteam/openclaw-adapter
-> @hazeteam/openclaw-telegram-transport
-> @hazeteam/openclaw-testkit fakes or explicit real-edge ports
-> hazeteam-core public facade where core behavior is required
~~~

OCA, LifeOS, sidecar, deployment runtime, production provider runtime, and product-specific behavior are parked downstream overlays. They may be mentioned only as excluded optional bindings until a later gate explicitly reopens them.

## Package ownership

| Package or boundary | Owns | Must not own in the adapter-readiness phase |
| --- | --- | --- |
| `hazeteam-core` | Transport-neutral semantics, public host facade, public outbox/presentation/action-token/approval semantics, safe public result envelopes | Telegram/OpenClaw provider payloads, provider SDK clients, credentials, deployment lifecycle, private adapter behavior |
| `@hazeteam/openclaw-plugin-runtime` | Plugin lifecycle, generic runtime profile vocabulary, tool registry, capability registry, runtime composition descriptors, readiness aggregation shape, safe diagnostics, side-effect-free start/stop contract shape | Telegram payload parsing, Telegram delivery formatting, domain products, OCA mechanics, provider SDK/client construction in safe shell, production deployment runtime |
| `@hazeteam/openclaw-adapter` | Safe adapter DTOs and refs, adapter/core mapping, topic binding abstractions, command intent mapping, renderer abstractions, delivery/callback/runtime/approval adapter shells, adapter-owned durable-state contracts, no-leak public envelopes | Raw Telegram provider parsing, provider SDK/client construction, `process.env` reads, domain/OCA behavior, production listener/webhook/polling runtime |
| `@hazeteam/openclaw-telegram-transport` | Telegram/OpenClaw transport config descriptors, redacted credential refs, provider-shaped input quarantine, safe channel-event normalization, injected delivery/callback ports, topic/thread routing support, transport readiness projection, opt-in secret-gated smoke edge when explicitly scoped | Core private access, generic domain behavior, OCA/session mechanics, default network calls, production daemon/deployment lifecycle |
| `@hazeteam/openclaw-testkit` | Deterministic fakes, synthetic safe fixtures, fake delivery/runtime/approval/token/store ports, fake E2E helpers, no-leak assertions | Real provider calls, real credentials, real endpoints, production deployment behavior, runtime dependencies for production packages |
| `@hazeteam/oca-wrapper` | Parked downstream capability overlay in its existing fake/inert state | Adapter-readiness evidence, runtime expansion, real OCA client execution, OCA credential loading |
| `@hazeteam/domain-lifeos` | Parked downstream domain overlay in descriptor-only state | Adapter-readiness evidence, product behavior, active domain command/catalog expansion |

## Runtime composition boundary

CD11.2 composition is a safe shell, not a production daemon. The intended composition root is `@hazeteam/openclaw-plugin-runtime`, which should eventually describe or construct an explicitly injected graph:

~~~text
OpenClawRuntimeComposition
├─ lifecycle descriptor
├─ runtime profile descriptor
├─ tool registry descriptor
├─ capability registry descriptor
├─ readiness aggregation descriptor
├─ core facade binding
├─ adapter foundation binding
├─ Telegram/OpenClaw transport binding
├─ adapter-state store binding
├─ approval/token binding
├─ credential resolver binding
├─ observability/correlation binding
└─ optional downstream capability/domain bindings, disabled until adapter-ready gate
~~~

Package-root imports and registry/readiness creation must remain side-effect-free. They may return descriptors, validators, safe projections, and factory functions. They must not start external work.

A later explicit initialize/start path may validate injected dependencies and return safe readiness. It still must not call a real provider unless the selected runtime profile and the scoped phase explicitly allow that edge.

## Runtime profile vocabulary and current mismatch

CD11.2 standard profile vocabulary is:

| Profile | Meaning | Default CI/network posture |
| --- | --- | --- |
| `fake` | Deterministic fake behavior for unit and acceptance tests | default-CI eligible, no network, no secrets |
| `dry-run` | Real-looking planning and validation with no external effects | default-CI eligible, no network, no resolved secrets |
| `secret-gated-smoke` | Narrow opt-in real-edge proof with redacted reporting | excluded from default CI, explicit gates required |
| `real-edge` | Explicit integration-environment provider edge through injected ports | not default CI, controlled network through ports |
| `production-candidate` | Production-like runtime with operational controls | not claimed until production gates exist |

Current repository source still exposes W13/W14-era profile words in places, including `test`, `dry-run`, `embedded-core`, `sidecar-core`, `real-smoke`, and `production`. That is a vocabulary gap, not evidence of real-edge or production capability.

Until W17/W18 implementation lanes align source, Workers should translate architecture intent conservatively:

| Current word | CD11.2 interpretation for planning |
| --- | --- |
| `test` | closest to `fake` when deterministic and no-network |
| `dry-run` | remains `dry-run` if no resolved secrets and no remote calls |
| `real-smoke` | should become `secret-gated-smoke` with precise blocked/skipped/pass semantics |
| `embedded-core` | composition mode detail, not a readiness level by itself |
| `sidecar-core` | parked or future integration mode; not adapter-readiness evidence |
| `production` | future `production-candidate` only after production gates exist |

Worker reports and docs should avoid unqualified ready wording. Name the profile and evidence class, such as `fake-ready`, `dry-run-ready`, `secret-gated-ready`, `real-edge-ready`, or `production-candidate-ready`.

## Tool and capability composition boundary

Tool and capability registries describe availability. Registration is not execution.

A safe composition output may include:

~~~text
compositionRef
profile
productionReady
tools
capabilities
transports
adapterFlows
readiness
blockedReasons
actionableNextSteps
safeDiagnostics
~~~

It must not include raw provider payloads, callback data, raw logs, raw diffs, token values, credential values, endpoints, absolute paths, SDK clients, provider client handles, process handles, stack traces, or executable command output.

Existing OCA and LifeOS descriptors may be represented only as parked downstream entries:

~~~text
status: parked-downstream
reason: adapter-ready gate not passed
~~~

They must not raise the generic adapter readiness score.

## Provider SDK and client boundaries

Safe foundation package roots and safe descriptor modules must not construct provider SDK clients. This applies to `@hazeteam/openclaw-plugin-runtime`, `@hazeteam/openclaw-adapter`, `@hazeteam/openclaw-testkit`, and package-root imports in `@hazeteam/openclaw-telegram-transport`.

Provider SDK/client construction is allowed only in a later scoped real-edge or deployment edge that reserves the relevant files and proves:

- injected provider client or client factory boundary;
- runtime credential resolver boundary;
- explicit network allow gate;
- runtime-only resolved secret value handling;
- redacted readiness and failure output;
- no package-root side effects;
- no default CI network or secret dependency.

Safe foundations may define interfaces, ports, descriptors, and redacted references. They must not resolve credentials, instantiate clients, open sockets, register webhooks, start listeners, start polling, connect stores, create timers, consume tokens, or execute runtime tools at import time.

## Secret, config, and runtime-value boundary

Library packages must not read `process.env` directly. Environment reads belong only to explicit edge scripts, deployment packages, or scoped real-edge runtime adapters.

Public projections may mention safe refs and redacted descriptors, such as `credentialRef`, `secretHandleRef`, `credentialStatus`, or `redactedCredentialDescriptor`. Public projections must omit runtime-only values and resolved secret values.

Resolved secret values are allowed only inside explicit runtime/smoke/provider edges and must be dropped or redacted before returning any public result.

## Runtime topology gaps as of W16C

The current baseline should be treated as a safe foundation with several CD11.2 gaps:

- plugin runtime has lifecycle, registry, capability, and readiness helper surfaces, but lacks a CD11.2 runtime composition descriptor that binds core facade, adapter foundation, Telegram transport, stores, credentials, observability, and disabled optional overlays;
- current runtime profile vocabulary does not match CD11.2 profile names;
- tool and capability registries exist as safe descriptors, but no CD11.2 composition output yet combines tools, capabilities, transports, adapter flows, readiness, blocked reasons, and safe diagnostics;
- Telegram transport has W14 safe ports and secret-gated smoke posture, but no adapter-wide CD11.2 readiness aggregation across inbound, outbound, callback, stores, fake E2E, no-leak matrix, and real-system integration state;
- package-root exports prove visibility only. They do not prove fake E2E, secret-gated real edge, adapter-ready-for-real-system-integration, or production readiness.

These gaps are architecture facts for W17/W18 planning. They are not failures of import safety and they are not readiness claims.

## W17 usage rules

W17 implementation lanes should use this topology as follows:

- W17A should own plugin-runtime composition/profile/tool-capability alignment inside files reserved by its prompt. It should not edit package roots unless explicitly reserved.
- W17B lanes should keep adapter inbound, host/command, rendering/delivery, and callback/approval composition in adapter-owned files or local barrels. They should not construct provider clients or parse raw Telegram payloads as public DTOs.
- W17C-W17F lanes should keep Telegram inbound/outbound/callback/config readiness inside transport-owned files or local barrels. They should not add domain/OCA behavior or default network effects.
- W17G lanes should keep store contracts and fakes in adapter/testkit-owned files. They should not add production durable backends unless explicitly scoped.
- W17H acceptance lanes should use one unique acceptance file per concern and should prove fake/no-leak/package-root behavior without turning skipped or blocked smoke into pass evidence.

When a lane needs a package root, shared static file, global status doc, release classifier, package README, package metadata, CI, or another Worker-owned file, the lane should stop or defer to the reserved/fan-in slice instead of editing it opportunistically.

## Real-system integration is not production deployment

`adapter-ready-for-real-system-integration` means the adapter can be integrated into a real host under explicit gates after fake E2E, profile/readiness, credential resolver, provider client port, redacted smoke, no-leak, and documentation evidence exist.

It does not mean production-ready. Production readiness remains later and additionally requires production listener/webhook/polling runtime, credential loading and rotation strategy, durable backend, health/readiness endpoints, deployment runtime, process lifecycle/shutdown/retry/backoff, monitoring, recovery, and release/rollback procedures.
