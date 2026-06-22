# OpenClaw Telegram Adapter Documentation Pack

Status: S00 focused architecture baseline
Target trunk: `main`

Promoted from `hazeteam-core` staging planning into the dedicated `hazeteam-openclaw` repository. Historical staging branch names may still appear below as provenance.

## Purpose

This pack narrows the implementation target to the first product layer:

**OpenClaw + Telegram adapter over `hazeteam-core`.**

Broader packages such as `domain-lifeos`, `oca-wrapper`, n8n automation, and extra capabilities remain future layers. The current implementation waves should build only the adapter foundation needed to connect OpenClaw channels, Telegram forum topics, and `hazeteam-core` interaction contracts.

## Current scope

In scope now:

- OpenClaw Telegram channel assumptions;
- Telegram supergroup/forum topic model;
- topic binding registry;
- channel event contract consumed by the adapter;
- adapter-facing delivery contract back to OpenClaw channel;
- mapping between Telegram topic events and `hazeteam-core` inputs;
- `createCoreInteractionHost` composition for OpenClaw;
- adapter-owned durable store contracts;
- presentation outbox delivery pump;
- callback/action-token flow;
- approval card routing to originating topic;
- minimal agent UI descriptor contract;
- fake OpenClaw testkit for wave development;
- implementation waves for prompt/self-review/merge loop.

Out of scope now:

- real OCA/Codex process integration;
- n8n real integration;
- full LifeOS domain package;
- web dashboard;
- multiple non-Telegram channels;
- production DB adapter if OpenClaw storage contract is not ready;
- changing `hazeteam-core/src/*`.

## Package layout for the first implementation stage

The staging monorepo may still contain four future package folders, but implementation focus is:

- `packages/openclaw-adapter` — primary package;
- `packages/openclaw-testkit` — fake OpenClaw channel/runtime/storage for tests.

Optional stubs only:

- `packages/domain-lifeos` — minimal agent descriptor fixture only if needed by adapter tests;
- `packages/oca-wrapper` — README placeholder only, no implementation yet.

## Required reading order

1. `docs/architecture/openclaw-telegram-adapter/README.md`
2. `docs/architecture/openclaw-telegram-adapter/contracts.md`
3. `docs/architecture/openclaw-telegram-adapter/runtime-flows.md`
4. `docs/architecture/openclaw-telegram-adapter/state-and-storage.md`
5. `docs/architecture/openclaw-telegram-adapter/ui-rendering-and-commands.md`
6. `docs/architecture/openclaw-telegram-adapter/testing-and-waves.md`
7. `docs/adr/0001-openclaw-telegram-first-product-scope.md`

## Architectural summary

Runtime shape:

```text
Telegram user
  -> OpenClaw Telegram channel
  -> normalized OpenClaw channel event
  -> packages/openclaw-adapter
  -> hazeteam-core createCoreInteractionHost
  -> AgentControlHost over OpenClaw runtime
  -> hazeteam-core presentation outbox
  -> packages/openclaw-adapter delivery pump
  -> OpenClaw Telegram channel delivery
  -> Telegram forum topic
```

Important rule:

`packages/openclaw-adapter` does not implement a separate Telegram bot. It consumes and produces OpenClaw channel abstractions. Telegram-specific facts are represented as normalized fields such as `chatId`, `messageThreadId`, `messageId`, and `callbackData`, but bot token/webhook/polling ownership stays in OpenClaw.

## Non-negotiable boundaries

- No `hazeteam-core/src/*` imports.
- No changes to `hazeteam-core/src/*`.
- No direct Telegram bot runtime in this adapter package unless OpenClaw channel abstraction is missing and a later ADR explicitly allows a temporary shim.
- No raw Telegram update objects passed into `hazeteam-core`.
- No raw OpenClaw runtime/provider payloads in public logs.
- No full action payloads in Telegram callback data; use opaque core action tokens only.
- Permission checks must happen before action token consume.
- Approvals must route to the originating agent topic by default.

## Development strategy

Build in waves:

1. S01 package/testkit skeleton.
2. S02 adapter contract types and static boundaries.
3. S03 topic binding registry.
4. S04 channel event mapper.
5. S05 core host composition over fake OpenClaw runtime.
6. S06 presentation renderer and delivery pump.
7. S07 callback/action token flow.
8. S08 approval card routing.
9. S09 end-to-end fake Telegram topic smoke.
10. Later: real OpenClaw API wiring.

Worker implementation in this repository should branch from `main`.
