# Parallel execution and fan-in policy

## Purpose

Parallel slices can be semantically independent but still conflict when they edit shared files such as package roots, export snapshots, global static tests, or status docs.

The project separates leaf implementation work from fan-in work.

## Fan-in slice responsibilities

A fan-in slice may add package-root exports, public export tests, static-boundary consolidation, README status notes, and docs updates that make merged modules visible through public entrypoints.

A fan-in slice must not add new product behavior, change leaf semantics, introduce real provider SDK wiring, or implement future phases.

## W14G fan-in result

W14G is the fan-in after W14A-F. It exposes already implemented transport leaves through `packages/openclaw-telegram-transport/src/index.ts` and updates documentation to describe the actual W14 state.

The W14 fan-in state is:

- W14A config and redacted reference descriptors remain exported;
- W14B channel-event normalization is exported;
- W14C injected delivery boundary is exported;
- W14D callback handler boundary is exported;
- W14E topic command routing is exported;
- W14F real-smoke gate is exported;
- package metadata remains non-production-ready;
- default behavior remains no-network and no-effect.

The W14G fan-in checks protect package-root visibility while preserving no provider SDK import, no private core import, no network call, no production listener, and safe public output constraints.

## Merge workflow

For a parallel batch:

~~~text
1. Launch all leaf workers from the same current main.
2. Review each leaf branch independently.
3. Merge leaf branches only when their changed files and contracts are clean.
4. Launch fan-in only after the leaves are merged.
5. Merge fan-in after CI and orchestrator review.
~~~

## Current non-goals

The W14 fan-in does not implement W15, OCA wrapper mechanics, domain packages, sidecar behavior, deployment runtime, production provider runtime, listener/webhook/polling runtime, or production reference-value loading.
