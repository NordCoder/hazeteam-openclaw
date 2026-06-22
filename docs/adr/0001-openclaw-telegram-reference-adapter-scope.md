# ADR 0001: OpenClaw Telegram reference adapter scope

## Status

Accepted

## Context

`hazeteam-core` is transport-neutral and domain-neutral. The `hazeteam-openclaw` repository exists to build an external OpenClaw/Telegram adapter and product integration layer over public `hazeteam-core` APIs.

OpenClaw and Telegram introduce provider-specific concerns: raw Telegram updates, bot configuration, OpenClaw channel edge, delivery APIs, callback acknowledgement, runtime/tool execution, approval source/resolver, deployment credentials, and provider SDK objects. These concerns are not core semantics.

## Decision

`hazeteam-openclaw` is an external adapter/product repository over `hazeteam-core`.

This repository owns OpenClaw/Telegram adapter contracts and implementation, including normalized channel events, topic binding, inbound mapping, rendering, delivery, callbacks, runtime bridge, approval bridge, adapter stores, fakes, durable implementations, real wiring, deployment docs, and future product layers.

`hazeteam-core` remains responsible only for public contracts, public facades, session/outbox/token/envelope/workflow/runtime/approval semantics, readiness models, and safe serialization.

Real OpenClaw/Telegram wiring belongs here, not in core.

## Consequences

- OpenClaw and Telegram SDK/API dependencies must not be added to `hazeteam-core` for this adapter.
- Raw Telegram/OpenClaw payloads stay outside core values.
- Provider credentials and deployment handles stay outside core values and docs examples.
- Any core functionality needed by the adapter must be exposed through public core entrypoints before adapter code depends on it.
- OCA and LifeOS are future layers, not part of the generic OpenClaw Telegram adapter foundation unless a later phase explicitly scopes them.
