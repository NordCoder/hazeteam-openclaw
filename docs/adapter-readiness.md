# Adapter Readiness

## 1. Purpose

This document defines the CD11.2 readiness ladder for the OpenClaw/Telegram adapter track. It is release-facing vocabulary for classifying evidence, limitations, and gates.

The active target is adapter readiness for real-system integration, not production deployment. OCA, Codex, LifeOS, and domain/product overlays remain parked until that adapter gate is actually met.

## 2. Current repository posture after W18E2 docs closure

The current repository must not claim any of the following:

- `adapter-ready-for-real-system-integration`;
- `adapter-real-integration-ready`;
- `production-ready`.

W18E2 documents merged evidence and limitations only. W18E3 remains the final classifier and must consolidate the evidence before any final adapter readiness claim.

The current repository contains safe adapter contracts, plugin-runtime shells, Telegram transport surfaces, deterministic fakes, fake/inert OCA wrapper surfaces, and descriptor-only LifeOS/domain surfaces. Those surfaces do not by themselves prove adapter-ready-for-real-system-integration.

Merged evidence now reflected here:

| Evidence label | What is documented | Claim boundary |
|---|---|---|
| W17H1 inbound fake E2E | Provider-shaped fixture normalization into safe routing and command-intent behavior through fake/inert paths. | Fake/inert evidence only; not a real-provider pass. |
| W17H2 outbound fake E2E | Adapter result to render model to delivery request to provider acknowledgement/business-success split through fakes. | Fake/inert evidence only; provider acknowledgement remains separate from business success. |
| W17H3 callback permission fake E2E | Callback normalization, permission-before-token-consume, replay denial, and safe response through fakes. | Fake/inert evidence only; no real callback provider pass. |
| W17H4 durable replay fake E2E | Inbound, callback, delivery replay/idempotency, correlation, and safe durable lifecycle behavior through fake stores. | Fake/inert evidence only; no production durable backend. |
| W17H5 no-leak matrix | Public outputs remain JSON-serializable and free of raw provider data, raw callback data, tokens, secrets, paths, stack traces, provider handles, and SDK handles. | No-leak evidence only; not real provider execution. |
| W17H6 package-root no-side-effect matrix | Public package roots do not create provider clients, call network, read env secrets, connect durable stores, start listeners, start timers, deliver messages, execute callbacks, or consume tokens by default. | Default inertness evidence only; not production runtime. |
| W18A runtime value boundary | Secret handles, credential refs, resolved runtime-only values, and public redacted descriptors are distinct; public outputs do not contain secret values. | Boundary evidence only; no production credential loader. |
| W18B provider client port boundary | Provider execution sits behind injected provider ports; safe roots do not construct default provider SDK clients; provider acknowledgement is distinct from business success. | Port boundary evidence only; no default provider network execution. |
| W18D listener/webhook/polling boundary | Listener, webhook, and polling shapes are interfaces/descriptors only. | No daemon, webhook server, listener startup, polling loop, or production runtime. |
| W18F1 runtime edge docs | Runtime-edge vocabulary and limits are documented separately from final release classification. | Docs evidence only; no final adapter-ready claim. |
| W18C secret-gated smoke refinement | Real smoke remains opt-in, redacted, status-precise, and excluded from default CI. | Skipped, blocked, and ready-to-run are not passes; current smoke code still does not call a real provider by default. |
| W18E1 release gate static/CI closure | Default test/check path remains no-network and secret-free; release docs are guarded against premature production-ready and adapter-ready claims. | Static/CI gate evidence only; real smoke remains opt-in. |

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

W17H1-W17H6 now document this class of fake/inert evidence for the acceptance concerns they own. This is still not a real-provider pass.

### 3.3 `secret-gated-ready`

A component is `secret-gated-ready` when a narrow real edge can be attempted only under explicit operator-controlled gates.

Required evidence:

- real execution is opt-in and never part of default CI;
- library packages do not read `process.env` directly for secrets;
- credential/runtime values are resolved through injected interfaces or deployment-owned edge code;
- public output distinguishes secret handle, credential ref, resolved runtime-only value, and redacted descriptor;
- smoke reports are redacted, status-precise, and no-leak tested;
- blocked, skipped, and ready-to-run smoke states are reported honestly and are not counted as provider passes;
- a passed smoke states exactly which narrow provider edge it proves and includes a supplied redacted attempt with provider acknowledgement and business success for that executed edge.

W18A, W18B, W18C, W18D, W18F1, and W18E1 now document runtime-value, provider-port, listener/webhook/polling-interface, secret-gated smoke, runtime-edge docs, and release-gate static/CI evidence. This supports W18E3 evaluation, but W18E2 does not make the final adapter-ready claim.

This level can support adapter-real-integration planning, but it is not production readiness.

### 3.4 `adapter-ready-for-real-system-integration`

The adapter is `adapter-ready-for-real-system-integration` only when the repository is ready to be wired into a real host/system under explicit gates while still avoiding production-readiness overclaims.

Required evidence:

1. Plugin runtime profile/readiness registry is public and tested.
2. OpenClaw adapter fake E2E covers inbound, outbound, callback, rendering, delivery, storage, approval boundaries, and core public facade integration.
3. Telegram transport fake E2E covers safe event normalization, routing tuple authority, delivery acknowledgement normalization, callback normalization, and no-leak output.
4. Durable adapter-state contracts and fakes cover topic bindings, callback tokens, delivery attempts, idempotency/replay, correlation, and readiness snapshots.
5. Runtime value boundary distinguishes secret handle, credential ref, resolved secret value, runtime-only value, and public redacted descriptor.
6. Secret-gated smoke is opt-in, redacted, status-precise, and excluded from default CI.
7. Default `npm run check` remains no-network and secret-free.
8. Static tests protect real boundaries without freezing temporary topology.
9. Documentation and release notes state the exact real behavior proven and the remaining limitations.
10. OCA, LifeOS, sidecar, deployment runtime, and production durable backend remain future unless explicitly implemented and tested by assigned later slices.
11. W18E3 supplies the final evidence table and classifier decision.

