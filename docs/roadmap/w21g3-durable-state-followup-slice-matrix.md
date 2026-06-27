# W21G3 Durable State Follow-up Slice Matrix

## Status and scope

W21G3 is documentation-only.

W21B is merged as durable-state contract types. Those contract types define fake/inert, redacted/json-safe adapter state vocabulary and keep the current posture explicit: adapter-ready-for-real-system-integration under explicit gates and not production-ready.

This document plans future W21C, W21D, W21E, and W21F worker boundaries only. It does not implement store ports, replay or idempotency boundaries, static guards, fan-in, runtime behavior, production storage, production durable backend behavior, deployment behavior, provider execution, or production readiness.

Current classification remains adapter-ready-for-real-system-integration under explicit gates. The repository remains not production-ready.

## Follow-up slice matrix

| Future slice | Purpose | Owned files/directories | Forbidden files | Prerequisites | Expected tests/checks | Acceptance signal | Fan-in status | Stop condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W21C — Fake/Inert Adapter State Store Port | Add fake/inert adapter state store port boundaries over W21B contract records so future workers can exercise deterministic read, write, reservation, duplicate-safe, and redacted projection behavior without a production backend. | Narrow, explicitly assigned durable-state fake/store-port source files under `packages/openclaw-adapter/src/durable-state/**`; narrow local unit tests under `packages/openclaw-adapter/tests/unit/durable-state/**` only if assigned by the W21C prompt. | Package roots; package metadata; `package-lock.json`; CI/scripts; release docs; README/package README files; broad static tests; acceptance/smoke tests; production database/cache/queue files; migrations; backup/restore/recovery tooling; OCA/LifeOS/plugin-runtime/testkit/core files; sibling branch files. | W21B contract types merged and verified. W21A durable-state ownership plan remains the planning baseline. | Run local/package checks assigned by the W21C prompt, normally `npm run test:static` and `npm run check` when available. Report NOT_RUN_CONNECTOR_LIMITATION when command execution is unavailable through connector. | Fake/inert store ports use safe refs and W21B record vocabulary, expose only redacted/json-safe projections, preserve duplicate-safe lifecycle semantics, and do not add production durable backend behavior. | Leaf. No fan-in unless shared exports or package-root visibility are explicitly assigned elsewhere. | Stop if W21C needs package-root exports, package metadata, global static guards, release docs, broad acceptance/smoke coverage, production storage, migrations, backup/restore/recovery tooling, runtime startup, network behavior, secret loading, OCA/LifeOS/testkit/core edits, or sibling branch files. |
| W21D — Replay and Idempotency State Boundary | Add replay and idempotency state boundaries that make duplicate suppression, replay cursor progression, callback/delivery replay summaries, and safe blocked/replayed/completed states explicit over fake/inert storage. | Narrow, explicitly assigned inbound idempotency, replay cursor, delivery attempt, callback replay, and correlation state files under `packages/openclaw-adapter/src/durable-state/**`; narrow local unit tests under `packages/openclaw-adapter/tests/unit/durable-state/**` only if assigned by the W21D prompt. | Replay CLI; recovery runtime; backup/restore; migrations; production scheduler; listener/webhook/polling runtime; package roots; package metadata; `package-lock.json`; CI/scripts; release docs; README/package README files; broad static tests; acceptance/smoke tests unless explicitly assigned; OCA/LifeOS/plugin-runtime/testkit/core files; sibling branch files. | W21B merged. W21C must be merged first if W21D needs fake store ports rather than contract-only records. | Run local/package checks assigned by the W21D prompt, normally `npm run test:static` and `npm run check` when available. Report NOT_RUN_CONNECTOR_LIMITATION when command execution is unavailable through connector. | Fake tests or contract checks prove duplicate suppression, idempotent reservation/complete semantics, replay cursor movement, and redacted summaries without raw provider/callback payloads, secrets, runtime-only values, handles, stack traces, local paths, or raw logs. | Leaf or narrow dependent leaf. Fan-in is required only if W21D needs cross-category aggregation, shared exports, broad acceptance coverage, or roadmap/release status linkage. | Stop if the implementation requires production recovery behavior, replay CLI, backup/restore, migrations, scheduler/runtime startup, listener/webhook/polling behavior, real provider execution, package-root fan-in, broad acceptance/static matrices, release docs, or sibling branch outputs. |
| W21E — Durable State No-Leak Static Guard | Add a static guard for the durable-state public projection and overreach boundary after the exact inspected source files exist. The guard should detect protected vocabulary, unsafe public fields, production storage/network/runtime snippets, and premature readiness claims in assigned durable-state surfaces. | One explicitly assigned static guard file, likely under `tests/static/**`, plus only the minimal fixture list or allowlist inside that file if assigned. | Source behavior changes; package roots; package metadata; `package-lock.json`; CI/scripts; release docs; README/package README files; acceptance/smoke tests; production storage files; OCA/LifeOS/plugin-runtime/testkit/core files; sibling branch files; unrelated broad static rewrites. | W21E must wait for whichever source files it inspects. It can inspect W21B only, or W21B plus W21C/W21D, depending on the future prompt. | `npm run test:static` is the primary expected check when available. `npm run check` should also be run when available. Report NOT_RUN_CONNECTOR_LIMITATION when command execution is unavailable through connector. | Static guard proves assigned durable-state surfaces avoid raw provider/callback payloads, secrets, token values, credentials, raw network locations, runtime-only values, SDK/client/provider handles, stack traces, local paths, raw logs, production durable backend behavior, default network behavior, default secret loading, and production-readiness language. | Leaf static guard. No fan-in unless the guard must be added to a shared aggregate or replace a broad guard pattern. | Stop if the guard requires changing runtime/source behavior, package roots, metadata, CI/scripts, release docs, broad static infrastructure, acceptance/smoke tests, sibling files, OCA/LifeOS/plugin-runtime/testkit/core files, or source files not explicitly assigned. |
| W21F — Durable State Docs and Fan-In | Integrate earlier W21 leaves only after they are merged. Update explicitly assigned docs and shared public surfaces if needed, while preserving guarded classification and production non-claims. | Explicitly assigned fan-in docs and shared export surfaces named in the W21F prompt. May include local durable-state barrels or roadmap/status docs only when W21F explicitly owns them. | New production storage behavior; migrations; backup/restore; replay CLI; recovery runtime; default runtime/network/secret behavior; CI/scripts unless explicitly assigned; release docs unless explicitly assigned; package metadata unless explicitly assigned; OCA/LifeOS/plugin-runtime/testkit/core behavior; sibling branch files. | Earlier W21 leaves merged and verified. W21F must wait for W21C/W21D/W21E when it consumes their outputs. | Run `npm run test:static` and `npm run check` when available, plus any fan-in-specific checks assigned by the W21F prompt. Report NOT_RUN_CONNECTOR_LIMITATION when command execution is unavailable through connector. | Public docs/exports expose only already-merged fake/inert durable-state boundaries, no-leak wording is preserved, classification remains adapter-ready-for-real-system-integration under explicit gates, and the repository remains not production-ready. | Explicit fan-in slice. This is the slice that may coordinate shared files when assigned. | Stop if W21F needs unmerged sibling outputs, production durable backend implementation, deployment/runtime behavior, default network or secret behavior, real-provider success claims, release classifier changes not assigned, or broad files outside its owned list. |

