# Adapter Readiness

## 1. Purpose

This document defines the CD11.2 readiness ladder for the OpenClaw/Telegram adapter track. It is release-facing vocabulary for classifying evidence, limitations, and gates.

The active status after W19G Wave 5 documentation closure is adapter-ready-for-real-system-integration under explicit gates. This is not production-ready. OCA, Codex, LifeOS, sidecar, deployment runtime, production provider runtime, production credential loading, production durable backend, and domain/product overlays remain future work unless explicitly implemented and tested by later slices.

Wave 5 completed public-surface closure for the real integration attempt harness and runtime credential binding port. It did not add default provider execution, default provider/client construction, default secret loading, production durable backend, deployment runtime, or production readiness.

## 2. Current repository posture after Wave 5

The repository is adapter-ready-for-real-system-integration under explicit gates.

This means the generic OpenClaw/Telegram adapter can be wired into a real host/system only when the host explicitly supplies the required runtime edges and gates. It does not mean the package roots construct a real provider runtime by default.

Release-facing docs must continue to avoid claims of:

- production-ready;
- production deployment readiness;
- production runtime readiness;
- production provider runtime readiness;
- production credential loading readiness;
- production durable backend readiness;
- sidecar readiness;
- OCA runtime readiness;
- LifeOS/domain product readiness.

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
| W18C secret-gated smoke refinement | Real smoke remains opt-in, redacted, status-precise, and excluded from default CI. | Skipped, blocked, and ready-to-run are not passes; current default code path does not call a real provider. |
| W18D listener/webhook/polling boundary | Listener, webhook, and polling shapes are interfaces/descriptors only. | No daemon, webhook server, listener startup, polling loop, or production runtime. |
| W18F1 runtime edge docs | Runtime-edge vocabulary and limits are documented separately from final release classification. | Docs evidence only. |
| W18E1 release gate static/CI closure | Default test/check path remains no-network and secret-free; release docs are guarded against premature production-ready and adapter-ready claims before W18E3. | Static/CI gate evidence only; real smoke remains opt-in. |
| W18E2 release docs closure | Release-facing docs reflect merged evidence and limitations without claiming production readiness. | Docs evidence only. |
| W18E3 final adapter readiness report | Final evidence table, checks table, real-smoke table, no-leak table, parked overlays, downstream unlock decision, limitations, and final classifier. | Final adapter-ready classifier only; no production-ready claim. |
| W19A real integration attempt contract | Telegram integration harness defines a safe, redacted attempt plan/result contract with explicit gates, ready-to-attempt status, provider acknowledgement, and business success. | Contract evidence only; ready-to-attempt is not pass and provider acknowledgement alone is not business success. |
| W19B runtime credential binding port | Adapter runtime-values area defines an injected runtime credential binding port and redacted public projections. | Runtime credential values remain runtime-only and are not exported as public values. No production credential loader is implied. |
| W19C opt-in smoke harness runner | Smoke-test evidence covers gated harness states using fakes: skipped, blocked, ready-to-run, acknowledgement-only, passed with supplied redacted evidence, and failed-safe unsafe-output cases. | Smoke harness evidence only; not default real provider execution. |
| W19D/W19D3 Telegram integration harness public export and metadata fan-in | Telegram package root exposes the integration-harness public surface and descriptor metadata with productionReady false and defaultNetworkBehavior none. | Public export evidence only; no default provider/client construction or runtime startup. |
| W19E runtime credential binding public export | runtime-values barrel publicly exports W18A runtime-value boundary and W19B runtime credential binding port. | Public export evidence only; no default secret loading. |
| W19F2 static public-surface regression guard | Static test protects Wave 5 public-surface invariants, default script separation from real smoke, runtime-values barrel shape, and runtime overreach boundaries. | Static regression guard only; not runtime validation and not real-system validation. |

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

Required evidence includes opt-in execution, default CI exclusion, no direct library package secret reads, injected runtime-value handling, redacted public output, status-precise smoke reports, skipped/blocked/ready-to-run states not counted as provider passes, and a passed smoke only when supplied redacted attempt evidence proves provider acknowledgement and business success for the executed edge.

