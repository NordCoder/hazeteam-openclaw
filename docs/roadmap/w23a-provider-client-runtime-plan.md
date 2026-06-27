# W23A Provider Client Runtime Boundary Plan

## Status

W23A is a planning-only roadmap slice for future provider client runtime work.

The repository remains adapter-ready-for-real-system-integration under explicit gates and not production-ready.

This plan does not implement provider clients, provider SDK imports, network calls, runtime startup, secret or config loading, package exports, CI, scripts, tests, or production readiness.

## Scope of this document

This document defines ownership, vocabulary, follow-up worker slices, no-leak requirements, provider acknowledgement semantics, and fan-in rules for a future real provider client boundary.

It is intentionally limited to future planning. It does not make a real-provider success claim and does not change current repository behavior.

## Current posture preserved

Future W23 work must preserve these current repository limits until explicitly implemented and tested by scoped follow-up phases:

- no production OpenClaw SDK or provider client wiring;
- no production Telegram or OpenClaw provider runtime;
- no listener, webhook server, callback HTTP endpoint, polling loop, daemon, or default runtime startup;
- no production credential loader or default secret/config loading;
- no default network behavior;
- no production deployment runtime;
- no deployment, OCA, LifeOS, domain-product, sidecar, or production provider runtime readiness claim;
- ready-to-attempt is not pass;
- no real-provider success claim from skipped, blocked, ready-to-attempt, ready-to-run, or acknowledgement-only states.

## Future provider-client ownership boundaries

### Provider client contract vocabulary

A future provider-client boundary should define safe vocabulary before any real client implementation exists. The vocabulary should distinguish:

- provider kind: a safe normalized label such as telegram or openclaw, not an SDK class or raw config object;
- provider operation: a bounded operation category such as outbound delivery, callback acknowledgement, or readiness probe;
- provider request descriptor: a redacted, JSON-safe description of the requested operation;
- provider acknowledgement result: the provider-level outcome of submitting or receiving an operation;
- internal business result: the adapter or core lifecycle outcome after provider acknowledgement has been interpreted;
- public provider error projection: a safe error class, stable reason, retry hint, and redacted metadata only;
- raw provider payload: SDK, HTTP, callback, response, error, log, config, stack, or client-handle material that must remain internal.

The contract vocabulary must not expose provider SDK types, concrete client classes, runtime-only credential values, raw network payloads, stack traces, local paths, branch names, diffs, logs, or unredacted provider configuration.

### Explicit injected client boundary

Future real provider clients must be supplied through explicit injection at the runtime or deployment edge. Generic adapter code must not construct a provider SDK client by default.

The future injected boundary should make these facts visible:

- whether a provider client is absent, fake/inert, ready to attempt, attempted, acknowledged, failed, or blocked;
- whether a network gate is closed or open;
- whether required runtime credential references are unresolved, resolved only as opaque runtime handles, or blocked;
- whether an operation is read-only, persistent-write, or destructive;
- whether the operation is eligible for a real smoke attempt under explicit gates.

Default package import, build, check, and test paths must remain side-effect-free, no-network, and no-secret.

Ready-to-attempt is not pass. It means only that all explicitly scoped gates appear sufficient for an attempted provider edge; it must not be reported as provider acknowledgement, business success, real-provider success, production provider runtime readiness, or production readiness.

### Provider acknowledgement result boundary

Provider acknowledgement is not business success.

A provider acknowledgement means only that a provider-level boundary accepted, returned, delivered, rejected, or otherwise classified the provider operation. It must not imply that an adapter command completed, a callback token was authorized or consumed, an OCA or LifeOS workflow succeeded, a durable lifecycle completed, or a user-visible business action succeeded.

Future results should keep at least two independently visible classifications:

- provider acknowledgement class: accepted, delivered, rejected, throttled, unavailable, timed out, blocked, skipped, or unsafe;
- business lifecycle class: not-started, pending, completed, failed, duplicate-suppressed, permission-denied, or not-applicable.

Acknowledgement-only evidence must remain below pass for any real-provider success claim.

### Raw provider payload containment

Raw provider payloads must be contained behind the provider-client boundary. Future work must not publish, serialize, snapshot, log, or store raw provider payloads in public DTOs, durable records, readiness summaries, smoke reports, or test fixtures.

Contained raw material includes:

- raw SDK request and response objects;
- raw HTTP request, response, header, or body content;
- raw callback payloads;
- raw provider error objects;
- provider client handles;
- token, secret, credential, session, webhook, or config values;
- stack traces, private paths, branch names, diffs, logs, or repository output.

Only safe normalized refs, redacted descriptors, stable reason codes, retry hints, and JSON-serializable public metadata may cross the public boundary.

