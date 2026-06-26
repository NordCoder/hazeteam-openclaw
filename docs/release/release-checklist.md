# Release Checklist

## Release scope

This checklist covers CD11.2 OpenClaw/Telegram adapter readiness classification for release-facing documentation. It is a release classifier surface, not a production runtime certification and not a final adapter-ready declaration.

W18E2 updates this checklist to reflect merged W17H, W18A, W18B, W18D, W18F1, W18C, and W18E1 evidence. W18E3 remains the final classifier and must consolidate evidence before any final adapter readiness claim.

## Current claim guardrails

Do not claim any of the following for the current repository before W18E3 final classification:

- `adapter-ready-for-real-system-integration`;
- `adapter-real-integration-ready`;
- `production-ready`.

Existing fake/inert OCA wrapper surfaces, descriptor-only LifeOS/domain surfaces, and other parked overlays are not adapter-readiness evidence. They may remain documented as parked downstream overlays, but they do not advance the OpenClaw/Telegram adapter readiness gate.

Skipped, blocked, or ready-to-run real smoke is not a successful real-provider pass.

## CD11.2 readiness ladder

Use this vocabulary consistently in release notes, checklists, and limitations.

| Level | Meaning | Required evidence | Not enough |
|---|---|---|---|
| `contract-ready` | Public contracts and no-leak boundaries exist, with no real provider behavior required. | Stable DTOs, refs, envelopes, package-root exports where scoped, static boundary checks, unit tests for local normalization and invalid input, docs that state non-goals. | A contract-only surface does not prove full adapter flow, provider interaction, durable lifecycle, or real-system integration readiness. |
| `fake-e2e-ready` | Deterministic adapter paths run through public package roots with injected fakes only. | Package-root no-side-effect evidence, fake inbound E2E, fake outbound E2E, fake callback permission E2E, durable idempotency/replay fake E2E, readiness aggregation fake E2E, and a no-leak matrix over public outputs. | Fake/inert evidence is not a real-provider pass. Leaf-module tests, package-root exports without E2E, or fake tests that bypass public entrypoints are not enough. |
| `secret-gated-ready` | A narrow real edge can be attempted only through explicit opt-in gates while defaults remain safe. | Explicit smoke gate, injected credential/runtime-value resolution, redacted smoke output, precise skipped/blocked/failed/passed statuses, no default network, no default secrets, no-leak smoke assertions. | A skipped, blocked, or ready-to-run smoke report is not a provider pass. A passed smoke proves only the stated narrow edge and requires supplied redacted attempt evidence with provider acknowledgement and business success. |
| `adapter-ready-for-real-system-integration` | The adapter can be integrated into a real host/system under explicit gates, without claiming production deployment support. | Fake E2E gates pass, runtime profile/readiness classification is public and tested, credential resolver and provider-client port boundaries exist, secret-gated smoke is precise and redacted, default CI remains no-network and secret-free, release docs state proven behavior and remaining limitations, and W18E3 provides final evidence classification. | This does not imply a production daemon, webhook server, polling loop, deployment runtime, durable backend, sidecar, OCA execution, LifeOS behavior, or product behavior. |
| `adapter-real-integration-ready` | Release-gate vocabulary for the same milestone as `adapter-ready-for-real-system-integration`. | Same evidence as `adapter-ready-for-real-system-integration`, plus final evidence consolidation by W18E3. | W18E2 and earlier workers must not use this as a final release claim. |
| `production-ready` | Production runtime and operations are implemented, tested, documented, and deployable. | Production transport mode, production credential loading/resolution, durable backend, idempotency/replay/recovery, health/readiness endpoint or diagnostic surface, deployment/operator docs, security gates, and appropriate real smoke success. | Adapter-real-integration readiness is not production readiness. |

## Merged evidence reflected for W18E3 review

| Evidence area | Merged evidence | Release interpretation |
|---|---|---|
| Fake/inert acceptance E2E | W17H1 inbound fake E2E, W17H2 outbound fake E2E, W17H3 callback permission fake E2E, W17H4 durable replay fake E2E. | Deterministic fake/inert evidence only; not a real-provider pass. |
| No-leak matrix | W17H5 no-leak matrix. | Public output safety evidence; not provider execution. |
| Package-root no-side-effect matrix | W17H6 package-root no-side-effect matrix. | Default package-root inertness evidence; not production runtime. |
| Runtime value boundary | W18A runtime value boundary. | Secret handles, credential refs, resolved runtime-only values, public redacted descriptors, and no public secret values are documented. No production credential loader is implied. |
| Provider client port boundary | W18B provider client port boundary. | Provider ports are injected, safe roots do not construct default provider SDK/clients, and provider acknowledgement remains separate from business success. |
| Listener/webhook/polling boundary | W18D listener/webhook/polling interface boundary. | Interface/descriptors only; no daemon, server, listener startup, webhook server, polling loop, or production runtime. |
| Runtime-edge docs | W18F1 runtime edge docs. | Runtime-edge vocabulary and limitations are documented without release classification. |
| Secret-gated smoke refinement | W18C secret-gated real smoke refinement. | Opt-in only, no default CI network, no default secrets, status-precise and redacted. Skipped/blocked/ready-to-run are not passes. Current smoke code still does not call a real provider by default. |
| Release gate static/CI closure | W18E1 release-gate static/CI closure. | Default test/check path remains no-network and secret-free; real smoke remains opt-in; release docs are guarded against premature production-ready and adapter-ready claims. |

