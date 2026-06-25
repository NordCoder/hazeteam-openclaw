# Adapter Readiness

## 1. Purpose

This document defines the CD11.2 readiness ladder for the OpenClaw/Telegram adapter track. It is release-facing vocabulary for classifying evidence, limitations, and gates.

The active target is adapter readiness for real-system integration, not production deployment. OCA, Codex, LifeOS, and domain/product overlays remain parked until that adapter gate is actually met.

## 2. Current repository posture

The current repository must not claim any of the following:

- `adapter-ready-for-real-system-integration`;
- `adapter-real-integration-ready`;
- `production-ready`.

The current repository may contain safe adapter contracts, plugin-runtime shells, Telegram transport surfaces, deterministic fakes, fake/inert OCA wrapper surfaces, and descriptor-only LifeOS/domain surfaces. Those surfaces do not by themselves prove adapter-ready-for-real-system-integration.

## 3. Readiness levels

### 3.1 `contract-ready`

A component is `contract-ready` when public contracts exist and can be reviewed safely without real provider execution.

Required evidence:

- stable public DTOs, refs, result envelopes, descriptors, and error/status vocabulary;
- declared no-leak boundaries for provider payloads, callback payloads, runtime objects, secrets, paths, stacks, clients, logs, and diffs;
- static boundary tests for the relevant public surface;
- unit tests for local normalization, validation, invalid inputs, and safe failure categories;
- package docs that state current support and non-goals;
- no required real network, provider SDK/client, credential value, deployment process, durable backend, or sidecar.

This level is not enough for real-system integration.

### 3.2 `fake-e2e-ready`

A component is `fake-e2e-ready` when deterministic fake flows prove its public package-root behavior without secrets or network.

Required evidence:

- package-root import is side-effect-free;
- fake or injected ports drive the complete path through public package roots;
- inbound fake E2E covers provider-shaped input normalization into safe command or intent output;
- outbound fake E2E covers adapter/core output through rendering, delivery request construction, and provider-ack normalization;
- callback fake E2E covers callback input normalization, permission-before-token-consume, safe decision/result output, replay denial, and unsafe input rejection;
- durable fake E2E covers idempotency, replay, topic binding, callback-token lifecycle, delivery attempts, correlation, and readiness snapshots where relevant;
- readiness aggregation fake E2E covers config, credentials posture, core facade, transport, stores, runtime shell, smoke state, and production-claim status;
- no-leak assertions cover public outputs, readiness, smoke summaries, rendered delivery descriptors, callback results, errors, examples, and docs snippets;
- provider acknowledgement remains separate from business success;
- default CI and default `npm run check` remain no-network and secret-free.

This is the minimum confidence level for the adapter foundation, but it is still not a real-provider pass.

### 3.3 `secret-gated-ready`

A component is `secret-gated-ready` when a narrow real edge can be attempted only under explicit operator-controlled gates.

Required evidence:

- real execution is opt-in and never part of default CI;
- library packages do not read `process.env` directly for secrets;
- credential/runtime values are resolved through injected interfaces or deployment-owned edge code;
- public output distinguishes secret handle, credential ref, resolved runtime-only value, and redacted descriptor;
- smoke reports are redacted, status-precise, and no-leak tested;
- blocked and skipped smoke states are reported honestly and are not counted as provider passes;
- a passed smoke states exactly which narrow provider edge it proves.

This level can support adapter-real-integration planning, but it is not production readiness.

### 3.4 `adapter-ready-for-real-system-integration`

The adapter is `adapter-ready-for-real-system-integration` when the repository is ready to be wired into a real host/system under explicit gates while still avoiding production-readiness overclaims.

Required evidence:

1. Plugin runtime profile/readiness registry is public and tested.
2. OpenClaw adapter fake E2E covers inbound, outbound, callback, rendering, delivery, storage, approval boundaries, and core public facade integration.
3. Telegram transport fake E2E covers safe event normalization, routing tuple authority, delivery acknowledgement normalization, callback normalization, and no-leak output.
4. Durable adapter-state contracts and fakes cover topic bindings, callback tokens, delivery attempts, idempotency/replay, correlation, and readiness snapshots.
5. Runtime value boundary distinguishes secret handles, credential refs, resolved secret values, runtime-only values, and public redacted descriptors.
6. Secret-gated smoke is opt-in, redacted, status-precise, and excluded from default CI.
7. Default `npm run check` remains no-network and secret-free.
8. Static tests protect real boundaries without freezing temporary topology.
9. Documentation and release notes state the exact real behavior proven and the remaining limitations.
10. OCA, LifeOS, sidecar, deployment runtime, and production durable backend remain future unless explicitly implemented and tested by assigned later slices.

This gate does not require a production daemon, webhook server, polling loop, sidecar, production durable backend, or product-layer behavior.

### 3.5 `adapter-real-integration-ready`

`adapter-real-integration-ready` is release-gate vocabulary for the same milestone as `adapter-ready-for-real-system-integration`.

Use this wording only when writing a release classifier or final readiness report. It requires the same evidence as `adapter-ready-for-real-system-integration`, plus a final evidence table that names the passing checks, skipped/blocked checks, remaining limitations, and downstream unlock decision.

