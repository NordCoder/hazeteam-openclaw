# W28A OCA Sidecar Boundary Plan

## Status and scope

W28A is a planning-only roadmap for future OCA and sidecar integration boundaries.

The repository remains adapter-ready-for-real-system-integration under explicit gates and not production-ready. This plan does not change the repository classification, does not advance readiness evidence, and does not make OCA, sidecar, LifeOS, deployment, production runtime, or real-provider success claims.

This document does not implement source, package exports, package metadata, tests, CI, scripts, deployment behavior, network behavior, credential loading, sidecar process behavior, real OCA client execution, or production readiness.

## Baseline boundaries

The current repository already contains parked fake or inert OCA wrapper surfaces and adapter evidence. Those surfaces remain downstream overlays. They are not generic adapter-readiness proof and must not be treated as proof of OCA runtime readiness, sidecar readiness, LifeOS readiness, production deployment readiness, or real-provider success.

Future OCA and sidecar work must follow this order:

1. Planning before source changes.
2. Descriptor-only or fake-inert boundaries before any runtime behavior.
3. Injected ports before default wiring.
4. Redacted public projections before public output.
5. Narrow static guards before fan-in.
6. Fan-in only after all assigned leaves are merged.
7. No readiness claim until an explicit future release gate proves it.

## Ownership boundary map

| Boundary | Future owner | Allowed future evidence | Forbidden in W28A and leaf planning outputs |
| --- | --- | --- | --- |
| Descriptor-only OCA wrapper boundary | Future OCA contract/type leaf | Safe capability, profile, operation, readiness, approval, and presentation descriptors. JSON-safe public vocabulary only. | Real OCA client execution, runtime handles, process handles, raw output, package-root exports unless fan-in assigns them. |
| Future real OCA client boundary | Future explicit runtime/client leaf | Injected real-client port or factory contract with redacted status and explicit runtime-value containment. | Default client construction, default network calls, default credentials, direct SDK or process execution from package roots. |
| Future sidecar process boundary | Future sidecar contract leaf | Fake or inert sidecar descriptor and explicit lifecycle vocabulary. Runtime transport and process supervision remain later work. | Sidecar runtime, process spawning, daemon startup, remote transport, deployment wiring, sidecar readiness claim. |
| Approval execution boundary | Future approval integration leaf | Approval-required operation declarations, safe pending-approval descriptors, and permission-before-token-consume requirements. | Executing mutating work before approval, bypassing core or plugin approval flow, raw callback payloads, direct approval token values in public output. |
| Runtime value containment | Future credential/runtime leaf | Runtime-only values hidden behind injected runtime edges and public redacted descriptors. | Resolved secrets, credential values, endpoint values, SDK clients, process identifiers, or runtime handles in public DTOs, docs, reports, logs, durable records, or examples. |
| Raw OCA payload containment | Future no-leak and sanitizer leaves | Safe summaries, refs, bounded status, redacted diagnostics, and policy-gated artifact references. | Raw OCA logs, raw diffs, raw command output, stdout, stderr, stack traces, local paths, raw internal JSON, raw provider payloads, or raw tool payloads. |

## Descriptor-only OCA wrapper boundary

The descriptor-only OCA wrapper boundary is the earliest safe source slice after this plan. It may define names, refs, operation classifications, readiness vocabulary, approval classifications, and safe presentation descriptors. It must remain inert by construction.

A descriptor-only boundary must preserve these rules:

- descriptors are data-only and JSON-safe;
- descriptors do not construct or call an OCA client;
- descriptors do not spawn, supervise, or communicate with a sidecar process;
- descriptors do not read secrets, config, environment, files, network endpoints, or provider state;
- descriptors do not imply that OCA is ready, sidecar is ready, or LifeOS/domain behavior is ready;
- operation states such as descriptor-only, blocked, configured-no-client, or configured-no-store are not passes;
- provider acknowledgement remains separate from business success where future real-system attempts are discussed.

## Future real OCA client boundary

A future real OCA client boundary must be an explicit runtime edge. It may only become real when a later prompt assigns runtime/client behavior, runtime value handling, redacted public projection, tests, and release-gate wording.

Future real-client work must be injected and opt-in. It must not be reachable from package-root import, default tests, static checks, documentation examples, or safe descriptor construction. A missing client, closed gate, missing credential, blocked policy, missing store, or ready-to-run state is not a real execution pass.

## Future sidecar process boundary

Sidecar remains an optional later deployment and scaling mode. W28A does not decide that sidecar is required for OCA, nor does it define a production sidecar transport.

A future sidecar boundary may describe:

- sidecar identity and capability descriptors;
- safe lifecycle states;
- request and response envelope ownership;
- redacted health and readiness projection shape;
- explicit no-default-startup rule;
- explicit no-default-network rule;
- explicit process-supervision non-claim;
- explicit deployment non-claim.

It must not implement or imply process spawning, server startup, client startup, daemon behavior, scheduling, retries, network transport, deployment manifests, or production operations.

## Approval execution boundary

OCA and sidecar operations that can mutate files, branches, sessions, repositories, durable state, external tools, or remote provider state must be approval-aware before any future execution is allowed.

Future approval integration must preserve:

- policy check before execution;
- approval-required descriptors before mutating operations;
- permission-before-token-consume for callbacks or action continuations;
- idempotency and replay rules for repeated operations;
- safe correlation refs;
- safe pending, denied, skipped, blocked, accepted, failed, and completed summaries;
- no raw callback payloads or token values in public output.

W28A adds no approval runtime and no execution path.

## Runtime value containment

Runtime values include resolved credentials, runtime-only provider/client values, sidecar handles, process handles, SDK clients, endpoint values, and temporary execution outputs. They must stay inside explicit runtime edges.

