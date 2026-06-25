# Config, readiness, health, and credential posture

## Purpose and scope

This document describes the operator-facing posture of the `hazeteam-openclaw` adapter foundation after W14G transport fan-in. It is readiness documentation for the current foundation, not a complete production deployment guide.

The current package defines safe adapter contracts, fake-edge behavior, W12 public-core integration proof, W13 plugin runtime shell descriptors, and W14 safe transport ports over injected boundaries. It does not define a production process manager, production runtime-value loader, production HTTP health endpoint, or real OpenClaw/Telegram SDK wiring in production source.

## Configuration model

The adapter foundation is configured structurally through injected boundaries, not through production source reading sensitive runtime values directly.

Current W14 transport boundaries:

- transport config and redacted reference descriptors;
- safe channel-event normalization;
- injected delivery boundary;
- injected callback boundary;
- topic command routing by binding authority;
- opt-in real-smoke gate.

Default check and test paths require no real credentials and perform no real network calls.

## Readiness model

Readiness answers whether the current injected boundaries can safely accept a class of work. W14 package readiness is non-production-ready and no-effect by default.

The real-smoke gate can be skipped, blocked by profile, blocked by missing runtime values, blocked by missing injected port, ready-to-run, passed, or failed-safe. A skipped or blocked state is a safety state, not a successful real-provider pass.

`willCallRemote` remains false in W14 gate output. No provider SDK client is constructed by default.

## Health model

Current health evidence is package-local:

- static/package health from build, typecheck, unit, static, test, and check commands when they are run;
- safe-output health from no-leak public descriptors;
- W14 fan-in health from package-root export coverage;
- real-smoke health from explicit skipped or blocked gate states unless future work implements a real run.

No production HTTP health endpoint is implemented by W14G. Operators should not assume `/health`, `/ready`, `/live`, webhook diagnostics, or OpenClaw status endpoints exist in this package.

## Credential handling

Credential handling is intentionally conservative.

Required rules:

- Do not put sensitive values in DTOs, readiness results, operation results, health summaries, logs, metrics labels, or docs examples.
- Do not include real token values, API keys, passwords, connection strings, raw provider payloads, SDK/client objects, stack traces, filesystem paths, storage paths, or deployment-private handles in safe outputs.
- Use bounded safe refs, status codes, counts, and redacted messages for diagnostics.
- Treat callback payloads, provider responses, runtime outputs, approval payloads, and external error messages as unsafe until normalized and redacted.

## Operator checklist

Before release review, validate the following posture:

- Build, tests, and check commands pass in CI or in an approved execution environment.
- Default check and test paths remain no-network and require no real credentials.
- Real smoke remains opt-in and secret-gated.
- Missing real-smoke inputs produce skipped or blocked results, not a partial real run.
- Provider acknowledgement remains distinct from business success.
- Permission-before-token-consume is preserved.
- Topic routing uses `channelRef+chatRef+threadRef`, not topic title.
- No production listener, webhook, polling daemon, provider runtime, deployment runtime, OCA, domain package, or sidecar behavior appears accidentally.

Future slices may add production wiring, deployment runbooks, operations docs, and release checklists. Those slices must preserve the same safety invariant: production behavior may expand, but core remains transport-neutral and sensitive values or raw provider data must not cross into public diagnostics.