## Required local checks

Before a release candidate is merged or tagged, run the default repository checks when command execution is available:

~~~sh
npm run test:static
npm run test
npm run check
~~~

The default `npm run check` path must remain no-network and secret-free. It must not require real Telegram/OpenClaw credentials, real provider network access, deployment secrets, or production infrastructure.

Separate gated checks such as W12 public-core integration and real smoke may provide extra evidence only when they are explicitly run and reported. They are not default-check substitutes, and their absence cannot be silently converted into a pass.

## Adapter-real-integration-ready evidence gate

A future W18E3 release report may use `adapter-real-integration-ready` or `adapter-ready-for-real-system-integration` only when evidence exists for all categories below and W18E3 consolidates them:

1. Package-root no-side-effect matrix for every public package entrypoint involved in adapter readiness.
2. Fake E2E matrix through public package roots, including inbound, outbound, callback, durable replay/idempotency, readiness aggregation, and error paths.
3. Unified readiness aggregation covering plugin runtime shell, adapter composition, Telegram transport, credentials posture, core facade, durable stores, smoke state, and production-claim status.
4. Durable state fakes for topic bindings, callback tokens, delivery attempts, inbound idempotency, replay, correlation, and readiness snapshots.
5. No-leak matrix covering public outputs, readiness summaries, smoke reports, rendered delivery descriptors, callback results, errors, examples, and docs snippets.
6. Runtime value boundary evidence distinguishing secret handles, credential refs, resolved runtime-only values, and public redacted descriptors.
7. Provider client port evidence proving provider execution is injected and provider acknowledgement remains separate from business success.
8. Listener/webhook/polling boundary evidence documenting interfaces/descriptors without claiming production runtime.
9. Opt-in redacted real smoke evidence with precise status reporting and no default CI network or secret requirement.
10. Release docs and known limitations that state what is proven, what remains fake-only, what is secret-gated, and what is still future production work.
11. W18E3 final evidence table, checks table, remaining limitations, and downstream unlock decision.

## Real smoke classification

Real smoke is never part of the default safe check path. It must be opt-in, secret-gated, redacted, and status-precise.

Allowed real-smoke statuses include:

- `skipped`;
- `blocked-missing-profile`;
- `blocked-missing-secret`;
- `blocked-missing-port`;
- `blocked-network-gate-closed`;
- `ready-to-run`;
- `passed`;
- `failed-safe`.

Only `passed` may count as a provider-edge pass, and only for the exact edge described by the smoke. `skipped`, `blocked-*`, and `ready-to-run` are safe outcomes but not provider passes and not adapter-ready evidence by themselves.

A passed smoke requires supplied redacted execution evidence with provider acknowledgement and business success for the narrow executed edge. Current W18C smoke code still does not call a real provider by default.

## Security and no-leak release gate

Release output, logs, errors, docs examples, smoke summaries, readiness summaries, and public descriptors must not expose raw provider payloads, raw callback payloads, runtime objects, stack traces, bot tokens, API keys, credentials, passwords, connection strings, endpoints, filesystem paths, storage paths, provider clients, SDK handles, raw logs, raw diffs, or raw command output.

Use safe refs, bounded descriptors, redacted messages, public readiness summaries, and explicit failure categories. Do not serialize raw external payloads, resolved runtime values, or internal provider/runtime objects as public adapter output.

## Parked overlay gate

OCA, Codex, LifeOS, and domain/product overlays stay parked until the adapter-ready gate is actually met and classified by W18E3.

Parked overlay code is not readiness evidence for:

- plugin runtime composition;
- Telegram/OpenClaw transport fake E2E;
- adapter-wide readiness aggregation;
- durable adapter-state fakes;
- opt-in real smoke;
- production readiness.

No release checklist item may use fake/inert OCA behavior or descriptor-only LifeOS/domain behavior as a substitute for OpenClaw/Telegram adapter evidence.

## Merge and release gate

A release candidate is eligible for merge only when all of the following are true:

1. The branch diff is clean and limited to the assigned slice or justified fan-in scope expansion.
2. CI and local checks are green, or connector-only workers explicitly report command execution as unavailable.
3. No product-layer concern leaks into `hazeteam-core` or generic adapter foundation surfaces.
4. No real network, SDK, credential-loading, process-supervision, sidecar, OCA runtime, LifeOS/domain, or production-provider behavior is added unless a separate approved implementation slice explicitly owns it.
5. Package manifests, CI, production source, tests, roadmap files, deployment docs, operations docs, docs index, README files, and package READMEs are changed only when explicitly allowed or justified.
6. Known limitations are preserved unless current source, tests, and release evidence prove the capability exists.
7. Any readiness claim is no stronger than the weakest missing evidence category.
8. W18E3 has supplied the final classifier before any final adapter readiness claim is made.

## Post-release posture

Until W18E3 final release closure proves otherwise, the repository is a safe adapter foundation below `adapter-ready-for-real-system-integration`, below `adapter-real-integration-ready`, and below `production-ready`.
