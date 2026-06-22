# Implementation roadmap v2 — conflict-aware parallel plan

## Purpose

This roadmap maximizes parallel worker execution while preventing merge conflicts. Parallelism is decided by two graphs:

1. **Dependency graph** — what a slice semantically needs.
2. **File conflict graph** — what files a slice may edit.

A slice is parallel-safe only when both are true:

- it does not depend on unmerged sibling branch files;
- its allowed files do not overlap with another running slice.

Shared barrels, public export snapshots, and global static boundaries are not edited by ordinary implementation slices. They are handled by explicit **fan-in** slices.

## Always-on rules

Default forbidden shared files for ordinary implementation slices:

```text
packages/openclaw-adapter/src/index.ts
packages/openclaw-adapter/src/contracts/index.ts
packages/openclaw-testkit/src/index.ts
packages/openclaw-adapter/tests/unit/public-barrel-contracts.test.mjs
tests/static/repository-boundary.test.mjs
```

Only a slice explicitly named `fan-in`, `export`, `snapshot`, or `boundary` may edit these shared files.

## S00 — foundation

Status: merged.

- S00A — workspace, package skeleton, tooling, CI, first static boundary.
- S00B — architecture docs, ADRs, roadmap, local core context digest.

Parallelism: S00A/S00B can run in parallel because S00B is docs-only and S00A owns package/tooling files.

Fan-in: not required.

## S01 — shared adapter contracts

Status: merged.

Adds shared adapter-owned refs, operation context, safe errors/results, and initial public barrels.

Parallelism: one slice, because it establishes the shared contract namespace.

## S02 — first adapter contract batch

Status: merged.

Historical note: S02A/S02B/S02C were semantically parallel but touched shared files. Future waves must avoid this pattern.

- S02A — channel event contracts.
- S02B — delivery request/result contracts.
- S02C — readiness, idempotency, permission contracts.
- S02D — post-merge contract fan-in audit.

Future-equivalent pattern:

```text
S02A/S02B/S02C implementation branches:
  may add own contract files and own unit tests only
  must not edit shared barrels/static snapshots

S02D fan-in branch:
  adds contracts barrel exports
  adds public export snapshot
  consolidates static boundaries
```

## Wave 3 — testkit, binding, UI descriptors

Run these in parallel after S02D is merged.

### W3A — Testkit Telegram Event Factories

Allowed files:

```text
packages/openclaw-testkit/src/events/**
packages/openclaw-testkit/tests/unit/events/**
```

Forbidden shared files:

```text
packages/openclaw-testkit/src/index.ts
packages/openclaw-adapter/src/**
tests/static/repository-boundary.test.mjs
```

Goal: deterministic fake OpenClaw Telegram event factories based on S02A public contracts.

### W3B — Testkit Fake Delivery / Runtime / Approval Primitives

Allowed files:

```text
packages/openclaw-testkit/src/fakes/**
packages/openclaw-testkit/tests/unit/fakes/**
```

Forbidden shared files:

```text
packages/openclaw-testkit/src/index.ts
packages/openclaw-adapter/src/**
tests/static/repository-boundary.test.mjs
```

Goal: deterministic fake delivery sink, fake runtime bridge surface, fake approval source/resolver primitives. No real OpenClaw/Telegram.

### W3C — Topic Binding Contracts + In-Memory Store

Allowed files:

```text
packages/openclaw-adapter/src/binding/**
packages/openclaw-adapter/tests/unit/binding/**
```

Forbidden shared files:

```text
packages/openclaw-adapter/src/index.ts
packages/openclaw-adapter/src/contracts/index.ts
packages/openclaw-adapter/tests/unit/public-barrel-contracts.test.mjs
tests/static/repository-boundary.test.mjs
```

Goal: adapter-owned topic binding key/snapshot/status and in-memory binding store shell.

### W3D — UI Descriptor / Command Contracts

Allowed files:

```text
packages/openclaw-adapter/src/commands/**
packages/openclaw-adapter/tests/unit/commands/**
```

Forbidden shared files:

```text
packages/openclaw-adapter/src/index.ts
packages/openclaw-adapter/src/contracts/index.ts
packages/openclaw-adapter/tests/unit/public-barrel-contracts.test.mjs
tests/static/repository-boundary.test.mjs
```

Goal: safe UI descriptor and command contract primitives. No router implementation.

### W3E — Wave 3 Export / Static Fan-in

Run only after W3A-W3D are merged.

Allowed files:

```text
packages/openclaw-testkit/src/index.ts
packages/openclaw-adapter/src/index.ts
packages/openclaw-adapter/src/binding/index.ts
packages/openclaw-adapter/src/commands/index.ts
packages/openclaw-adapter/tests/unit/public-barrel-contracts.test.mjs
packages/openclaw-testkit/tests/unit/public-barrel.test.mjs
tests/static/repository-boundary.test.mjs
tests/static/w3-fanin-boundary.test.mjs
```

Goal: expose merged Wave 3 modules, update export snapshots, and consolidate static boundaries.

## Wave 4 — pure adapter behavior shells

Run after W3E is merged.

Parallel leaves:

