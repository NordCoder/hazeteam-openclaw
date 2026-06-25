# Core boundary

## Boundary statement

`hazeteam-core` is the deterministic transport-neutral core. `hazeteam-openclaw` is the external OpenClaw/Telegram adapter repository over that core. OpenClaw and Telegram are valid adapter targets, but they are not core semantics.

The CD11.2 target before downstream work resumes is adapter-ready-for-real-system-integration, not production readiness.

## `hazeteam-core` owns

- public contracts and public package entrypoints;
- `createCoreInteractionHost` facade and other public host/facade APIs when available;
- `AgentControlHost`, host inbound action, and host session binding contracts;
- presentation outbox lifecycle and public delivery state transitions;
- presentation action token issue, verify, consume, expiry, mismatch, and replay semantics;
- public result/error envelopes and safe serializers;
- workflow, policy, runtime, approval, diagnostics, lifecycle, and readiness semantics;
- deterministic in-memory test implementations where explicitly exported.

Core does not own real transport, Telegram, OpenClaw SDKs, provider credentials, deployment lifecycle, durable infrastructure, callback endpoints, renderer markup, or product-specific behavior.

## `hazeteam-openclaw` owns

- OpenClaw/Telegram adapter contracts;
- normalized OpenClaw Telegram event DTOs;
- topic binding and external identity mapping;
- inbound mapper from normalized events to public core inputs;
- Telegram/OpenClaw renderer and delivery request/result DTOs;
- delivery pump and external delivery attempt state;
- callback parser, external permission checks, token verify/consume dispatch, and callback acknowledgement;
- OpenClaw runtime bridge behind public core ports;
- approval card routing and approve/reject bridge;
- adapter readiness aggregation;
- adapter-owned idempotency, replay, delivery, external message ref, and topic binding stores;
- fake testkit, fake integration tests, fake E2E, and no-leak tests;
- durable store interfaces and fake/durable behavior when explicitly scoped;
- real OpenClaw/Telegram SDK/API wiring only in later explicit real-edge slices;
- future OCA and LifeOS layers only when explicitly reopened after the adapter-ready gate.

## Package-level ownership in `hazeteam-openclaw`

| Package | Owns at the CD11.2 adapter boundary | Must not own now |
| --- | --- | --- |
| `@hazeteam/openclaw-plugin-runtime` | Runtime composition descriptors, lifecycle/profile/tool/capability/readiness registries, safe diagnostics | Raw Telegram parsing, provider SDK construction in safe shell, OCA/domain behavior, production deployment runtime |
| `@hazeteam/openclaw-adapter` | Safe adapter DTOs/refs, mapping, binding, rendering, delivery/callback/runtime/approval shells, adapter-state contracts | Provider client construction, raw provider payloads in public DTOs, direct env reads, product behavior |
| `@hazeteam/openclaw-telegram-transport` | Telegram/OpenClaw edge quarantine, safe normalization, injected delivery/callback ports, transport config/readiness, opt-in smoke gate | Core private imports, generic domain/OCA behavior, default network, production daemon lifecycle |
| `@hazeteam/openclaw-testkit` | Deterministic fake events, fake ports/stores, fixtures, no-leak helpers | Real provider calls, real credentials, production runtime dependencies |
| `@hazeteam/oca-wrapper` | Parked downstream capability overlay in existing fake/inert state | Adapter-readiness evidence or runtime expansion |
| `@hazeteam/domain-lifeos` | Parked downstream domain overlay in descriptor-only state | Adapter-readiness evidence or active product behavior |

## OpenClaw platform owns

- raw Telegram updates or provider channel events;
- bot token and provider credentials;
- Telegram channel edge, webhook/polling, send/edit/delete/pin, and callback acknowledgement APIs;
- OpenClaw runtime/tool execution environment;
- OpenClaw approval source/resolver APIs;
- OpenClaw storage APIs if used;
- deployment secrets, platform handles, and provider SDK clients.

These platform objects may be used inside adapter-owned implementation only after the relevant real-edge phase reserves that work. They must not cross into core values or public adapter DTOs unless represented as bounded safe refs, redacted descriptors, or safe summaries.

## Reference access to core

Implementation Workers may read `hazeteam-core` docs, public barrels, source, and tests as behavior reference. Reading private source is allowed for understanding only.

Adapter implementation must import only public `hazeteam-core` root or subpath APIs. It must never import:

- `hazeteam-core/src/**`;
- private `hazeteam-core/dist/**` implementation paths;
- relative paths into a checked-out core repository;
- production code from `hazeteam-core/tests/**`.

If a required symbol is not publicly exported, treat it as a core API gap. Do not work around the gap with private imports or copied core source.

## Runtime value boundary

`hazeteam-core` must not receive raw provider payloads, resolved secret values, runtime-only values, provider client handles, deployment paths, stack traces, raw logs, raw tool payloads, or SDK objects.

Allowed core-facing values are public core inputs, safe adapter refs, bounded envelopes, redacted descriptors, and public result/error shapes.

Library packages must not read `process.env` directly. Environment reads, secret resolution, and provider client creation belong at explicit runtime/deployment/real-edge boundaries and must return safe public projections.

## Boundary consequences

- Raw Telegram/OpenClaw payloads stay outside core values.
- External delivery target is derived from trusted adapter binding state.
- Binding resolution happens before inbound dispatch, callback consume, and delivery target derivation.
- Presentation outbox claim happens before external delivery.
- Provider acknowledgement is not business success.
- Callback permission check happens before token consume.
- Token consume happens exactly once before side-effecting callback intent submission.
- Runtime and approval bridges return safe public results and hide raw OpenClaw objects.
- Real SDK/client wiring belongs in scoped real-edge modules in this repository, not in `hazeteam-core` and not in safe foundation package roots.
- OCA and LifeOS remain downstream overlays and must not be used as generic adapter readiness evidence.
