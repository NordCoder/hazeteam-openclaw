# OpenClaw Telegram Adapter

Status: repository foundation and contracts only. This package is not a production Telegram/OpenClaw runtime yet.

This package is the primary implementation package for the OpenClaw + Telegram adapter over `hazeteam-core`.

Promoted from `hazeteam-core` staging planning into the dedicated `hazeteam-openclaw` repository.

## Responsibility

The adapter consumes normalized OpenClaw Telegram channel events and maps them into `hazeteam-core` through public exports only. It must not import private core source files or rely on core internals.

This package will own the adapter-facing product layer around:

- topic binding between Telegram forum topics, OpenClaw context, workspaces, and agents;
- inbound message mapping from normalized OpenClaw Telegram events into core-safe interaction input;
- command routing for adapter-level commands and topic-aware agent dispatch;
- presentation delivery back to the originating Telegram/OpenClaw topic;
- callback/action token orchestration using core public token/result contracts;
- approval card routing back to the correct topic and actor context;
- readiness and dependency diagnostics for adapter startup/runtime boundaries;
- public-safe logging for adapter delivery, callback, approval, and dispatch boundaries.

## Non-goals

This package does not implement a separate Telegram bot. Telegram transport remains owned by OpenClaw or the future real OpenClaw channel integration.

This package does not own the OCA/Codex runtime. Coding runtime capabilities belong to the future OCA wrapper package.

This package does not own full domain-lifeos semantics. Domain-specific agents, workflows, policies, memory namespaces, commands, and UI descriptors belong to the future domain-lifeos package.

This package does not connect to a real Telegram bot, real OpenClaw runtime, n8n, or any production transport in this skeleton phase.

## Current phase

This repository slice sets up the adapter package foundation:

- portable TypeScript contracts;
- unit and static contract tests;
- workspace build/test wiring;
- no real Telegram transport or OpenClaw runtime implementation.
