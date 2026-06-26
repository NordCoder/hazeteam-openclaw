# Adapter Readiness

Adapter readiness is tracked as a release-facing evidence ladder. The ladder measures whether `hazeteam-openclaw` exposes stable, inert, public adapter contracts that a separate real system can integrate under explicit runtime/operator gates.

It does not measure full production readiness, durable backend readiness, sidecar readiness, OCA runtime readiness, LifeOS domain readiness, or real provider delivery success.

## Current status

After W18E3 and Wave 5 closure, the guarded classification is `adapter-ready-for-real-system-integration-under-explicit-gates`.

The current repository status is classified as adapter readiness for real-system integration under explicit gates.

The repository remains not production-ready. Wave 5 did not add default provider network calls, default provider/client construction, default secret loading, default runtime credential loading, default listener runtime, default webhook runtime, default polling runtime, durable production storage, sidecar runtime, OCA runtime execution, or LifeOS/domain product readiness.

The exact readiness boundary is:

- Public adapter, transport, runtime-value, smoke-gate, and integration-harness contracts can be imported and inspected safely.
- Real-system integration attempts are represented only by explicit-gate descriptors and opt-in harness evidence.
- Runtime/provider execution still requires injected ports, explicit operator acknowledgement, opened runtime/provider gates, safe runtime credential references, and redacted/safe evidence.
- Default `npm run check` and `npm test` paths remain no-network and no-secret.
- `test:real-smoke` remains a separate opt-in script and is not part of the default check/test path.

## Readiness ladder

| Level | Meaning | Current evidence |
| --- | --- | --- |
| L0 | Package skeleton exists. | Passed in earlier waves. |
| L1 | Public contracts and package topology exist without private core imports. | Passed in S01/S02 and W12–W14 static/unit checks. |
| L2 | Safe transport/config/delivery/callback/topic/router surfaces exist without provider SDK/runtime side effects. | Passed in W14 fan-in and static checks. |
| L3 | Runtime-edge boundaries are explicit and inert by default. | Passed through W18 runtime value, provider-client, listener/webhook/polling, and real-smoke gate refinements. |
| L4 | Real-system integration can be attempted under explicit gates without default network/secret behavior. | Current Wave 5 posture: achieved as adapter-ready-for-real-system-integration under explicit gates. |
| L5 | Production runtime, provider execution, durable backend, sidecar, OCA runtime, and LifeOS/domain readiness. | Not achieved; future work. |

## Wave 5 readiness evidence

Wave 5 closes the adapter-readiness evidence for real-system integration attempts under explicit gates. The evidence is public-surface and harness evidence only; it is not production runtime evidence.

| Slice | Evidence | Boundary |
| --- | --- | --- |
| W19A | `packages/openclaw-telegram-transport/src/integration-harness/real-integration-attempt-contract.ts` defines the real integration attempt contract. | `runtimeClaim: 'not-production-runtime'`, `readinessClaim: 'explicit-gate-only'`, `noDefaultNetwork: true`, and `noSecretLoading: true`. |
| W19B | `packages/openclaw-adapter/src/runtime-values/runtime-credential-binding-port.ts` defines the injected runtime credential binding port. | Runtime-only value stays behind the runtime boundary; public projection is redacted/json-safe. |
| W19C | `tests/smoke/w19c-opt-in-real-smoke-harness-runner.test.mjs` records opt-in smoke harness behavior. | Default skipped/inert, missing port blocked, ready-to-run not pass, provider acknowledgement alone not pass, pass requires provider acknowledgement plus business success. |
| W19D/W19D3 | `packages/openclaw-telegram-transport/src/index.ts` exposes the integration harness surface and metadata fan-in through the Telegram package root. | Package root remains inert, non-production, no default network, no default client construction, and no listener/webhook/polling runtime by default. |
| W19E | `packages/openclaw-adapter/src/runtime-values/index.ts` exports W18A runtime-value boundary plus W19B credential binding port. | Runtime credential binding is publicly reachable only as an explicit port/projection boundary; runtime-only values are not serialized. |
| W19F2 | `tests/static/w19f2-wave5-public-surface-regression-guard.test.mjs` guards Wave 5 public-surface invariants. | Static regression guard only; not runtime validation and not real-system validation. |

