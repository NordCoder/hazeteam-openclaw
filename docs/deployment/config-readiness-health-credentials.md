# Config, readiness, health, and credential posture

## Purpose and scope

This document describes the operator-facing posture of the `hazeteam-openclaw` adapter foundation after W9A. It is release-hardening documentation for the current foundation, not a complete production deployment guide.

The current package is an external adapter foundation over stable `hazeteam-core`. It defines safe adapter contracts, pure adapter behavior shells, durable adapter-owned store shells, OpenClaw-facing bridge shells, and a secret-gated real-smoke harness. It does not yet define a production process manager, production environment loader, production credential store, production HTTP health endpoint, or real OpenClaw SDK/client wiring in production source.

Use this document to review configuration assumptions, readiness semantics, health evidence, and credential-handling rules before release review. Do not treat it as a substitute for deployment-specific runbooks, infrastructure provisioning, or future W10D documentation fan-in.

## Configuration model

The adapter foundation is configured structurally through injected boundaries, not through production source reading deployment secrets directly.

Current boundaries:

- Adapter-facing code uses injected ports, injected facades, safe DTOs, safe refs, and safe result/readiness summaries.
- The core host boundary expects an injected core facade and explicit required core-facing ports: agent control host, session binding store, presentation outbox store, and presentation action token store.
- Optional core-facing ports may be injected for runtime drain, workflow status, health, readiness, audit, and approval reader surfaces.
- Runtime and approval bridge shells normalize request/result/readiness data from injected OpenClaw-like ports and reject unsafe fields.
- Durable storage shells are adapter-owned and sit behind injected persistence/record boundaries; they do not make core transport-specific.
- Real OpenClaw SDK/client wiring is not implemented in production source at this phase.
- W9 real smoke coverage is intentionally gate-driven: it can be skipped, dry-run-ready, or blocked from real network execution by design.
- Production source must not load or read credentials directly during this phase. Secrets belong to deployment wiring and test harness gates only.

Configuration review should therefore focus on whether the intended boundaries are injected and whether their summaries are safe, not on whether a production `.env` loader or SDK constructor exists in this package.

## Readiness model

Readiness answers whether the adapter foundation can safely accept a class of work under the currently injected boundaries. The current code models readiness through safe summaries and through W9 smoke-harness gates. No production readiness endpoint is defined by this slice.

### Adapter readiness summary states

These states are represented by the adapter readiness contracts and bridge summaries:

- `ready`: required checks pass. For example, a required bridge port is injected and, when present, its readiness check reports a passing state.
- `degraded`: at least one check reports a warning while no check fails. This is represented by adapter readiness summarization of warning checks. The W9 real-smoke readiness helper does not currently emit this status.
- `not-ready`: at least one required readiness check fails. Examples include missing required core facade methods, missing required core host ports, a missing runtime dispatch port, or a missing approval submit/resolve port.

### W9 smoke-harness readiness states

These states are represented by the secret-gated real-smoke harness:

- `skipped`: the real-smoke opt-in gate is not enabled. No remote call is attempted.
- `not-ready`: the real-smoke opt-in gate is enabled, but one or more required test-only settings are absent or empty. No remote call is attempted.
- `dry-run-ready`: all required smoke settings are present, but the network gate is closed. The harness composes dry-run/fake-port behavior only. No remote call is attempted.
- `real-run-blocked-by-design`: all required smoke settings are present and the network gate is requested, but no real client is configured in production source. No remote call is attempted.

The W9 harness also exposes `willCallRemote: false` across its tested states. This is an intentional release-hardening safety property, not a production integration capability.

## Health model

Health answers what evidence exists that the current adapter package and its boundaries are in an expected operational state. At this phase, health is evidence-based and package-local.

Current health evidence:

- Static/package health is established by repository checks such as build, test, typecheck/check, and static boundary tests.
- Adapter boundary health is represented by safe readiness summaries for core host configuration, runtime bridge configuration, approval bridge configuration, durable store adapter shells, and other injected component boundaries.
- Smoke harness health is represented by the W9 gated tests, which assert that the real-smoke suite is inert when disabled, redacted, dry-run-only unless explicitly gated, and still blocked from real network calls by design.
- Safe-output health is represented by leak assertions that reject raw provider payload markers, raw runtime/tool/approval payload markers, stack markers, credential markers, filesystem-path markers, and storage-path markers in W9-produced output.

