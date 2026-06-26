# Release Checklist

## Release scope

This checklist covers CD11.2 OpenClaw/Telegram adapter readiness classification for release-facing documentation. It is a release classifier surface, not a production runtime certification.

After W19G Wave 5 documentation closure, the current release classification remains adapter-ready-for-real-system-integration under explicit gates. The W18 classifier and final decision live in docs/release/w18e3-final-adapter-readiness-report.md. Wave 5 public-surface closure is summarized in docs/release/w19g-wave5-documentation-closure-report.md when present.

The repository is not production-ready. Adapter-real-integration-ready is release-gate vocabulary, not a separate production claim.

## Current claim guardrails

Release-facing docs may reference the adapter-ready-for-real-system-integration classification only with its explicit gates and limitations. They must continue to avoid any claim of:

- production deployment readiness;
- production runtime readiness;
- production provider runtime readiness;
- production credential loading readiness;
- production durable backend readiness;
- sidecar readiness;
- OCA runtime readiness;
- LifeOS/domain product readiness.

Existing fake/inert OCA wrapper surfaces, descriptor-only LifeOS/domain surfaces, and other parked overlays are not adapter-readiness evidence. They may remain documented as parked downstream overlays, but they do not advance production readiness.

Skipped, blocked, or ready-to-run real smoke is not a successful real-provider pass. Ready-to-attempt is not pass. Provider acknowledgement alone is not business success.

## CD11.2 readiness ladder

Use this vocabulary consistently in release notes, checklists, and limitations.

| Level | Meaning | Required evidence | Not enough |
|---|---|---|---|
| contract-ready | Public contracts and no-leak boundaries exist, with no real provider behavior required. | Stable DTOs, refs, envelopes, package-root exports where scoped, static boundary checks, unit tests for local normalization and invalid input, docs that state non-goals. | A contract-only surface does not prove full adapter flow, provider interaction, durable lifecycle, or real-system integration readiness. |
| fake-e2e-ready | Deterministic adapter paths run through public package roots with injected fakes only. | Package-root no-side-effect evidence, fake inbound E2E, fake outbound E2E, fake callback permission E2E, durable idempotency/replay fake E2E, readiness aggregation fake E2E, and a no-leak matrix over public outputs. | Fake/inert evidence is not a real-provider pass. |
| secret-gated-ready | A narrow real edge can be attempted only through explicit opt-in gates while defaults remain safe. | Explicit smoke gate, injected credential/runtime-value resolution, redacted smoke output, precise skipped/blocked/failed/passed statuses, no default network, no default secrets, no-leak smoke assertions. | A skipped, blocked, ready-to-run, or ready-to-attempt report is not a provider pass. A passed smoke proves only the stated narrow edge and requires supplied redacted attempt evidence with provider acknowledgement and business success. |
| adapter-ready-for-real-system-integration | The adapter can be integrated into a real host/system under explicit gates, without claiming production deployment support. | Fake E2E gates, runtime profile/readiness classification, credential resolver and provider-client port boundaries, real integration attempt contract, runtime credential binding public surface, secret-gated smoke classification, no-network/no-secret default CI, release docs, and W18E3/W19G documentation closure. | This does not imply a production daemon, webhook server, polling loop, deployment runtime, durable backend, sidecar, OCA execution, LifeOS behavior, product behavior, default provider/client construction, default provider network, or default secret loading. |
| production-ready | Production runtime and operations are implemented, tested, documented, and deployable. | Production transport mode, production credential loading/resolution, durable backend, idempotency/replay/recovery, health/readiness endpoint or diagnostic surface, deployment/operator docs, security gates, and appropriate real smoke success. | Adapter-ready-for-real-system-integration is not production readiness. |

## Merged evidence reflected for final classification

