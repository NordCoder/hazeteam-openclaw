# OpenClaw Adapter Testkit

Status: placeholder testkit package for adapter-focused development.

This package provides deterministic test doubles for the OpenClaw + Telegram adapter foundation before real OpenClaw APIs are wired.

It will provide fake components for:

- normalized OpenClaw Telegram channel events;
- fake delivery sink for outbound Telegram/OpenClaw messages;
- fake runtime dispatch for adapter-to-core and adapter-to-AgentControlHost flows;
- fake approval source for approval card routing and callback handling;
- fake adapter/core storage needed by staging tests;
- deterministic ids and deterministic clock for replayable lifecycle tests.

## Purpose

The testkit exists to prove adapter semantics before real OpenClaw APIs are wired. It should make topic binding, message mapping, command routing, delivery, callback token behavior, approval routing, readiness, and public-safe logging testable without a live Telegram or OpenClaw environment.

Fake success is not production readiness. A green fake end-to-end flow only proves that adapter semantics are internally consistent against controlled test doubles.

Real OpenClaw wiring and production readiness are deferred to S12-S16 per the staging docs.

## Current phase

This repository slice keeps the testkit as a skeleton only. Real fake runtime fixtures can be added later without expanding current migration scope.