W18A, W18B, W18C, W18D, W18F1, W18E1, W19A, W19B, W19C, W19D, W19E, W19D3, and W19F2 document runtime-value, provider-port, listener/webhook/polling-interface, real integration attempt, runtime credential binding, public export, smoke harness, and static public-surface guard evidence.

This level can support adapter-real integration planning, but it is not production readiness.

### 3.4 adapter-ready-for-real-system-integration

The adapter is adapter-ready-for-real-system-integration when the repository is ready to be wired into a real host/system under explicit gates while still avoiding production-readiness overclaims.

Required evidence:

1. Plugin runtime profile/readiness registry is public and tested.
2. OpenClaw adapter fake E2E covers inbound, outbound, callback, rendering, delivery, storage, approval boundaries, and core public facade integration.
3. Telegram transport fake E2E covers safe event normalization, routing tuple authority, delivery acknowledgement normalization, callback normalization, and no-leak output.
4. Durable adapter-state contracts and fakes cover topic bindings, callback tokens, delivery attempts, idempotency/replay, correlation, and readiness snapshots.
5. Runtime value boundary distinguishes secret handle, credential ref, resolved secret value, runtime-only value, and public redacted descriptor.
6. Runtime credential binding port exists behind an injected runtime edge, and public projections stay redacted/json-safe without exporting runtime credential values as public values.
7. Real integration attempt contract exists with operator acknowledgement, network gate, runtime credential status, provider port status, safe refs, operation-class gate, ready-to-attempt status, supplied redacted attempt evidence, provider acknowledgement, and business success separated.
8. Secret-gated smoke is opt-in, redacted, status-precise, and excluded from default CI.
9. Default npm run check remains no-network and secret-free.
10. Static tests protect real boundaries without freezing temporary topology. W19F2 protects Wave 5 public-surface invariants as a static regression guard.
11. Documentation and release notes state the exact real behavior proven and remaining limitations.
12. OCA, LifeOS, sidecar, deployment runtime, and production durable backend remain future unless explicitly implemented and tested by assigned later slices.
13. W18E3 supplies the final W18 evidence table and classifier decision; W19G records Wave 5 documentation closure.

After W19G documentation closure, this gate remains the current adapter-readiness classification. This gate does not require a production daemon, webhook server, polling loop, sidecar, production durable backend, production credential loader, default provider runtime, or product-layer behavior.

### 3.5 adapter-real-integration-ready

Adapter-real-integration-ready is release-gate vocabulary for the same milestone as adapter-ready-for-real-system-integration. Current docs use adapter-ready-for-real-system-integration under explicit gates as the classification label.

### 3.6 production-ready

A component would be production-ready only after production runtime behavior and operations have been implemented, tested, and documented.

Required evidence would include at least one production transport mode, production credential loading/resolution, durable backend, idempotency/replay/recovery, health/readiness endpoint or diagnostic surface, operator documentation, security documentation, known limitations, release notes, appropriate real smoke passes, and security/no-leak gates.

The current adapter-readiness track must not claim production readiness unless a later prompt explicitly reassigns that target and supplies the required evidence.

## 4. Real integration attempt status rules

Real-system integration attempts require all relevant gates to be explicit and operator-controlled:

- operator acknowledgement present;
- network gate open;
- provider port injected and available;
- runtime credential status configured-redacted or otherwise safely represented;
- safe operation class;
- safe correlation, target, and callback refs;
- supplied redacted attempt evidence before pass is claimed.

Ready-to-attempt is not pass. It means the adapter has enough explicit gate information to attempt a narrow operation, not that provider acknowledgement or business success happened.

Provider acknowledgement is not business success. A passed real integration attempt requires both provider acknowledgement and business success in supplied redacted evidence for the exact narrow edge.

External provider success is not equivalent to business success unless explicit business-success evidence is supplied.

## 5. Real smoke status rules

Real smoke is not a default check and must never require secrets or network during npm run check.