Future public surfaces must use only redacted descriptors and safe refs. Runtime value containment must apply to docs, examples, reports, tests, readiness summaries, smoke summaries, durable records, package metadata, and presentation descriptors.

## Raw OCA payload containment

OCA output can contain sensitive repository, command, diff, log, environment, and stack material. Future OCA/sidecar work must treat all raw OCA output as private until normalized.

Allowed public material:

- safe refs;
- bounded status summaries;
- redacted diagnostic categories;
- approval and policy status;
- correlation and idempotency refs;
- safe artifact or details refs;
- explicit skipped, blocked, pending, or failed-safe classifications.

Forbidden public material:

- raw provider payloads;
- raw OCA internal payloads;
- raw logs, raw diffs, raw command output, stdout, or stderr;
- secrets, tokens, credential values, or resolved runtime values;
- endpoint examples that look real;
- local or absolute paths;
- stack traces;
- SDK, client, process, sidecar, connector, or tool internals.

## Non-goals

W28A and its planned leaf work do not implement or claim:

- real OCA client execution;
- sidecar runtime;
- process spawning;
- default network behavior;
- default secret or config loading;
- deployment behavior;
- OCA readiness;
- sidecar readiness;
- LifeOS or domain readiness;
- real-provider success;
- production readiness;
- package-root fan-in;
- local barrel fan-in;
- package metadata updates;
- broad static guard updates;
- release classifier updates.

## Max-parallel follow-up matrix

| Slice | Title | Allowed scope | Required boundaries | Reserved or forbidden work |
| --- | --- | --- | --- | --- |
| W28B | OCA and sidecar contract types | Narrow contract/type files for safe descriptor vocabulary, readiness states, approval classifications, and redacted status values. | Descriptor-only, JSON-safe, no runtime imports, no default client, no default sidecar, no package-root export. | Package root, local barrels, package metadata, current-development-state, README, broad static guards, runtime behavior. |
| W28C | Fake/inert OCA sidecar descriptor boundary | Fake or inert descriptor constructor or descriptor fixture for OCA sidecar planning, if explicitly assigned. | Inert by default, no process, no network, no secret/config loading, no real sidecar transport, no readiness claim. | Real sidecar runtime, process spawning, deployment files, package exports, shared docs, runtime client execution. |
| W28D1 | Static guard for W28B | Narrow static guard that protects W28B public vocabulary from unsafe fields, runtime imports, and readiness overclaims. | Must target W28B-owned files only unless the prompt assigns a precise guard path. | Broad repository static guard rewrites, package metadata, package roots, sibling outputs. |
| W28D2 | Static guard for W28C | Narrow static guard that protects W28C fake/inert descriptor from side effects, network/process behavior, and unsafe public examples. | Must target W28C-owned files only unless the prompt assigns a precise guard path. | Broad repository static guard rewrites, package metadata, package roots, sibling outputs. |
| W28E | Fan-in after all W28 leaves are merged | Package-root exports, local barrels, package metadata, current-development-state, README, and broad static guards only if assigned and only after W28B, W28C, W28D1, and W28D2 are merged. | Fan-in must preserve non-production posture and must not claim OCA, sidecar, LifeOS, deployment, production runtime, or real-provider readiness. | Running before all leaves merge, deciding merge readiness, implementing runtime behavior, changing unrelated packages. |

## Shared-file reservation for W28E only

The following shared surfaces are reserved for W28E only and must not be edited by W28B, W28C, W28D1, or W28D2 unless a later Orchestrator prompt explicitly changes ownership:

- package root exports;
- local barrels;
- package metadata;
- docs/roadmap/current-development-state.md;
- README;
- broad static guards.

Leaf slices must stop and report a fan-in need if they require any of these surfaces. They may finish safe owned-file work only when the prompt allows partial completion.

## Static guard needs

Future static guards should protect real architectural invariants, not temporary orchestration bookkeeping.

W28D1 should check that W28B contract types remain descriptor-only and no-leak safe. It should guard against unsafe public field names, runtime imports, process or network vocabulary that implies execution, readiness overclaims, and non-JSON-safe public shapes.

W28D2 should check that W28C fake or inert descriptors remain inert. It should guard against sidecar process behavior, network calls, secret/config loading, real client construction, raw OCA payload fields, endpoint-like examples, local-path-like examples, stack/log/stdout/stderr examples, and package-root fan-in.

Broad static guard cleanup, package-root import inertness across packages, and cross-leaf export assertions belong to W28E only.

## Fan-in rules

W28E is the only planned fan-in slice for W28. W28E may run only after W28B, W28C, W28D1, and W28D2 are merged or explicitly declared unavailable by the Orchestrator.

W28E must verify:

- all leaf outputs are merged before shared exports are touched;
- shared files are reserved in the W28E prompt;
- leaf public vocabulary remains descriptor-only or fake-inert;
- package roots remain side-effect free;
- examples remain redacted and JSON-safe;
- no runtime, process, network, credential, deployment, provider, OCA, sidecar, or LifeOS behavior is added by fan-in;
- no OCA readiness, sidecar readiness, LifeOS readiness, deployment readiness, real-provider success, or production readiness claim is introduced.

W28E must not merge, decide merge readiness, or use sibling outputs before they are present on the target branch.

## Public examples policy

This plan intentionally includes no executable examples. Future examples, if assigned, must be documentation-only, redacted, synthetic, JSON-safe, and visibly non-runtime. They must avoid raw provider payloads, raw secrets, endpoint examples that look real, local paths, stack traces, logs, stdout, stderr, raw OCA output, raw diffs, raw tool payloads, and connector or tool internals.
