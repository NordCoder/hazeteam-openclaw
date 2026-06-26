# Runtime Edge Boundaries

## Purpose

This document defines the runtime-edge vocabulary and safety boundaries for the W18 real-edge preparation track. It is explanatory architecture documentation only.

This document does not implement source behavior, does not update release classifiers, does not summarize final release evidence, and does not classify the repository as `adapter-ready-for-real-system-integration` or `production-ready`.

The active scope remains the generic OpenClaw/Telegram adapter. OCA, LifeOS/domain behavior, sidecar, deployment runtime, production durable backend, production listener/webhook/polling runtime, and product-layer behavior remain parked until the adapter-ready gate is explicitly reached by release closure.

## Readiness vocabulary

Readiness labels describe evidence classes. They are not interchangeable.

| Label | Meaning | Evidence boundary | Not proven |
| --- | --- | --- | --- |
| `contract-ready` | Public contracts, DTOs, refs, descriptors, status vocabulary, and no-leak boundaries can be reviewed safely. | Static and unit evidence for local contracts; no real provider execution required. | Full adapter flow, provider interaction, durable lifecycle, secret-gated provider pass, real-system integration, or production runtime. |
| `fake-e2e-ready` | Deterministic adapter paths execute through public package-root behavior using fakes or injected ports only. | Inbound, outbound, callback, durable replay/idempotency, no-leak, and package-root no-side-effect fake evidence. | Real provider success, real credential resolution, listener/webhook/polling runtime, deployment runtime, or production durability. |
| `secret-gated-ready` | A narrow real edge can be attempted only under explicit operator-controlled gates. | Opt-in smoke path, injected runtime value resolver/provider port, redacted output, precise skipped/blocked/failed/passed status, no default CI network. | General real-system integration, default network behavior, production runtime, or broad provider coverage. |
| `adapter-ready-for-real-system-integration` | A future release-classified state where the adapter can be wired into a real host/system under explicit gates while avoiding production claims. | Fake E2E matrix, readiness aggregation, durable adapter-state evidence, runtime value boundary, provider client port boundary, secret-gated smoke evidence, no-leak evidence, and release-closure documentation. | Production daemon/server/polling runtime, production credential loading and rotation, production durable backend, deployment supervision, sidecar, OCA, LifeOS, or product behavior. |
| `production-ready` | A future production/runtime/operations state. | Production listener/webhook/polling runtime, deployment lifecycle, production credential loading/rotation, production durable backend, health/readiness operations, monitoring, recovery, rollback, and production-grade tests. | Not a W18 Wave 3 target and not implied by any adapter-real-integration evidence. |

## Current evidence limits

W17H evidence proves fake/inert E2E behavior only. It does not prove a real-provider pass.

The W17H acceptance layer is useful because it exercises deterministic public flows and no-leak constraints without secrets or network:

- W17H1 covers inbound provider-shaped fixture normalization into safe routing and command-intent behavior.
- W17H2 covers outbound render/delivery request behavior and provider acknowledgement normalization through fakes.
- W17H3 covers callback permission-before-token-consume behavior through fakes.
- W17H4 covers durable replay/idempotency behavior through fake stores and fake executors.
- W17H5 covers public-output no-leak behavior.
- W17H6 covers package-root no-side-effect behavior.

Those tests support fake/inert evidence. They do not demonstrate that a real Telegram/OpenClaw provider accepted a request, that a real credential was resolved, that a real listener or webhook is running, or that production deployment behavior exists.

W18A, W18B, and W18D prepare real-edge boundaries only:

- W18A prepares runtime value and credential resolver boundaries.
- W18B prepares provider client port boundaries.
- W18D prepares listener/webhook/polling interface or descriptor boundaries.

Those slices should make later secret-gated work safer. They do not by themselves create production runtime behavior, default network behavior, final release readiness, or product-layer behavior.

## Runtime value boundary

Runtime values must be split into explicit classes so public adapter output can describe readiness without leaking executable or secret material.

| Class | Meaning | Public output rule |
| --- | --- | --- |
| Secret handle | Opaque runtime reference to a secret managed outside public DTOs. | May be represented only by a non-resolving redacted handle reference, such as `secretHandleRef`; never expose the actual value. |
| Credential ref | Safe descriptor that names the configured or missing credential abstractly. | May include fields such as `credentialRef`, `credentialStatus`, `kind`, `blockedReason`, and a redacted label. |
| Resolved runtime-only value | Actual resolved value or value derived from a resolved secret/provider runtime for one provider call. | Must stay inside the explicit runtime/smoke/provider edge and be dropped or redacted before any public result, durable safe record, log, report, or documentation example. |
| Public redacted descriptor | Safe descriptor for readiness or failure. | May report configured/missing/invalid/blocked status, safe diagnostic categories, provider acknowledgement status, and redacted failure summary. |

Library packages must not read `process.env` directly for secrets. Environment reading belongs only to explicit edge scripts, deployment/runtime adapters, or other scoped edge code that is outside safe package-root side effects. Library packages receive credential refs, resolvers, handles, or runtime-only values through injection.