Valid release-facing smoke status vocabulary includes skipped, blocked-missing-profile, blocked-missing-secret, blocked-missing-port, blocked-network-gate-closed, ready-to-run, passed, and failed-safe.

Only passed can be counted as a provider-edge pass, and only for the narrow edge that was executed. Skipped, blocked, and ready-to-run are not passes. A passed smoke requires supplied redacted execution evidence with provider acknowledgement and business success for the narrow executed edge.

Smoke output must not expose resolved tokens, credentials, endpoints, raw provider payloads, raw callback payloads, provider clients, SDK handles, stack traces, raw logs, raw diffs, command output, filesystem paths, runtime-only values, provider handles, or client handles.

## 6. Default check discipline

Default repository checks must remain deterministic, no-network, and secret-free.

Default checks may include static, unit, acceptance, fake E2E, and no-leak tests. They must not require real Telegram/OpenClaw credentials, call real providers, read deployment secrets from library package roots, construct production provider clients by default, or start listener, webhook, polling, daemon, sidecar, or production store processes.

Gated real smoke may be run separately and reported separately. A blocked, skipped, or ready-to-run real smoke is safe posture but not a pass.

W19F2 is in the default static/check path through the root script pattern tests/static/*.test.mjs when npm run test:static is executed. This guards source and script invariants statically; it does not execute a real provider or validate a real system.

## 7. Boundary rules that remain active

The following remain mandatory for all future adapter work:

- no default provider network calls;
- no default provider/client construction;
- no default secret loading;
- runtime credential values remain runtime-only;
- public projections remain redacted/json-safe;
- package roots remain side-effect-free unless a future prompt explicitly owns a production runtime entrypoint;
- real integration attempt pass requires provider acknowledgement plus business success;
- provider acknowledgement alone does not imply business success;
- ready-to-attempt is not pass;
- real smoke remains separate, opt-in, and secret-gated.

## 8. Parked overlays are not readiness evidence

OCA, Codex, LifeOS, sidecar, production durable backend, and domain/product overlays are parked downstream overlays.

The following are not evidence for adapter readiness:

- fake/inert OCA wrapper behavior;
- descriptor-only LifeOS/domain package surfaces;
- product-specific agent definitions;
- product-specific command catalogs;
- domain-specific policy expansion;
- sidecar or deployment plans without implemented and tested adapter evidence.

These overlays may be documented as parked. They must not be used to satisfy plugin runtime composition, Telegram transport E2E, adapter-wide readiness aggregation, durable adapter-state, no-leak, real-smoke, or production gates.

## 9. Negative readiness claims

The adapter cannot be classified as ready for real-system integration if any of the following are true:

- fake E2E is missing for inbound, outbound, or callback paths;
- durable state fakes are missing for adapter-owned lifecycle contracts;
- package-root import can call network, read secrets, construct clients, start listeners, or connect stores;
- public outputs can include raw provider payloads, raw callback payloads, raw paths, raw logs, raw diffs, tokens, credentials, stack traces, endpoints, chat IDs, thread IDs, provider clients, SDK handles, runtime-only values, provider handles, or client handles;
- runtime credential values are exported as public values;
- secret-gated smoke reports skipped, blocked, or ready-to-run as passed;
- real integration attempt docs imply that ready-to-attempt is pass;
- real integration attempt docs imply provider acknowledgement alone means business success;
- docs claim production listener, webhook, polling, sidecar, deployment runtime, durable backend, OCA execution, or LifeOS behavior that current source and tests do not prove;
- OCA or LifeOS/domain overlays are used as adapter readiness proof;
- W19F2 is represented as runtime validation or real-system validation instead of a static public-surface regression guard.

## 10. Release classifier rule

Allowed current release closure vocabulary:

- not-ready;
- contract-ready;
- fake-e2e-ready;
- secret-gated-ready;
- adapter-ready-for-real-system-integration.

The current classification is adapter-ready-for-real-system-integration under explicit gates and not production-ready.

Adapter-real-integration-ready is release-gate vocabulary, not a separate production claim. Skipped, blocked, and ready-to-run real smoke remain not passed.