No production HTTP health endpoint is implemented by the current source unless a future slice adds one explicitly. Operators should not assume `/health`, `/ready`, `/live`, webhook diagnostics, or an OpenClaw status endpoint exists in this package at W10A.

## Credential handling

Credential handling is intentionally conservative.

Required rules:

- Do not put secrets in DTOs, readiness results, operation results, health summaries, logs, metrics labels, or docs examples.
- Do not include real token values, API keys, credentials, passwords, connection strings, raw provider payloads, SDK/client objects, stack traces, filesystem paths, storage paths, or deployment-private handles in safe outputs.
- Only check presence/non-empty status in smoke helpers. Presence checks must not serialize or echo the value.
- Use bounded safe refs, status codes, counts, and redacted messages for diagnostics.
- Prefer opaque `detailsRef`, `correlationRef`, or protected debug references over raw payload disclosure.
- Treat callback payloads, provider responses, runtime outputs, approval payloads, and external error messages as unsafe until normalized and redacted.

The current W9 smoke helper counts required settings and reports only counts and gate statuses. It must not print the token, channel identifier value, workspace value, agent value, provider payloads, filesystem paths, storage paths, or raw response data.

## Environment variables

The following names are W9 smoke-harness assumptions only. They are not a production adapter configuration implementation.

| Name | Test-only meaning | Safe reporting rule |
| --- | --- | --- |
| `OPENCLAW_REAL_SMOKE_ENABLED` | Opt-in gate for the W9 real-smoke harness. | Report only whether the gate is enabled or disabled. |
| `OPENCLAW_REAL_SMOKE_ALLOW_NETWORK` | Secondary network-request gate for the W9 real-smoke harness. | Report only whether the network gate is closed or requested. |
| `OPENCLAW_BOT_TOKEN` | Required W9 smoke setting presence check. | Report only present/missing counts; never print the value. |
| `OPENCLAW_CHANNEL_ID` | Required W9 smoke setting presence check. | Report only present/missing counts; never print the value. |
| `OPENCLAW_WORKSPACE_REF` | Required W9 smoke setting presence check. | Report only present/missing counts; never print the value. |
| `OPENCLAW_AGENT_REF` | Required W9 smoke setting presence check. | Report only present/missing counts; never print the value. |

Do not infer a production `.env` contract from these names. Future deployment wiring may choose different secret stores, process managers, runtime configuration mechanisms, or provider-client construction policies.

## Operator checklist

Before release review, validate the following posture:

- Build, tests, and check commands pass in CI or in an approved execution environment.
- The W9 secret-gated smoke suite remains inert by default and does not call remote systems.
- Enabling the smoke opt-in gate without all required test-only settings produces `not-ready`, not a partial real run.
- Providing all required smoke settings with the network gate closed produces `dry-run-ready`, not a real run.
- Requesting the network gate still produces `real-run-blocked-by-design` until a real client is explicitly implemented in a future slice.
- Readiness summaries contain only safe statuses, stable component names, safe messages, counts, and optional safe refs.
- No readiness, health, smoke, or operation output includes secret values, raw provider payloads, SDK/client objects, stack traces, filesystem paths, storage paths, or raw runtime/tool/approval payloads.
- Required injected ports/facades are present for the flow being certified, or missing boundaries are reported as `not-ready` through safe summaries.
- Documentation examples use placeholder names only and do not encode real deployment values.

## Non-goals and limitations

Current W10A limitations:

- No real SDK/network integration exists in production source.
- No production credential loader exists in production source.
- No production health endpoint exists in production source.
- No production readiness endpoint exists in production source.
- No deployment-specific process manager, scheduler, webhook listener, database migrator, backup runner, or replay runner is defined here.
- No W10D docs index fan-in has been performed yet.

Future slices may add production wiring, deployment runbooks, operations docs, release checklists, and docs index integration. Those slices must preserve the same safety invariant: production behavior may expand, but core remains transport-neutral and secrets/raw provider data must not cross into core-facing safe DTOs or public diagnostics.
