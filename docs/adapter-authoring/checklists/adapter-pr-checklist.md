# Adapter PR Checklist

Use this checklist before marking an adapter or extension pull request as merge-ready.

## 1. Scope and branch hygiene

- [ ] Branch name matches the slice purpose.
- [ ] Base branch is correct.
- [ ] Target branch is correct.
- [ ] Diff contains only allowed files.
- [ ] No unrelated formatting churn.
- [ ] No generated build outputs committed.
- [ ] No `node_modules`, `dist`, temp files, patch artifacts, or local workspace paths committed.
- [ ] Scope did not expand into later phases.
- [ ] Worker report includes head SHA and checks.

## 2. Public core imports

- [ ] Production code imports only public `hazeteam-core` root or subpath entrypoints.
- [ ] No `hazeteam-core/src/**` imports.
- [ ] No private `hazeteam-core/dist/**` implementation imports.
- [ ] No relative imports into a checked-out core repository.
- [ ] No production imports from `hazeteam-core/tests/**`.
- [ ] Any missing public symbol is documented as an API gap.

## 3. Build and CI visibility

- [ ] Package TypeScript source is included in build.
- [ ] Package-local tests are included in root test/check script.
- [ ] Static boundary tests run in CI.
- [ ] `npm run build` or equivalent passes.
- [ ] `npm run test` or equivalent passes.
- [ ] `npm run check` or equivalent passes.
- [ ] CI actually sees files changed by this PR.
- [ ] Real external tests are not required in default CI unless explicitly configured.

## 4. Contract safety

- [ ] Public contracts are bounded and public-safe.
- [ ] No raw provider payload appears in public DTOs.
- [ ] No SDK object appears in public DTOs.
- [ ] No secret/credential field appears in public DTOs.
- [ ] No host filesystem path appears in public DTOs.
- [ ] Error contracts use safe code/message/detailsRef patterns.
- [ ] Public barrels are syntactically valid.
- [ ] Public exports preserve existing exported symbols unless intentionally changed.

## 5. Session/binding behavior

- [ ] Binding resolution happens before inbound dispatch.
- [ ] Binding resolution happens before callback token consume.
- [ ] Delivery target comes from trusted binding state.
- [ ] Display names are not canonical ids.
- [ ] Missing binding fails safely.
- [ ] Disabled/archived binding behavior is covered.
- [ ] Multi-workspace/tenant collisions are prevented.

## 6. Inbound mapper behavior

- [ ] Raw payload boundary is explicit.
- [ ] Normalized event DTO is adapter-owned.
- [ ] Actor mapping is safe.
- [ ] Attachment mapping uses refs/metadata only.
- [ ] Idempotency keys are deterministic where implemented.
- [ ] Correlation id is propagated.
- [ ] Malformed/unsupported input fails safely.
- [ ] No direct execution bypass is introduced.

## 7. Delivery behavior

- [ ] Outbox item is claimed before external delivery.
- [ ] Claim conflict is safe.
- [ ] Renderer does not embed raw action payloads.
- [ ] Buttons/actions are tokenized.
- [ ] Delivery success marks delivered.
- [ ] Delivery failure marks failed safely.
- [ ] Raw provider error is redacted.
- [ ] Retry/stale-claim behavior is documented or tested if in scope.

## 8. Callback/token behavior

- [ ] Callback payload is opaque.
- [ ] Permission check happens before token consume.
- [ ] Token verify uses expected context.
- [ ] Token consume happens before side-effecting intent submission.
- [ ] Replay does not dispatch twice.
- [ ] Expired/mismatched/malformed callbacks fail safely.
- [ ] Unauthorized actor does not burn token by default.
- [ ] Provider acknowledgement remains adapter-owned.

## 9. Runtime/workflow/approval behavior

- [ ] Runtime bridge is behind public ports.
- [ ] Runtime success/failure is safe.
- [ ] Thrown runtime errors are redacted.
- [ ] Runtime drain does not start hidden loop.
- [ ] Workflow state is accessed only through public surfaces.
- [ ] Approval actions are tokenized.
- [ ] Approval replay is safe.
- [ ] Raw approval/tool payloads are redacted.

## 10. Durable store behavior

- [ ] Durable store implementation preserves public contract semantics.
- [ ] Atomic claim behavior is tested if relevant.
- [ ] Atomic token consume behavior is tested if relevant.
- [ ] Idempotency uniqueness is tested if relevant.
- [ ] Restart behavior is documented/tested if production-scoped.
- [ ] Schema version/migration behavior is documented if durable backend is introduced.
- [ ] Backend errors are safe.
- [ ] Connection strings/paths are not public output.

## 11. Readiness/health/observability

- [ ] Core readiness and adapter readiness are separated.
- [ ] Missing required dependency is safe.
- [ ] Optional dependency degradation is safe.
- [ ] Health/readiness output has no secrets.
- [ ] Logs are redacted.
- [ ] Metrics labels are bounded and safe.
- [ ] Correlation ids are propagated.
- [ ] Raw provider errors are converted to safe codes/messages.

## 12. Security and redaction

- [ ] No secrets committed.
- [ ] No raw provider payloads logged by default.
- [ ] No stack traces in public output.
- [ ] No storage roots or absolute paths in public output.
- [ ] Callback replay matrix is covered if callbacks are in scope.
- [ ] Wrong workspace/agent/topic matrix is covered if callbacks/bindings are in scope.
- [ ] Multi-tenant isolation is preserved if relevant.

## 13. Tests required by slice type

### Contract slice

- [ ] Public barrel test.
- [ ] Contract shape tests.
- [ ] Static boundary tests.

### Mapper slice

- [ ] Success mapping test.
- [ ] Missing/disabled binding test.
- [ ] Raw payload no-leak test.
- [ ] Malformed input test.

### Delivery slice

- [ ] Claim success/conflict test.
- [ ] Delivered test.
- [ ] Failed safe-error test.
- [ ] Tokenized button test.

### Callback slice

- [ ] Valid callback test.
- [ ] Unauthorized no-consume test.
- [ ] Replay test.
- [ ] Expired/mismatch test.

### Runtime/approval slice

- [ ] Fake runtime success/failure/throw test.
- [ ] Approval approve/reject/replay test.
- [ ] Safe output no-leak test.

### Durable store slice

- [ ] Contract conformance test.
- [ ] Conflict/atomicity test.
- [ ] Restart test.
- [ ] Migration/readiness test if schema exists.

## 14. Documentation updates

- [ ] README or docs updated if public behavior changed.
- [ ] New public exports documented if relevant.
- [ ] Known limitations documented.
- [ ] Production/non-production status documented.
- [ ] Migration notes added if durable schema changed.

## 15. Merge decision

Choose one:

```text
MERGE_READY_AFTER_CI
DO_NOT_MERGE
```

Reasons:

```text
- 
```
