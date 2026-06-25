# @hazeteam/oca-wrapper

`@hazeteam/oca-wrapper` is the W15A descriptor-only package for the future OCA runtime capability.

W15A only adds safe package metadata, operation metadata, and a registry-compatible capability descriptor that can be registered with the existing OpenClaw plugin runtime capability registry. The package is non-production-ready and the default posture is fake/dry-run with no remote effects.

## What exists in W15A

- a real workspace package at `packages/oca-wrapper`;
- a side-effect-free capability descriptor for `oca-wrapper`;
- registry-compatible operation refs such as `hazeteam.oca.start-session`, `hazeteam.oca.get-status`, and `hazeteam.oca.review-submit`;
- pure operation descriptors with read-only versus approval-required classifications;
- a safe JSON assertion helper for public descriptor output;
- unit coverage proving the descriptor can be registered with the existing runtime capability registry.

## Explicit non-goals

W15A does not implement real OCA execution. It also does not implement an OCA session model, session store, fake OCA client, operation handlers, approval execution flow, presentation UI, topic UI, domain binding fixture, production runtime behavior, real credential loading, or provider SDK wiring.

The operation descriptors are pure data. They do not contain handlers, executable callbacks, provider objects, runtime handles, command payloads, process identifiers, or branch values derived from user text.

## Default safety posture

Default build, typecheck, and unit/static tests require no credentials and perform no network calls. Loading the descriptor does not read environment variables, read files, construct clients, start sessions, create child processes, register tools globally, or mutate core/plugin state.

Public descriptor output must remain JSON-serializable and no-leak safe. It must not expose raw logs, raw diffs, raw output, raw filesystem paths, raw provider payloads, secrets, credentials, stack traces, endpoints, process identifiers, SDK clients, or client handles.

## Registry projection

The exported `getOcaWrapperCapabilityDescriptor()` value is intended for the existing OpenClaw plugin runtime capability registry shape:

- `capabilityRef`: `oca-wrapper`
- `name`: `oca-wrapper`
- `version`: `0.1.0`
- `kind`: `session`
- `readinessState`: `ready-fake`
- `requirement`: `optional`
- `executionPosture`: `fake`

This descriptor is readiness evidence for fake capability registration only. It is not proof of real OCA runtime execution.
