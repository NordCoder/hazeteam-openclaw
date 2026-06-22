# ADR 0001: Implement OpenClaw Telegram adapter first

Status: accepted for staging
Date: 2026-06-21

## Context

Promoted from `hazeteam-core` staging planning into the dedicated `hazeteam-openclaw` repository.

The previous S00 documentation described the larger future architecture:

- OpenClaw adapter;
- domain package;
- OCA wrapper;
- openclaw testkit;
- external automation policy.

For immediate development, this is too broad. The first product layer must be the OpenClaw + Telegram adapter, because Telegram forum topics are the planned user interface for agent surfaces.

## Decision

Prioritize the OpenClaw + Telegram adapter foundation before implementing full domain packages, OCA wrapper, or n8n integration.

Immediate package focus:

- `packages/openclaw-adapter`;
- `packages/openclaw-testkit`.

Optional placeholders only:

- `packages/domain-lifeos` README placeholder;
- `packages/oca-wrapper` README placeholder.

## Implementation focus

Build:

- normalized OpenClaw Telegram channel event contracts;
- topic binding registry;
- topic-aware command routing;
- basic agent UI descriptor for adapter tests;
- core host composition over fake OpenClaw runtime;
- presentation rendering and delivery pump;
- callback/action token handling;
- approval card routing to originating topic;
- fake OpenClaw testkit;
- end-to-end fake Telegram topic smoke.

Do not build yet:

- real OCA/Codex integration;
- full domain LifeOS package;
- n8n integration;
- web dashboard;
- non-Telegram channels;
- real production DB implementation unless required by OpenClaw storage API.

## Rationale

This sequence reduces risk:

1. Prove Telegram topic as agent surface.
2. Prove OpenClaw channel boundary.
3. Prove `hazeteam-core` integration through public exports.
4. Prove action-token/callback model.
5. Prove delivery reliability.
6. Then add domain/OCA/n8n later.

## Consequences

Positive:

- implementers get a concrete product target;
- waves are smaller and testable;
- fake OpenClaw testkit can unblock development;
- adapter boundary stabilizes before domain/OCA complexity.

Negative:

- some domain concepts remain fixtures/stubs;
- OCA-specific UI cannot be fully implemented yet;
- real OpenClaw API mismatches may require adapter contract adjustments later.

## Development rule

Future worker prompts should read `docs/architecture/openclaw-telegram-adapter/*` first and treat broader architecture docs as background only.

The immediate base branch remains:

- `staging/package-openclaw`

Implementation branches should continue using names like:

- `staging/package-openclaw-s01-openclaw-telegram-skeleton`
- `staging/package-openclaw-s02-adapter-contracts`
