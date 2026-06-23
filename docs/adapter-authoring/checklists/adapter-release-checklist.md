# Adapter Release Checklist

Use this checklist before releasing an adapter, runtime bridge, durable store package, product package, or composite integration for production or controlled pilot use.

## 1. Release scope

- [ ] Release package(s) are named.
- [ ] Release version or commit is recorded.
- [ ] Compatible `hazeteam-core` version/commit range is recorded.
- [ ] Supported deployment modes are documented.
- [ ] Non-goals and unsupported flows are documented.
- [ ] Known limitations are documented.
- [ ] Rollback strategy is documented.

## 2. Architecture sign-off

- [ ] Package role is clear.
- [ ] Core/adapter/external ownership boundary is documented.
- [ ] Public core imports only.
- [ ] No private core imports.
- [ ] No provider SDK dependencies in `hazeteam-core`.
- [ ] No product/domain behavior leaked into generic core code.
- [ ] Public API gaps are resolved or explicitly deferred.

## 3. Build and CI

- [ ] Clean install works.
- [ ] TypeScript build passes.
- [ ] Unit tests pass.
- [ ] Static boundary tests pass.
- [ ] Fake integration tests pass.
- [ ] Root `check` command runs package-local tests.
- [ ] CI compiles all release package source.
- [ ] CI does not require production secrets for default checks.
- [ ] Release artifacts exclude build cache, local temp files, and secrets.

## 4. Public API and contracts

- [ ] Public package barrels are valid.
- [ ] Public exports are documented.
- [ ] Adapter contracts are public-safe.
- [ ] Safe error/result shapes are documented.
- [ ] Backward-incompatible changes are documented.
- [ ] Consumers have migration guidance where needed.

## 5. Session/binding release readiness

- [ ] Binding storage is production-suitable or explicitly non-production.
- [ ] Binding uniqueness is enforced.
- [ ] Missing binding behavior is safe.
- [ ] Disabled/archived binding behavior is safe.
- [ ] Rename/display metadata behavior is safe.
- [ ] Multi-workspace/tenant collisions are prevented.
- [ ] Binding serialization is public-safe.

## 6. Inbound flow readiness

- [ ] Raw payload boundary is documented.
- [ ] Normalized event contracts are stable.
- [ ] Actor mapping is safe.
- [ ] Attachment handling is safe.
- [ ] Idempotency behavior is defined.
- [ ] Duplicate inbound event behavior is tested.
- [ ] Malformed event behavior is tested.
- [ ] Unauthorized event behavior is tested.

## 7. Delivery readiness

- [ ] Delivery target derives from trusted binding state.
- [ ] Outbox claim semantics are preserved.
- [ ] Delivery success marks delivered.
- [ ] Delivery failure marks failed safely.
- [ ] Provider errors are redacted.
- [ ] Retry/backoff behavior is documented.
- [ ] Stale claim recovery is documented/tested.
- [ ] External message refs are safe.
- [ ] Tokenized buttons are used for actions.

## 8. Callback/token readiness

- [ ] Callback payload is opaque/tokenized.
- [ ] Permission check happens before token consume.
- [ ] Token verify includes expected context.
- [ ] Token consume is atomic enough for deployment mode.
- [ ] Replay does not dispatch twice.
- [ ] Expired token behavior is safe.
- [ ] Wrong workspace/agent/topic behavior is safe.
- [ ] Unauthorized actor does not burn token by default.
- [ ] Callback acknowledgement behavior is adapter-owned and documented.

## 9. Runtime bridge readiness

- [ ] Runtime bridge is behind public ports.
- [ ] Runtime success/failure is safe.
- [ ] Thrown runtime errors are redacted.
- [ ] Runtime readiness is reported safely.
- [ ] Runtime scheduling/daemon ownership is outside core.
- [ ] Runtime dispatch tests cover success/failure/throw.
- [ ] No raw runtime payload leaks to public output.

## 10. Approval readiness

- [ ] Approval routing is documented.
- [ ] Approval cards render safe summaries.
- [ ] Approve/reject actions are tokenized.
- [ ] Approval permission is checked before consume.
- [ ] Approval replay is safe.
- [ ] Wrong binding/workspace/agent behavior is safe.
- [ ] Raw approval/tool payloads are redacted.

## 11. Durable storage readiness

- [ ] Required durable stores are implemented or explicitly deferred.
- [ ] Schema versioning exists.
- [ ] Migrations are documented.
- [ ] Backup/restore requirements are documented.
- [ ] Atomic outbox claim is tested.
- [ ] Atomic token consume is tested.
- [ ] Idempotency uniqueness is tested.
- [ ] Restart simulation passes.
- [ ] Backend unavailable behavior is safe.
- [ ] Store readiness checks exist.

## 12. Readiness and health

- [ ] Core port readiness is exposed or checked.
- [ ] Adapter component readiness is exposed or checked.
- [ ] External infrastructure readiness is exposed or checked.
- [ ] Readiness distinguishes ready/degraded/not configured/failed.
- [ ] Health/liveness/readiness semantics are documented.
- [ ] Status output is safe and redacted.
- [ ] Missing optional dependencies are represented safely.
- [ ] Startup gating policy is documented.

## 13. Security and redaction

- [ ] No secrets are committed.
- [ ] No bot tokens/API keys appear in public output.
- [ ] Raw provider payloads are not logged by default.
- [ ] Stack traces are not public output.
- [ ] Storage roots and local paths are not public output.
- [ ] Callback payloads do not contain raw actions.
- [ ] Token ids are not used as unbounded metric labels.
- [ ] Metrics/log labels are bounded and safe.
- [ ] Multi-tenant/workspace isolation is tested where relevant.

## 14. Observability

- [ ] Logs contain correlation ids.
- [ ] Logs use safe codes/messages.
- [ ] Metrics are low-cardinality and safe.
- [ ] Traces do not include secrets/raw payloads.
- [ ] Operator status surfaces are safe.
- [ ] Alert conditions are documented.
- [ ] Debug details use opaque detailsRef/rawDebugRef.

## 15. Real external smoke tests

- [ ] Real smoke tests are environment-gated.
- [ ] Real smoke tests do not run in default CI without secrets.
- [ ] Real message/event ingestion smoke passes if in scope.
- [ ] Real delivery smoke passes if in scope.
- [ ] Real callback smoke passes if in scope.
- [ ] Real runtime bridge smoke passes if in scope.
- [ ] Real approval smoke passes if in scope.
- [ ] Smoke test cleanup is documented.

## 16. Documentation

- [ ] README explains package purpose and scope.
- [ ] Setup/config docs exist.
- [ ] Secrets/configuration docs exist without secret values.
- [ ] Operational docs exist.
- [ ] Failure modes are documented.
- [ ] Migration docs exist if durable schema changed.
- [ ] Known limitations are documented.
- [ ] Adapter authoring docs are linked where relevant.

## 17. Release decision

Choose one:

```text
RELEASE_READY
RELEASE_READY_FOR_CONTROLLED_PILOT
DO_NOT_RELEASE
```

Release notes:

```text
- 
```

Blocking issues:

```text
- 
```
