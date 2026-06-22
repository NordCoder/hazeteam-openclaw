# ADR 0002: Use granular phase matrix for OpenClaw Telegram adapter implementation

Status: accepted for staging
Date: 2026-06-21

## Context

Promoted from `hazeteam-core` staging planning into the dedicated `hazeteam-openclaw` repository.

The initial OpenClaw Telegram adapter roadmap defined broad waves S01-S11. That was sufficient for architecture orientation but too coarse for reliable worker implementation.

Several broad phases mixed different concerns:

- contracts and implementation;
- testkit and adapter behavior;
- rendering and delivery;
- callback parsing and core token consume;
- approval source, rendering, and resolution.

This could cause workers to touch overlapping files and implement unstable abstractions too early.

## Decision

Use `docs/architecture/openclaw-telegram-adapter/phase-matrix-and-parallel-plan.md` as the primary execution plan.

Implementation is split into smaller phases:

- S01A-S01B for skeleton and boundary tests;
- S02A-S02D for contracts;
- S03A-S03B for testkit;
- S04A-S04B for topic binding;
- S05A-S05B for message mapping and command routing;
- S06A-S06B for minimal UI descriptors and renderers;
- S07A-S07C for core host bridge and readiness;
- S08A-S08C for rendering/delivery;
- S09A-S09C for callback/action-token flow;
- S10A-S10C for approval routing/resolution;
- S11A-S11C for fake end-to-end smoke tests.

## Consequences

Positive:

- smaller worker prompts;
- clearer file ownership;
- less merge conflict risk;
- easier self-review;
- safer parallelization;
- better regression coverage.

Negative:

- more branches and merge cycles;
- more orchestration overhead;
- integration value appears later.

## Parallelization rule

Parallel workers are allowed only after the dependency prerequisites in the phase matrix are merged.

The first sequence should be:

1. S01A package skeleton;
2. S01B boundary tests;
3. S02A shared adapter contracts barrel.

After that, S02B/S02C/S02D can run in parallel.

## Worker prompt rule

Every worker prompt must include:

- exact phase id;
- exact branch;
- base branch `staging/package-openclaw`;
- target branch `staging/package-openclaw`;
- docs to read;
- allowed files;
- forbidden files;
- DoD;
- final report template.

No worker should receive a vague task like “implement the adapter”.
