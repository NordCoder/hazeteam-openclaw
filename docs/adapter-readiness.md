# Adapter Readiness

## 1. Purpose

This document defines the CD11.2 readiness ladder for the OpenClaw/Telegram adapter track. It is release-facing vocabulary for classifying evidence, limitations, and gates.

The active status is adapter-ready-for-real-system-integration under explicit gates after W18E3 final classification. This is not production deployment readiness. OCA, Codex, LifeOS, sidecar, deployment runtime, production provider runtime, production credential loading, production durable backend, and domain/product overlays remain future work unless explicitly implemented and tested by later slices.

## 2. Current repository posture after W18E3 final classification

After W18E3 supplied the final evidence table and classifier decision in docs/release/w18e3-final-adapter-readiness-report.md, the final W18 classification is adapter-ready-for-real-system-integration under explicit gates.

The current repository still must not claim production-ready, production deployment readiness, production runtime readiness, production provider runtime readiness, production credential loading readiness, production durable backend readiness, sidecar readiness, OCA runtime readiness, or LifeOS/domain product readiness.

W18E3 does not use adapter-real-integration-ready as a separate final classification label. When older docs mention adapter-real-integration-ready, treat it as release-gate vocabulary for the same adapter-ready milestone, not as a production claim.

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
| W18F1 runtime edge docs | Runtime-edge vocabulary and limits are documented separately from final release classification. | Docs evidence only. |
| W18C secret-gated smoke refinement | Real smoke remains opt-in, redacted, status-precise, and excluded from default CI. | Skipped, blocked, and ready-to-run are not passes; current smoke code still does not call a real provider by default. |
| W18E1 release gate static/CI closure | Default test/check path remains no-network and secret-free; release docs are guarded against premature production-ready and adapter-ready claims before W18E3. | Static/CI gate evidence only; real smoke remains opt-in. |
| W18E2 release docs closure | Release-facing docs reflect merged evidence and limitations without claiming production readiness. | Docs evidence only. |
| W18E3 final adapter readiness report | Final evidence table, checks table, real-smoke table, no-leak table, parked overlays, downstream unlock decision, limitations, and final classifier. | Final adapter-ready classifier only; no production-ready claim. |

## 3. Readiness levels

### 3.1 contract-ready

A component is contract-ready when public contracts exist and can be reviewed safely without real provider execution.

Required evidence includes stable public DTOs, refs, result envelopes, descriptors, error/status vocabulary, no-leak boundaries, static boundary tests, unit tests for local validation, and docs that state current support and non-goals. This level does not require real network, provider SDK/client, credential value, deployment process, durable backend, or sidecar.

This level is not enough for real-system integration.

### 3.2 fake-e2e-ready

A component is fake-e2e-ready when deterministic fake flows prove its public package-root behavior without secrets or network.

Required evidence includes package-root import inertness, fake or injected ports through public roots, fake inbound E2E, fake outbound E2E, fake callback E2E, durable fake E2E, readiness aggregation fake E2E, no-leak assertions, provider acknowledgement/business success split, and default CI/check discipline.

W17H1-W17H6 document this class of fake/inert evidence for the acceptance concerns they own. This is still not a real-provider pass.

### 3.3 secret-gated-ready

A component is secret-gated-ready when a narrow real edge can be attempted only under explicit operator-controlled gates.

Required evidence includes opt-in execution, default CI exclusion, no direct library package secret reads, injected runtime-value handling, redacted public output, status-precise smoke reports, skipped/blocked/ready-to-run states not counted as provider passes, and a passed smoke only when a supplied redacted attempt proves provider acknowledgement and business success for the executed edge.

W18A, W18B, W18C, W18D, W18F1, and W18E1 document runtime-value, provider-port, listener/webhook/polling-interface, secret-gated smoke, runtime-edge docs, and release-gate static/CI evidence.

This level can support adapter-real integration planning, but it is not production readiness.

### 3.4 adapter-ready-for-real-system-integration

The adapter is adapter-ready-for-real-system-integration when the repository is ready to be wired into a real host/system under explicit gates while still avoiding production-readiness overclaims.

Required evidence:

1. Plugin runtime profile/readiness registry is public and tested.
2. OpenClaw adapter fake E2E covers inbound, outbound, callback, rendering, delivery, storage, approval boundaries, and core public facade integration.
3. Telegram transport fake E2E covers safe event normalization, routing tuple authority, delivery acknowledgement normalization, callback normalization, and no-leak output.
4. Durable adapter-state contracts and fakes cover topic bindings, callback tokens, delivery attempts, idempotency/replay, correlation, and readiness snapshots.
5. Runtime value boundary distinguishes secret handle, credential ref, resolved secret value, runtime-only value, and public redacted descriptor.
6. Secret-gated smoke is opt-in, redacted, status-precise, and excluded from default CI.
7. Default npm run check remains no-network and secret-free.
8. Static tests protect real boundaries without freezing temporary topology.
9. Documentation and release notes state the exact real behavior proven and remaining limitations.
10. OCA, LifeOS, sidecar, deployment runtime, and production durable backend remain future unless explicitly implemented and tested by assigned later slices.
11. W18E3 supplies the final evidence table and classifier decision.

After W18E3 final classification, this gate is the current adapter-readiness classification. This gate does not require a production daemon, webhook server, polling loop, sidecar, production durable backend, or product-layer behavior.

### 3.5 adapter-real-integration-ready

Adapter-real-integration-ready is release-gate vocabulary for the same milestone as adapter-ready-for-real-system-integration. W18E3 uses adapter-ready-for-real-system-integration as the final classification label.

### 3.6 production-ready

A component is production-ready only after production runtime behavior and operations have been implemented, tested, and documented.