- W4A — Inbound Mapper
  - allowed: `packages/openclaw-adapter/src/mapping/**`, `packages/openclaw-adapter/tests/unit/mapping/**`
- W4B — Renderer
  - allowed: `packages/openclaw-adapter/src/rendering/**`, `packages/openclaw-adapter/tests/unit/rendering/**`
- W4C — Core Host Factory
  - allowed: `packages/openclaw-adapter/src/host/**`, `packages/openclaw-adapter/tests/unit/host/**`
- W4D — Permission Evaluator Shell
  - allowed: `packages/openclaw-adapter/src/permissions/**`, `packages/openclaw-adapter/tests/unit/permissions/**`

All W4 leaves must avoid shared barrels/static snapshots.

Fan-in:

- W4E — Wave 4 Export / Static Fan-in.

## Wave 5 — adapter flow components

Run after W4E is merged.

Parallel leaves:

- W5A — Delivery Pump
  - allowed: `packages/openclaw-adapter/src/delivery/**`, `packages/openclaw-adapter/tests/unit/delivery/**`
- W5B — Callback Token Flow
  - allowed: `packages/openclaw-adapter/src/callbacks/**`, `packages/openclaw-adapter/tests/unit/callbacks/**`
- W5C — Runtime Bridge
  - allowed: `packages/openclaw-adapter/src/runtime/**`, `packages/openclaw-adapter/tests/unit/runtime/**`
- W5D — Approval Bridge
  - allowed: `packages/openclaw-adapter/src/approvals/**`, `packages/openclaw-adapter/tests/unit/approvals/**`

Fan-in:

- W5E — Wave 5 Export / Static Fan-in.

## Wave 6 — fake E2E/no-leak matrix

Run after W5E is merged.

- W6A — Fake E2E Matrix.

Parallelism: one slice, because it intentionally connects all prior components and owns acceptance fixtures.

Allowed files:

```text
tests/acceptance/**
tests/fixtures/**
packages/openclaw-adapter/tests/integration/**
packages/openclaw-testkit/tests/integration/**
```

Goal: fake message -> binding -> mapper -> core -> fake runtime -> outbox -> renderer -> fake delivery; callback token lifecycle; approval lifecycle; readiness/no-leak matrix.

## Wave 7 — durable stores

Run after W6A is merged.

Parallel leaves:

- W7A — Durable Topic Binding Store
  - allowed: `packages/openclaw-adapter/src/storage/topic-binding/**`, `packages/openclaw-adapter/tests/unit/storage/topic-binding/**`
- W7B — Durable Idempotency / Callback Replay Stores
  - allowed: `packages/openclaw-adapter/src/storage/idempotency/**`, `packages/openclaw-adapter/src/storage/callbacks/**`, `packages/openclaw-adapter/tests/unit/storage/idempotency/**`, `packages/openclaw-adapter/tests/unit/storage/callbacks/**`
- W7C — Durable Delivery Attempt / External Message Stores
  - allowed: `packages/openclaw-adapter/src/storage/delivery/**`, `packages/openclaw-adapter/tests/unit/storage/delivery/**`
- W7D — Durable Core Store Adapters
  - allowed: `packages/openclaw-adapter/src/storage/core/**`, `packages/openclaw-adapter/tests/unit/storage/core/**`

Fan-in:

- W7E — Durable Store Export / Restart Matrix Fan-in.

## Wave 8 — real OpenClaw wiring

Run only after fake E2E/no-leak and durable store readiness are green.

Parallel leaves:

- W8A — Real OpenClaw Channel Event Adapter
  - allowed: `packages/openclaw-adapter/src/openclaw/channel/**`, `packages/openclaw-adapter/tests/unit/openclaw/channel/**`
- W8B — Real OpenClaw Delivery Adapter
  - allowed: `packages/openclaw-adapter/src/openclaw/delivery/**`, `packages/openclaw-adapter/tests/unit/openclaw/delivery/**`
- W8C — Real OpenClaw Runtime Bridge
  - allowed: `packages/openclaw-adapter/src/openclaw/runtime/**`, `packages/openclaw-adapter/tests/unit/openclaw/runtime/**`
- W8D — Real OpenClaw Approval Bridge
  - allowed: `packages/openclaw-adapter/src/openclaw/approval/**`, `packages/openclaw-adapter/tests/unit/openclaw/approval/**`

Fan-in:

- W8E — OpenClaw Integration Export / Secret-Gated Smoke Fan-in.

## Wave 9 — real Telegram/OpenClaw smoke

- W9A — Secret-gated real smoke suite.

Parallelism: one slice. It owns opt-in environment assumptions and cleanup behavior.

## Wave 10 — deployment/release hardening

Parallel leaves where files are disjoint:

- W10A — Config, readiness, health, credential docs.
- W10B — Migration/backup/replay operational docs.
- W10C — Release checklist and known limitations.

Fan-in:

- W10D — Deployment docs index/release fan-in.

## Future product layers

OCA/Codex and LifeOS layers start only after adapter release hardening unless explicitly scoped as separate product branches. They must not be implemented inside generic adapter foundation slices.