## Active boundary rules

1. **Explicit gates only.** Real-system integration attempts require explicit operator acknowledgement, an opened network/provider gate, an injected provider port, and safe runtime credential references.
2. **No default network.** Package roots and default check/test paths must not create provider clients, start listeners, open polling loops, call provider SDKs, or call network primitives.
3. **No default secrets.** Default package imports and default tests must not read provider secrets or runtime credential material.
4. **Runtime-only credentials.** Runtime credential values are represented by runtime-only wrappers and must not appear in public JSON.
5. **Redacted public projection.** Public credential binding projections may include safe refs, redacted descriptors, issue codes, and safe diagnostics only.
6. **Provider acknowledgement is not business success.** A provider acknowledgement alone does not make an integration attempt pass.
7. **Ready-to-attempt is not pass.** `ready-to-attempt` and `ready-to-run` statuses indicate preconditions, not successful integration.
8. **W19F2 is static-only.** W19F2 guards public-surface and script invariants; it does not validate live provider behavior.

## Real integration attempt semantics

The real integration attempt contract separates readiness, provider acknowledgement, and business outcome.

A successful real-system integration attempt requires all of the following:

- provider port available through injection,
- network/provider gate open,
- operator acknowledgement present,
- runtime credential status safe for the attempt,
- safe operation class,
- redacted/safe attempt evidence,
- provider acknowledgement supplied, and
- business success supplied.

The following are not passes:

- skipped/default state,
- blocked states,
- missing provider port,
- missing operator acknowledgement,
- closed network gate,
- missing or unsafe credential reference,
- unsafe operation class,
- ready-to-attempt without a supplied attempt result,
- provider acknowledgement without business success,
- unsafe or malformed supplied evidence.

## Runtime credential boundary

Runtime credential binding exists to connect safe public references to runtime-only values through an injected port. It does not load secrets by default.

Public documentation may mention only safe references, redacted descriptors, binding statuses, safe issue codes, safe diagnostics, and public projection json-safety.

Public documentation must not include unsafe runtime/provider material or raw operational artifacts.

## Default check/test posture

Root scripts preserve the safe default posture:

- `npm run check` runs build, typecheck, and default tests.
- `npm test` runs static, unit, and acceptance tests.
- `test:real-smoke` is a separate explicit script.
- Default check/test paths must remain no-network and no-secret.

W19F2 is in the default static/check path because `test:static` is part of `npm test`, and `npm test` is part of `npm run check`. This makes W19F2 a default static guard, not a default real-smoke execution path.

## Negative claims

The repository is not production-ready.

The repository is not deployment-ready.

The repository does not construct a real Telegram or OpenClaw provider client by default.

The repository does not start real webhook, polling, listener, sidecar, durable backend, OCA runtime, or LifeOS/domain runtime behavior by default.

The repository does not load real secrets or credentials by default.

The repository does not treat skipped, blocked, ready-to-attempt, or ready-to-run statuses as pass.

The repository does not treat external provider acknowledgement as business success unless explicit business-success evidence is supplied.

The repository does not export runtime credentials as public values.

The repository does not use parked OCA/LifeOS/domain overlays as adapter-readiness proof.

W19F2 does not validate live provider behavior, real-system behavior, production behavior, or runtime execution. It only guards static public-surface and script invariants.

## Parked overlays

OCA wrapper, LifeOS/domain, plugin-runtime, durable backend, and copied core readiness remain parked or below the adapter-readiness line unless separately promoted by future scoped work.

They are not used as proof for the current adapter readiness classification.

## Release checklist link

Release gating for this status is recorded in `docs/release/release-checklist.md`.

Known limitations for this status are recorded in `docs/release/known-limitations.md`.