### Safe public error and result projection

Future public provider-client results should be safe by construction:

- JSON-serializable values only;
- no functions, class instances, symbols, SDK objects, Error instances, or client handles;
- no raw provider payload fields;
- no secret or config values;
- no stack traces, private paths, raw logs, diffs, branch names, or local environment dumps;
- stable public reason codes rather than provider-native error messages when the native message may contain sensitive data;
- redacted metadata only, with explicit unsafe-output classification when redaction cannot be guaranteed.

Example safe projection fields are providerKind, operationKind, acknowledgementClass, businessLifecycleClass, retryable, reasonCode, redactedExternalRef, and unsafeOutputDetected. Values must be normalized strings, booleans, numbers, nulls, or JSON-safe arrays/objects.

## Non-goals for W23A and future leaf planning

W23A does not add and future W23 planning leaves must not pre-add:

- provider SDK or concrete provider client implementation;
- provider SDK imports;
- default network behavior;
- default runtime startup;
- default listener, webhook, polling loop, daemon, or callback HTTP endpoint behavior;
- default secret or config loading;
- production provider runtime readiness;
- real-provider success claim;
- deployment readiness;
- OCA readiness;
- LifeOS or domain-product readiness;
- sidecar readiness;
- package-root exports, local barrels, package metadata changes, README updates, current-state updates, broad static guard edits, CI, scripts, or tests outside the explicitly assigned follow-up slice.

## Max-parallel follow-up matrix

| Slice | Purpose | Owned scope | Must not do | Fan-in dependency |
|---|---|---|---|---|
| W23B | Provider client contract types | Define safe provider-client vocabulary, acknowledgement classes, business lifecycle classes, redacted public result shapes, and no-leak type boundaries in an isolated source leaf. | No real client, no SDK import, no network, no runtime startup, no secret/config loading, no package-root export. | Exposed only by W23E after all W23 leaves merge. |
| W23C | Fake/inert provider client port | Define an injected fake/inert provider client port boundary and deterministic fake behavior for local tests or future tests, without real provider behavior. | No real client, no SDK import, no network, no default runtime startup, no secret/config loading, no production provider readiness. | Exposed only by W23E after all W23 leaves merge. |
| W23D1 | Static guard for W23B | Add a narrow no-leak/static guard for the W23B contract vocabulary and public projection constraints. | No broad global static guard edits unless explicitly assigned, no package-root export, no W23C assumptions. | Runs independently before W23E. |
| W23D2 | Static guard for W23C | Add a narrow no-leak/static guard for the W23C fake/inert provider client port boundary. | No broad global static guard edits unless explicitly assigned, no package-root export, no W23B expansion. | Runs independently before W23E. |
| W23E | Fan-in | After W23B, W23C, W23D1, and W23D2 are merged, expose the agreed public surface, reconcile docs, and update shared state only as explicitly assigned. | No new provider runtime behavior, no real SDK/client implementation, no network, no secret/config loading, no production readiness claim. | Must wait until all W23 leaves are merged. |

## Shared file reservation for W23E only

The following shared files and surfaces are reserved for W23E only. Parallel W23 leaves must not touch them unless a later prompt explicitly changes the reservation:

- package root files;
- local barrels;
- package metadata;
- docs/roadmap/current-development-state.md;
- README files;
- broad static guards.

If a leaf discovers that one of these shared surfaces is required, it must stop that part of the work and report the shared-file need instead of editing the file.

## Fan-in rules

W23E is the only W23 slice allowed to reconcile cross-leaf public exposure. It may run only after all W23 leaf branches are merged or otherwise explicitly accounted for by the Orchestrator.

Before W23E, each W23 leaf must remain independently safe:

- no sibling branch dependency;
- no package-root or shared barrel dependency;
- no production runtime behavior;
- no default network or secret behavior;
- no readiness overclaim;
- no raw provider payload or unsafe public output.

W23E must preserve the current classification unless a later explicit release-gate phase proves a different claim. A fan-in may expose safe contracts or fake/inert ports, but exposure alone must not be described as real provider support or production provider runtime readiness.

## Public examples policy

Any future public examples for provider-client results must be redacted and JSON-safe. They may show normalized provider kind, operation kind, acknowledgement class, business lifecycle class, retryability, reason code, and redacted external references. They must not show raw provider payloads, raw callback data, secret/config values, SDK client handles, stack traces, logs, diffs, branch names, or local paths.

## W23A handoff

W23A creates this roadmap document only. Future W23 implementation requires separate Worker prompts with explicit allowed files, non-goals, no-leak checks, and fan-in reservations.
