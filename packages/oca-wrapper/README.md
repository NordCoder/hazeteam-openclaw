# @hazeteam/oca-wrapper

`@hazeteam/oca-wrapper` is the fake/inert W15 OCA runtime capability package.

W15H fans the already implemented W15 OCA wrapper leaves into the package root. The package remains non-production-ready: default behavior is fake, approval-aware, credential-free, and network-free.

## What exists after W15H

- safe package metadata, operation metadata, and a registry-compatible capability descriptor for `oca-wrapper`;
- safe OCA session refs, lifecycle state, normalization, and JSON safety checks;
- an in-memory session store boundary for deterministic fake readiness tests;
- fake OCA client and operation handlers for bounded read-only and approval-gated operation envelopes;
- approval-runtime tool integration that blocks approval-required operations before execution and executes only after an explicit safe approval decision;
- presentation/topic descriptors for safe session status, summaries, action buttons, and approval cards;
- package-root exports from `./dist/index.js` for the W15 public leaves.

## Explicit non-goals

W15H does not implement production OCA runtime behavior, real OCA client execution, real credential loading, real approval token consume, sidecar behavior, deployment runtime, provider SDK wiring, or `hazeteam-core` changes.

The exported surfaces are pure/fake readiness surfaces. They do not contain provider objects, runtime handles, executable provider callbacks, raw command payloads, process identifiers, or branch values derived from user text.

## Default safety posture

Default build, typecheck, unit, and static tests require no credentials and perform no network calls. Importing the package root does not read environment variables, read files, construct clients, create session stores, start sessions, create child processes, register tools globally, call approval execution, or mutate core/plugin state.

Public outputs must remain JSON-serializable and no-leak safe. They must not expose raw logs, raw diffs, raw output, raw filesystem paths, raw provider payloads, secrets, credentials, stack traces, endpoints, process identifiers, SDK clients, or client handles.

## Registry projection

The exported `getOcaWrapperCapabilityDescriptor()` value is intended for the existing OpenClaw plugin runtime capability registry shape:

- `capabilityRef`: `oca-wrapper`
- `name`: `oca-wrapper`
- `version`: `0.1.0`
- `kind`: `session`
- `readinessState`: `ready-fake`
- `requirement`: `optional`
- `executionPosture`: `fake`

This descriptor and the W15H fan-in tests are fake readiness evidence only. They are not proof of real OCA runtime execution.