Public projections must omit resolved runtime-only values. A resolver may know whether a value was resolved, but public output should report only a redacted descriptor and a safe status such as `resolved`, `missing`, `invalid`, `disabled`, or `blocked`.

## Provider client isolation

Provider execution must sit behind an injected provider client port.

Safe foundation packages may define interfaces, ports, descriptors, request builders, redacted result envelopes, and fake clients. They must not construct provider SDK clients in safe package roots, default imports, default checks, or fake E2E paths.

Provider client isolation requires:

- an injected provider client port or explicitly scoped client factory;
- no SDK/client construction in safe package roots;
- no default network behavior;
- no direct secret loading in library packages;
- provider failures normalized to safe status, retryability, blocked reason, and redacted failure details;
- provider acknowledgement reported separately from business success.

Provider acknowledgement means the provider edge accepted or reported on the transport operation. It does not mean the business command, approval, domain operation, or product action succeeded. Public results must keep fields such as `providerAcknowledged`, `businessCompleted`, `safeStatus`, `blockedReason`, and `redactedFailure` conceptually separate.

## Listener, webhook, and polling boundary

Wave 3 may define listener/webhook/polling boundaries when assigned, but a boundary is not a daemon.

Allowed Wave 3 shapes include:

- listener lifecycle interfaces;
- webhook input descriptors;
- polling loop descriptors;
- runtime profile descriptors;
- safe event/callback output descriptors;
- blocked/disabled readiness descriptors;
- fake or inert interfaces used by tests.

Not implemented by Wave 3 unless explicitly assigned:

- production daemon startup;
- HTTP webhook server;
- long-running polling loop;
- socket connection lifecycle;
- timers or process supervision;
- deployment runtime;
- production credential loading;
- production durable backend;
- real provider network calls by default.

Any later real listener, webhook, or polling implementation must still emit the same safe channel event and callback descriptors used by fake E2E paths, preserve permission-before-token-consume, and keep provider acknowledgement distinct from business success.

## Secret-gated smoke rules

Secret-gated smoke is an opt-in real-edge evidence layer. It is not default behavior.

Required rules:

1. Smoke must be disabled by default.
2. Default `npm run check` and default CI must remain no-network and secret-free.
3. A smoke path must require explicit operator enablement and explicit runtime/profile gates.
4. A missing secret, missing provider port, disabled profile, or closed network gate must report a safe skipped or blocked status.
5. Skipped, blocked, or ready-to-run is not a passed provider call.
6. Only a passed smoke can count as a provider-edge pass, and only for the exact narrow edge it executed.
7. Smoke output must be redacted.
8. Public smoke summaries must not include credential values, token values, endpoints, provider handles, SDK/client handles, stack traces, raw payloads, filesystem paths, raw logs, diffs, command output, or resolved runtime-only values.
9. Smoke failures must return safe categories and redacted failure summaries.

A secret-gated smoke result can support later release closure only when it is status-precise and no-leak safe. It cannot replace fake E2E, durable replay, package-root no-side-effect, no-leak, or release documentation evidence.

## No-leak categories

The following material must not cross public safe boundaries unless transformed into a bounded safe ref, redacted descriptor, or safe category:

- raw provider payload;
- raw callback payload;
- token values;
- credentials and credential values;
- endpoints;
- SDK/client handles;
- provider handles;
- stack traces;
- filesystem paths;
- raw logs, diffs, and command output;
- runtime-only values.

This applies to public DTOs, readiness summaries, smoke summaries, delivery results, callback results, durable safe records, test fixtures intended as public examples, docs examples, reports, and errors.

Safe substitutes include:

- `channelRef`, `chatRef`, `threadRef`, `messageRef`, and `callbackRef`;
- `credentialRef`, `credentialStatus`, and `redactedCredentialDescriptor`;
- `secretHandleRef` when it is non-resolving and redacted;
- `providerAcknowledged` and safe provider status categories;
- `blockedReason`, `safeDiagnostics`, and `redactedFailure`.

## Parked overlays

OCA, LifeOS/domain behavior, sidecar, deployment runtime, production durable backend, production provider runtime, and product-layer behavior remain parked.

Parked means:

- they are not adapter-readiness evidence;
- they must not be advanced by Wave 3 runtime-edge preparation;
- they must not be used to substitute for OpenClaw/Telegram fake E2E, no-leak, provider-port, runtime-value, smoke, or release-gate evidence;
- they may be mentioned only to preserve excluded or downstream status unless a later post-gate prompt explicitly reopens them.

This document preserves that status and does not unlock OCA, LifeOS, sidecar, deployment, production durable backend, or product-layer implementation.

## Fan-in and release closure note

This document is intentionally not a release classifier. W18E2 may later integrate runtime-edge documentation into release or current-state docs after W18A, W18B, W18C, W18D, and W18E1 evidence is known. W18E3 remains the final classifier for any adapter-ready-for-real-system-integration decision.

Until that later release closure, use this document only as architecture guidance for safe runtime-edge boundaries.
