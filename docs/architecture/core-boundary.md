# Core boundary

## Boundary statement

`hazeteam-core` is the deterministic transport-neutral core. `hazeteam-openclaw` is an external OpenClaw/Telegram adapter and product repository over that core. OpenClaw and Telegram are valid adapter targets, but they are not core semantics.

## `hazeteam-core` owns

- public contracts and public package entrypoints;
- `createCoreInteractionHost` facade;
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
- durable store implementations and restart/replay behavior when scoped;
- real OpenClaw SDK/API wiring and deployment docs after fake semantics are stable;
- future OCA and LifeOS layers when explicitly scoped.

## OpenClaw platform owns

- raw Telegram updates or provider channel events;
- bot token and provider credentials;
- Telegram channel edge, webhook/polling, send/edit/delete/pin, and callback acknowledgement APIs;
- OpenClaw runtime/tool execution environment;
- OpenClaw approval source/resolver APIs;
- OpenClaw storage APIs if used;
- deployment secrets, platform handles, and provider SDK clients.

These platform objects may be used inside adapter-owned implementation after the real-wiring phases. They must not cross into core values or public adapter DTOs unless represented as bounded safe refs.

## Reference access to core

Implementation workers may read `hazeteam-core` docs, public barrels, source, and tests as behavior reference. Reading private source is allowed for understanding only.

Adapter implementation must import only public `hazeteam-core` root or subpath APIs. It must never import:

- `hazeteam-core/src/**`;
- private `hazeteam-core/dist/**` implementation paths;
- relative paths into a checked-out core repository;
- production code from `hazeteam-core/tests/**`.

If a required symbol is not publicly exported, treat it as a core API gap. Do not work around the gap with private imports.

## Boundary consequences

- Raw Telegram/OpenClaw payloads stay outside core values.
- External delivery target is derived from trusted adapter binding state.
- Binding resolution happens before inbound dispatch, callback consume, and delivery target derivation.
- Presentation outbox claim happens before external delivery.
- Callback permission check happens before token consume.
- Token consume happens exactly once before side-effecting callback intent submission.
- Runtime and approval bridges return safe public results and hide raw OpenClaw objects.
- Real SDK wiring belongs in this repository, not in `hazeteam-core`.