| Evidence area | Merged evidence | Release interpretation |
|---|---|---|
| Fake/inert acceptance E2E | W17H1 inbound fake E2E, W17H2 outbound fake E2E, W17H3 callback permission fake E2E, W17H4 durable replay fake E2E. | Deterministic fake/inert evidence only; not a real-provider pass. |
| No-leak matrix | W17H5 no-leak matrix. | Public output safety evidence; not provider execution. |
| Package-root no-side-effect matrix | W17H6 package-root no-side-effect matrix. | Default package-root inertness evidence; not production runtime. |
| Runtime value boundary | W18A runtime value boundary. | Secret handles, credential refs, resolved runtime-only values, public redacted descriptors, and no public secret values are documented. No production credential loader is implied. |
| Provider client port boundary | W18B provider client port boundary. | Provider ports are injected, safe roots do not construct default provider SDK/clients, and provider acknowledgement remains separate from business success. |
| Secret-gated smoke refinement | W18C secret-gated real smoke refinement. | Opt-in only, no default CI network, no default secrets, status-precise and redacted. Skipped/blocked/ready-to-run are not passes. |
| Listener/webhook/polling boundary | W18D listener/webhook/polling interface boundary. | Interface/descriptors only; no daemon, server, listener startup, webhook server, polling loop, or production runtime. |
| Runtime-edge docs | W18F1 runtime edge docs. | Runtime-edge vocabulary and limitations are documented without production classification. |
| Release gate static/CI closure | W18E1 release-gate static/CI closure. | Default test/check path remains no-network and secret-free; real smoke remains opt-in; release docs are guarded against premature production-ready and adapter-ready claims. |
| Release docs closure | W18E2 release docs closure. | Release-facing docs reflect merged evidence and limitations without production overclaims. |
| Final adapter readiness report | W18E3 final adapter readiness report. | Final evidence consolidation and adapter-ready-for-real-system-integration classifier under explicit gates. |
| Real integration attempt contract | W19A real integration attempt contract. | Public contract for explicit-gate real-system attempts; ready-to-attempt is not pass; provider acknowledgement alone is not business success. |
| Runtime credential binding port | W19B runtime credential binding port. | Injected runtime credential binding boundary; runtime credential values remain runtime-only and public projections are redacted/json-safe. |
| Opt-in real smoke harness runner | W19C smoke harness runner test. | Gated harness evidence through fakes; not default real provider execution. |
| Telegram integration harness public export and metadata fan-in | W19D public export and W19D3 metadata fan-in. | Telegram package root exposes the integration-harness public surface with non-production metadata and inert defaults. |
| Runtime credential binding public export | W19E runtime-values public export. | runtime-values barrel exposes W19B binding functions while preserving W18A exports and no default secret loading. |
| Wave 5 public-surface regression guard | W19F2 static guard. | Static guard for public-surface invariants and script separation; not runtime validation and not real-system validation. |

## Required local checks

Before a release candidate is merged or tagged, run the default repository checks when command execution is available:

~~~sh
npm run test:static
npm run test
npm run check
~~~

The default npm run check path must remain no-network and secret-free. It must not require real Telegram/OpenClaw credentials, real provider network access, deployment secrets, or production infrastructure.

Separate gated checks such as W12 public-core integration and real smoke may provide extra evidence only when they are explicitly run and reported. They are not default-check substitutes, and their absence cannot be silently converted into a pass.

## Wave 5 checks to preserve

Before any release-facing Wave 5 claim is made, verify the following:

1. W19A real integration attempt contract is documented as an explicit-gate-only public contract, not production runtime.
2. W19D/W19D3 Telegram integration harness public surface and metadata are documented with productionReady false, defaultNetworkBehavior none, runtimeClientConstructedByDefault false, listenerWebhookPollingRuntime false, effects none, and realSmokeDefault skipped-or-blocked.
3. W19E runtime credential binding public surface is documented as an injected runtime-values export only, not default credential loading.
4. W19F2 static public-surface regression guard is documented as static only, not runtime validation.
5. W19F2 remains in the default static/check path when root scripts still run tests/static/*.test.mjs through npm run test:static, npm run test, and npm run check.
6. npm run check remains no-network and no-secret.
7. test:real-smoke remains explicit, separate, opt-in, and secret-gated.
8. Real-system integration requires explicit operator acknowledgement, required runtime/provider gates, injected provider/runtime ports, safe operation class, safe refs, and supplied redacted attempt evidence.
9. A real integration pass requires provider acknowledgement plus business success for the exact narrow edge.
10. Production readiness is still not claimed.

## Adapter-ready-for-real-system-integration evidence gate

The release gate is supported by the following evidence categories:

1. Package-root no-side-effect matrix for every public package entrypoint involved in adapter readiness.
2. Fake E2E matrix through public package roots, including inbound, outbound, callback, durable replay/idempotency, readiness aggregation, and error paths.
3. Unified readiness aggregation covering plugin runtime shell, adapter composition, Telegram transport, credentials posture, core facade, durable stores, smoke state, and production-claim status.
4. Durable state fakes for topic bindings, callback tokens, delivery attempts, inbound idempotency, replay, correlation, and readiness snapshots.
5. No-leak matrix covering public outputs, readiness summaries, smoke reports, rendered delivery descriptors, callback results, errors, examples, and docs snippets.
6. Runtime value boundary evidence distinguishing secret handles, credential refs, resolved runtime-only values, and public redacted descriptors.
7. Runtime credential binding evidence proving credential binding requires injected ports and public projections omit runtime-only values.
8. Provider client port evidence proving provider execution is injected and provider acknowledgement remains separate from business success.
9. Real integration attempt contract evidence proving ready-to-attempt is not pass and provider acknowledgement plus business success are both required for pass.
10. Listener/webhook/polling boundary evidence documenting interfaces/descriptors without claiming production runtime.
11. Opt-in redacted real smoke evidence with precise status reporting and no default CI network or secret requirement.
12. Release docs and known limitations that state what is proven, what remains fake-only, what is secret-gated, and what is still future production work.
13. W18E3 final evidence table and W19G Wave 5 documentation closure.

## Real smoke classification

Real smoke is never part of the default safe check path. It must be opt-in, secret-gated, redacted, and status-precise.

Allowed real-smoke statuses include skipped, blocked-missing-profile, blocked-missing-secret, blocked-missing-port, blocked-network-gate-closed, ready-to-run, passed, and failed-safe.

Only passed may count as a provider-edge pass, and only for the exact edge described by the smoke. Skipped, blocked, and ready-to-run are safe outcomes but not provider passes and not adapter-ready evidence by themselves.

A passed smoke requires supplied redacted execution evidence with provider acknowledgement and business success for the narrow executed edge. External provider success is not equivalent to business success unless explicit business-success evidence is supplied.

## Security and no-leak release gate

Release output, errors, docs examples, smoke summaries, readiness summaries, and public descriptors must not expose raw provider payloads, raw callback payloads, runtime objects, stack traces, bot tokens, API keys, credentials, passwords, connection strings, endpoints, filesystem paths, storage paths, provider clients, SDK handles, provider handles, client handles, raw logs, raw diffs, raw command output, or runtime-only values.

Use safe refs, bounded descriptors, redacted messages, public readiness summaries, and explicit failure categories. Do not serialize raw external payloads, resolved runtime values, or internal provider/runtime objects as public adapter output.

## Parked overlay gate

OCA, Codex, LifeOS, sidecar, production durable backend, deployment runtime, and domain/product overlays stay parked as current implementation. After the adapter-ready gate, future work on these overlays may start only through explicit future prompts and ownership.

Parked overlay code is not readiness evidence for plugin runtime composition, Telegram/OpenClaw transport fake E2E, adapter-wide readiness aggregation, durable adapter-state fakes, opt-in real smoke, or production readiness.

No release checklist item may use fake/inert OCA behavior or descriptor-only LifeOS/domain behavior as a substitute for OpenClaw/Telegram adapter evidence.

## Merge and release gate

A release candidate is eligible for merge only when all of the following are true:

1. The branch diff is clean and limited to the assigned slice or justified fan-in scope expansion.
2. CI and local checks are green, or connector-only workers explicitly report command execution as unavailable.
3. No product-layer concern leaks into hazeteam-core or generic adapter foundation surfaces.
4. No real network, SDK, credential-loading, process-supervision, sidecar, OCA runtime, LifeOS/domain, or production-provider behavior is added unless a separate approved implementation slice explicitly owns it.
5. Package manifests, CI, production source, tests, roadmap files, deployment docs, operations docs, docs index, README files, and package READMEs are changed only when explicitly allowed or justified.
6. Known limitations are preserved unless current source, tests, and release evidence prove the capability exists.
7. Any readiness claim is no stronger than the weakest missing evidence category.
8. W18E3 final classifier and W19G Wave 5 documentation closure are present before any post-Wave 5 adapter readiness claim is made.

## Post-release posture

After W19G Wave 5 documentation closure, the repository has an adapter-ready-for-real-system-integration classification under explicit gates. It remains below production readiness, and downstream overlays remain future scoped work rather than existing runtime support.