Required evidence would include at least one production transport mode, production credential loading/resolution, durable backend, idempotency/replay/recovery, health/readiness endpoint or diagnostic surface, operator documentation, security documentation, known limitations, release notes, appropriate real smoke passes, and security/no-leak gates.

The W16-W18 adapter-readiness track must not claim production readiness unless a later prompt explicitly reassigns that target and supplies the required evidence.

## 4. Evidence categories for release review

| Evidence category | Current evidence reflected | Purpose | Boundary |
|---|---|---|---|
| Package-root no-side-effect matrix | W17H6 merged. | Proves public entrypoints can be imported without network, secret reads, client construction, listener startup, store connection, or process supervision. | Does not prove production runtime. |
| Fake E2E matrix | W17H1-W17H4 merged. | Proves inbound, outbound, callback, durable replay/idempotency, and related fake paths through public package roots using deterministic fakes. | Not a real-provider pass. |
| No-leak matrix | W17H5 merged. | Proves public outputs, errors, docs examples, smoke output, readiness output, delivery descriptors, callback results, and serialized summaries do not expose forbidden raw or secret material. | Not provider execution. |
| Runtime value boundary | W18A merged. | Distinguishes secret handles, credential refs, resolved runtime-only values, and public redacted descriptors. | No production credential loader. |
| Provider client port boundary | W18B merged. | Keeps provider execution behind injected ports and separates provider acknowledgement from business success. | No default SDK/client construction or provider network. |
| Listener/webhook/polling interface boundary | W18D merged. | Defines descriptors and interfaces for later runtime edges. | No daemon/server/listener/polling loop. |
| Runtime-edge documentation | W18F1 merged. | Keeps runtime-edge vocabulary, limitations, and parked overlays visible. | Not source behavior. |
| Opt-in redacted smoke | W18C merged. | Proves the real edge is disabled by default, explicit when enabled, redacted in output, precise in status, and honest about skipped/blocked/ready-to-run cases. | Only passed can count, and current smoke code does not call a real provider by default. |
| Release gate static/CI closure | W18E1 merged. | Protects no-network/no-secret default checks and premature claim guardrails. | Does not make production-ready claims. |
| Release docs closure | W18E2 merged. | Reflects merged evidence and limitations in release-facing docs. | Does not implement behavior. |
| Final classifier | W18E3 report created. | Provides final evidence table and classifier decision. | Does not claim production readiness. |

## 5. Real smoke status rules

Real smoke is not a default check and must never require secrets or network during npm run check.

Valid release-facing smoke status vocabulary includes skipped, blocked-missing-profile, blocked-missing-secret, blocked-missing-port, blocked-network-gate-closed, ready-to-run, passed, and failed-safe.

Only passed can be counted as a provider-edge pass, and only for the narrow edge that was executed. Skipped, blocked, and ready-to-run are not passes. A passed smoke requires supplied redacted execution evidence with provider acknowledgement and business success for the narrow executed edge.

Smoke output must not expose resolved tokens, credentials, endpoints, raw provider payloads, raw callback payloads, provider clients, SDK handles, stack traces, raw logs, raw diffs, command output, or filesystem paths.

## 6. Default check discipline

Default repository checks must remain deterministic, no-network, and secret-free.

Default checks may include static, unit, acceptance, fake E2E, and no-leak tests. They must not require real Telegram/OpenClaw credentials, call real providers, read deployment secrets from library package roots, construct production provider clients by default, or start listener, webhook, polling, daemon, sidecar, or production store processes.

Gated real smoke may be run separately and reported separately. A blocked, skipped, or ready-to-run real smoke is safe posture but not a pass.

## 7. Parked overlays are not readiness evidence

OCA, Codex, LifeOS, sidecar, deployment runtime, production durable backend, and domain/product overlays are parked downstream overlays.

The following are not evidence for adapter readiness:

- fake/inert OCA wrapper behavior;
- descriptor-only LifeOS/domain package surfaces;
- product-specific agent definitions;
- product-specific command catalogs;
- domain-specific policy expansion;
- sidecar or deployment plans without implemented and tested adapter evidence.

These overlays may be documented as parked. They must not be used to satisfy plugin runtime composition, Telegram transport E2E, adapter-wide readiness aggregation, durable adapter-state, no-leak, real-smoke, or production gates.

## 8. Negative readiness claims

The adapter cannot be classified as ready for real-system integration if any of the following are true:

- fake E2E is missing for inbound, outbound, or callback paths;
- durable state fakes are missing for adapter-owned lifecycle contracts;
- package-root import can call network, read secrets, construct clients, start listeners, or connect stores;
- public outputs can include raw provider payloads, raw callback payloads, raw paths, raw logs, raw diffs, tokens, credentials, stack traces, endpoints, chat IDs, thread IDs, provider clients, SDK handles, or runtime-only values;
- secret-gated smoke reports skipped, blocked, or ready-to-run as passed;
- docs claim production listener, webhook, polling, sidecar, deployment runtime, durable backend, OCA execution, or LifeOS behavior that current source and tests do not prove;
- OCA or LifeOS/domain overlays are used as adapter readiness proof;
- the final W18E3 evidence table and classifier decision are absent or superseded.

## 9. Release classifier rule

W18E3 supplied the final classifier for the W18 adapter-readiness closure. The allowed final release closure vocabulary is:

- not-ready;
- contract-ready;
- fake-e2e-ready;
- secret-gated-ready;
- adapter-ready-for-real-system-integration.

Production-ready is not an allowed W18E3 final classification. Adapter-real-integration-ready is not used as a separate W18E3 final classification label.

The final classification is backed by docs/release/w18e3-final-adapter-readiness-report.md and treats skipped, blocked, and ready-to-run real smoke as not passed.