This gate does not require a production daemon, webhook server, polling loop, sidecar, production durable backend, or product-layer behavior. W18E2 does not declare that this gate has been reached.

### 3.5 `adapter-real-integration-ready`

`adapter-real-integration-ready` is release-gate vocabulary for the same milestone as `adapter-ready-for-real-system-integration`.

Use this wording only when writing a release classifier or final readiness report. It requires the same evidence as `adapter-ready-for-real-system-integration`, plus a final evidence table that names the passing checks, skipped/blocked checks, remaining limitations, and downstream unlock decision.

Only W18E3 may make the final `adapter-real-integration-ready` claim.

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

## 4. Evidence categories now reflected for W18E3 review

W18E2 release docs now reflect these evidence categories without converting them into a final readiness claim:

| Evidence category | Current evidence reflected | Purpose | Boundary |
|---|---|---|---|
| Package-root no-side-effect matrix | W17H6 merged. | Proves public entrypoints can be imported without network, secret reads, client construction, listener startup, store connection, or process supervision. | Does not prove production runtime. |
| Fake E2E matrix | W17H1-W17H4 merged. | Proves inbound, outbound, callback, durable replay/idempotency, and related fake paths through public package roots using deterministic fakes. | Not a real-provider pass. |
| No-leak matrix | W17H5 merged. | Proves public outputs, errors, docs examples, smoke output, readiness output, delivery descriptors, callback results, and serialized summaries do not expose forbidden raw or secret material. | Not provider execution. |
| Runtime value boundary | W18A merged. | Distinguishes secret handles, credential refs, resolved runtime-only values, and public redacted descriptors. | No production credential loader. |
| Provider client port boundary | W18B merged. | Keeps provider execution behind injected ports and separates provider acknowledgement from business success. | No default SDK/client construction or provider network. |
| Listener/webhook/polling interface boundary | W18D merged. | Defines descriptors and interfaces for later runtime edges. | No daemon/server/listener/polling loop. |
| Runtime-edge documentation | W18F1 merged. | Keeps runtime-edge vocabulary, limitations, and parked overlays visible. | Not a release classifier. |
| Opt-in redacted smoke | W18C merged. | Proves the real edge is disabled by default, explicit when enabled, redacted in output, precise in status, and honest about skipped/blocked/ready-to-run cases. | Only `passed` can count, and current smoke code does not call a real provider by default. |
| Release gate static/CI closure | W18E1 merged. | Protects no-network/no-secret default checks and premature claim guardrails. | Does not make final adapter-ready or production-ready claims. |

No single category substitutes for another. W18E3 must consolidate the evidence before final release classification.

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

Only `passed` can be counted as a provider-edge pass, and only for the narrow edge that was executed. `skipped`, `blocked-*`, and `ready-to-run` are not passes. A passed smoke requires supplied redacted execution evidence with provider acknowledgement and business success for the narrow executed edge.

Smoke output must not expose resolved tokens, credentials, endpoints, raw provider payloads, raw callback payloads, provider clients, SDK handles, stack traces, raw logs, raw diffs, command output, or filesystem paths.

## 6. Default check discipline

Default repository checks must remain deterministic, no-network, and secret-free.

Default checks may include static, unit, acceptance, fake E2E, and no-leak tests. They must not:

- require real Telegram/OpenClaw credentials;
- call real providers;
- read deployment secrets from library package roots;
- construct production provider clients by default;
- start listener, webhook, polling, daemon, sidecar, or production store processes.

Gated real smoke may be run separately and reported separately. A blocked, skipped, or ready-to-run real smoke is safe posture but not a pass.

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

The adapter cannot be classified as ready for real-system integration if any of the following are true:

- fake E2E is missing for inbound, outbound, or callback paths;
- durable state fakes are missing for adapter-owned lifecycle contracts;
- package-root import can call network, read secrets, construct clients, start listeners, or connect stores;
- public outputs can include raw provider payloads, raw callback payloads, raw paths, raw logs, raw diffs, tokens, credentials, stack traces, endpoints, chat IDs, thread IDs, provider clients, SDK handles, or runtime-only values;
- secret-gated smoke reports skipped, blocked, or ready-to-run as passed;
- docs claim production listener, webhook, polling, sidecar, deployment runtime, durable backend, OCA execution, or LifeOS behavior that current source and tests do not prove;
- OCA or LifeOS/domain overlays are used as adapter readiness proof;
- W18E3 has not yet supplied the final evidence table and classifier decision.

## 9. Release classifier rule

Wave 1 documentation may define the readiness ladder and required evidence. W18E2 may update release-facing docs to reflect merged W17H and W18 evidence. Neither may make the final adapter-ready or production-ready claim.

W18E3 remains the final classifier and must classify the repository using one of:

- `not-ready`;
- `contract-ready`;
- `fake-e2e-ready`;
- `secret-gated-ready`;
- `adapter-ready-for-real-system-integration`;
- `adapter-real-integration-ready`;
- `production-ready`.

The final classification must be backed by an evidence table and must treat skipped, blocked, and ready-to-run real smoke as not passed.