Only the assigned release-closure work may make the final `adapter-real-integration-ready` claim.

### 3.6 `production-ready`

A component is `production-ready` only after production runtime behavior and operations have been implemented, tested, and documented.

Required evidence:

- at least one production transport mode is implemented and tested;
- production credential loading/resolution exists in an explicit deployment/runtime edge;
- durable backend, idempotency, replay, delivery/callback lifecycle, backup/restore, migration, and recovery behavior are tested;
- health/readiness endpoint or OpenClaw diagnostic surface is implemented;
- operator documentation, security documentation, known limitations, and release notes are current;
- appropriate real smoke passes in the intended environment;
- security/no-leak gates pass.

The W16-W18 adapter-readiness track must not claim production readiness unless a later prompt explicitly reassigns that target and supplies the required evidence.

## 4. Required future evidence categories

The future adapter-ready gate must include these evidence categories:

| Evidence category | Purpose |
|---|---|
| Package-root no-side-effect matrix | Proves public entrypoints can be imported without network, secret reads, client construction, listener startup, store connection, or process supervision. |
| Fake E2E matrix | Proves inbound, outbound, callback, durable, readiness, and failure paths through public package roots using deterministic fakes. |
| Readiness aggregation | Produces a unified safe summary across plugin runtime, OpenClaw adapter, Telegram transport, credentials posture, core facade, durable stores, smoke state, and production-claim status. |
| Durable state fakes | Prove topic binding, callback token, delivery attempt, inbound idempotency, replay, correlation, and readiness snapshot contracts without production storage. |
| No-leak matrix | Proves public outputs, errors, docs examples, smoke output, readiness output, delivery descriptors, callback results, and serialized summaries do not expose forbidden raw or secret material. |
| Opt-in redacted smoke | Proves the real edge is disabled by default, explicit when enabled, redacted in output, precise in status, and honest about skipped/blocked cases. |

No single category substitutes for another. A missing category keeps the repository below adapter-ready-for-real-system-integration.

## 5. Real smoke status rules

Real smoke is not a default check and must never require secrets or network during `npm run check`.

Valid release-facing smoke status vocabulary:

- `skipped`;
- `blocked-missing-profile`;
- `blocked-missing-secret`;
- `blocked-missing-port`;
- `blocked-network-gate-closed`;
- `ready-to-run`;
- `passed`;
- `failed-safe`.

Only `passed` can be counted as a provider-edge pass, and only for the narrow edge that was executed. `skipped`, `blocked-*`, and `ready-to-run` are not passes.

Smoke output must not expose resolved tokens, credentials, endpoints, raw provider payloads, raw callback payloads, provider clients, SDK handles, stack traces, raw logs, raw diffs, command output, or filesystem paths.

## 6. Default check discipline

Default repository checks must remain deterministic, no-network, and secret-free.

Default checks may include static, unit, acceptance, fake E2E, and no-leak tests. They must not:

- require real Telegram/OpenClaw credentials;
- call real providers;
- read deployment secrets from library package roots;
- construct production provider clients by default;
- start listener, webhook, polling, daemon, sidecar, or production store processes.

Gated real smoke may be run separately and reported separately. A blocked or skipped real smoke is safe posture but not a pass.

## 7. Parked overlays are not readiness evidence

OCA, Codex, LifeOS, and domain/product overlays are parked downstream overlays until the adapter-ready gate passes.

The following are not evidence for adapter readiness:

- fake/inert OCA wrapper behavior;
- descriptor-only LifeOS/domain package surfaces;
- product-specific agent definitions;
- product-specific command catalogs;
- domain-specific policy expansion;
- sidecar or deployment plans without implemented and tested adapter evidence.

These overlays may be documented as parked, but they must not be used to satisfy plugin runtime composition, Telegram transport E2E, adapter-wide readiness aggregation, durable adapter-state, no-leak, real-smoke, or production gates.

## 8. Negative readiness claims

The adapter is not ready for real-system integration if any of the following are true:

- fake E2E is missing for inbound, outbound, or callback paths;
- durable state fakes are missing for adapter-owned lifecycle contracts;
- package-root import can call network, read secrets, construct clients, start listeners, or connect stores;
- public outputs can include raw provider payloads, raw callback payloads, raw paths, raw logs, raw diffs, tokens, credentials, stack traces, endpoints, chat IDs, thread IDs, provider clients, SDK handles, or runtime-only values;
- secret-gated smoke reports skipped or blocked as passed;
- docs claim production listener, webhook, polling, sidecar, deployment runtime, durable backend, OCA execution, or LifeOS behavior that current source and tests do not prove.

## 9. Release classifier rule

Wave 1 documentation may define the readiness ladder and required evidence. It must not make the final adapter-ready or production-ready claim.

A later final readiness report must classify the repository using one of:

- `not-ready`;
- `contract-ready`;
- `fake-e2e-ready`;
- `secret-gated-ready`;
- `adapter-ready-for-real-system-integration`;
- `adapter-real-integration-ready`;
- `production-ready`.

The final classification must be backed by an evidence table and must treat skipped/blocked real smoke as not passed.
