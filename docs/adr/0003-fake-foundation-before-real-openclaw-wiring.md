# ADR 0003: Build fake adapter foundation before real OpenClaw wiring

Status: accepted for staging
Date: 2026-06-21

## Context

Promoted from `hazeteam-core` staging planning into the dedicated `hazeteam-openclaw` repository.

The OpenClaw Telegram adapter roadmap contains many fake/testkit phases. This can be misunderstood as building only a simulation instead of a usable adapter.

The team needs clarity on what each stage produces.

## Decision

Keep fake/testkit phases S01-S11, but explicitly define them as adapter foundation, not final production readiness.

Add real OpenClaw wiring phases S12-S16:

- S12A real OpenClaw channel event adapter;
- S12B real OpenClaw channel delivery adapter;
- S12C real topic provisioning/discovery;
- S13A real OpenClaw runtime AgentControlHost bridge;
- S13B real OpenClaw approval bridge;
- S14A durable adapter state storage;
- S14B durable core store wiring;
- S15A readiness/startup lifecycle;
- S15B real Telegram forum smoke;
- S16 release candidate hardening.

## Rationale

Fake components are necessary to test adapter semantics deterministically before real OpenClaw APIs are stable or available through the connector.

They prove:

- topic binding;
- command routing;
- core mapping;
- delivery lifecycle;
- callback token safety;
- approval routing;
- no-leak behavior.

But production readiness requires real OpenClaw channel/runtime/storage/approval wiring.

## Consequences

S01-S11 result:

- strong adapter test harness;
- fake end-to-end flow;
- not production-ready.

S12-S15 result:

- usable OpenClaw + Telegram adapter in dev/staging environment.

S16 result:

- release-candidate adapter with docs and smoke evidence.

## Rule for future prompts

Worker prompts must state whether the phase is:

- fake/test foundation;
- real OpenClaw wiring;
- production readiness.

Do not present fake e2e success as final adapter completion.
