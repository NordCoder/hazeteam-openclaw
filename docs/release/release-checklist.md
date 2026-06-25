# Release Checklist

## Release scope

This checklist covers CD11.2 OpenClaw/Telegram adapter readiness classification for release-facing documentation. It is a release classifier, not a production runtime certification and not a final adapter-ready declaration.

The current repository must remain classified below `adapter-ready-for-real-system-integration` until the required fake E2E, readiness aggregation, durable-state, no-leak, and opt-in real-smoke evidence exists and is consolidated by the assigned release-closure work.

## Current claim guardrails

Do not claim any of the following for the current repository unless a later release-closure slice proves the full evidence set:

- `adapter-ready-for-real-system-integration`;
- `adapter-real-integration-ready`;
- `production-ready`.

Existing fake/inert OCA wrapper surfaces, descriptor-only LifeOS/domain surfaces, and other parked overlays are not adapter-readiness evidence. They may remain documented as parked downstream overlays, but they do not advance the OpenClaw/Telegram adapter readiness gate.

## CD11.2 readiness ladder

Use this vocabulary consistently in release notes, checklists, and limitations.

| Level | Meaning | Required evidence | Not enough |
|---|---|---|---|
| `contract-ready` | Public contracts and no-leak boundaries exist, with no real provider behavior required. | Stable DTOs, refs, envelopes, package-root exports where scoped, static boundary checks, unit tests for local normalization and invalid input, docs that state non-goals. | A contract-only surface does not prove full adapter flow, provider interaction, durable lifecycle, or real-system integration readiness. |
| `fake-e2e-ready` | Deterministic adapter paths run through public package roots with injected fakes only. | Package-root no-side-effect evidence, fake inbound E2E, fake outbound E2E, fake callback permission E2E, durable idempotency/replay fake E2E, readiness aggregation fake E2E, and a no-leak matrix over public outputs. | Leaf-module tests, package-root exports without E2E, or fake tests that bypass public entrypoints are not enough. |
| `secret-gated-ready` | A narrow real edge can be attempted only through explicit opt-in gates while defaults remain safe. | Explicit smoke gate, injected credential/runtime-value resolution, redacted smoke output, precise skipped/blocked/failed/passed statuses, no default network, no default secrets, no-leak smoke assertions. | A skipped or blocked smoke report is not a provider pass. A passed smoke proves only the stated narrow edge. |
| `adapter-ready-for-real-system-integration` | The adapter can be integrated into a real host/system under explicit gates, without claiming production deployment support. | Fake E2E gates pass, runtime profile/readiness classification is public and tested, credential resolver and provider-client port boundaries exist, secret-gated smoke is precise and redacted, default CI remains no-network and secret-free, release docs state proven behavior and remaining limitations. | This does not imply a production daemon, webhook server, polling loop, deployment runtime, durable backend, sidecar, or product behavior. |
| `adapter-real-integration-ready` | Release-gate vocabulary for the same milestone as `adapter-ready-for-real-system-integration`. | Same evidence as `adapter-ready-for-real-system-integration`, plus final evidence consolidation by the assigned release-report slice. | Earlier Wave 1-Wave 3 workers must not use this as a final release claim. |
| `production-ready` | Production runtime and operations are implemented, tested, documented, and deployable. | Production transport mode, production credential loading/resolution, durable backend, idempotency/replay/recovery, health/readiness endpoint or diagnostic surface, deployment/operator docs, security gates, and appropriate real smoke success. | Adapter-real-integration readiness is not production readiness. |

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

A future release may use `adapter-real-integration-ready` or `adapter-ready-for-real-system-integration` only when evidence exists for all categories below:

1. Package-root no-side-effect matrix for every public package entrypoint involved in adapter readiness.
2. Fake E2E matrix through public package roots, including inbound, outbound, callback, durable replay/idempotency, readiness aggregation, and error paths.
3. Unified readiness aggregation covering plugin runtime shell, adapter composition, Telegram transport, credentials posture, core facade, durable stores, smoke state, and production-claim status.
4. Durable state fakes for topic bindings, callback tokens, delivery attempts, inbound idempotency, replay, correlation, and readiness snapshots.
5. No-leak matrix covering public outputs, readiness summaries, smoke reports, rendered delivery descriptors, callback results, errors, examples, and docs snippets.
6. Runtime value boundary evidence distinguishing secret handles, credential refs, resolved runtime-only values, and public redacted descriptors.
7. Opt-in redacted real smoke evidence with precise status reporting and no default CI network or secret requirement.
8. Release docs and known limitations that state what is proven, what remains fake-only, what is secret-gated, and what is still future production work.

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

## Security and no-leak release gate

Release output, logs, errors, docs examples, smoke summaries, readiness summaries, and public descriptors must not expose raw provider payloads, raw callback payloads, runtime objects, stack traces, bot tokens, API keys, credentials, passwords, connection strings, endpoints, filesystem paths, storage paths, provider clients, SDK handles, raw logs, raw diffs, or raw command output.

Use safe refs, bounded descriptors, redacted messages, public readiness summaries, and explicit failure categories. Do not serialize raw external payloads, resolved runtime values, or internal provider/runtime objects as public adapter output.

## Parked overlay gate

OCA, Codex, LifeOS, and domain/product overlays stay parked until the adapter-ready gate is actually met. Parked overlay code is not readiness evidence for:

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

## Post-release posture

Until final release closure proves otherwise, the repository is a safe adapter foundation below `adapter-ready-for-real-system-integration` and below `production-ready`.