## Parallelism guidance

W21C must wait for W21B. W21B is already merged, so W21C may be launched from a verified main that includes W21B.

W21D must wait for W21C if W21D needs fake store ports. If W21D is scoped only to contract-level replay/idempotency documentation or types over W21B, the future prompt must say so explicitly; otherwise W21C is a prerequisite.

W21E must wait for whichever source files it inspects. A W21E guard that inspects only W21B can run after W21B. A W21E guard that inspects W21C or W21D must wait until those leaves are merged.

W21F must wait for earlier leaves and is the explicit fan-in slice. It must not be launched as a parallel leaf if it needs outputs from W21C, W21D, or W21E.

Documentation-only siblings can run in parallel if they own separate files and do not edit `docs/roadmap/current-development-state.md`, release docs, package roots, package metadata, CI/scripts, source, tests, README files, parked overlays, core files, or sibling branch files.

## Fan-in rules

Future W21 leaves must stop instead of editing shared or forbidden surfaces. A leaf must report fan-in-needed instead of touching:

- package roots;
- package metadata;
- `package-lock.json`;
- CI/scripts;
- release docs;
- README/package README files;
- broad static tests;
- acceptance/smoke tests;
- OCA, LifeOS, plugin-runtime, testkit, or core files;
- sibling branch files.

Fan-in belongs only to W21F or another future prompt that explicitly owns the shared files, prerequisites, conflict policy, and merge-gate expectations.

## Merge-gate expectations

Future W21 workers should expect these merge gates:

- compare the branch to the expected base SHA;
- changed files must be limited to owned files, with any allowed scope expansion explicitly reported;
- no production durable backend;
- no production storage readiness claim;
- no migration, backup, restore, replay CLI, or recovery runtime;
- no default runtime behavior;
- no default network behavior;
- no default secret loading;
- no unsafe public output;
- checks run when available, otherwise honestly reported as NOT_RUN_CONNECTOR_LIMITATION;
- self-review before PR;
- CI green before merge.

The merge gate should also verify that W21 leaves do not alter release classification, package metadata, package roots, CI/scripts, release docs, parked overlays, OCA/LifeOS/plugin-runtime/testkit/core files, or sibling branch files unless an explicit fan-in prompt owns that work.

## Non-goals

This document makes no claim of:

- durable backend readiness;
- production storage readiness;
- deployment readiness;
- real-provider success;
- OCA readiness;
- LifeOS/domain readiness;
- sidecar readiness;
- production readiness.

W21G3 does not change runtime behavior, source behavior, tests, package exports, package metadata, release docs, CI, scripts, README files, or parked overlay status.
