# Adapter Design Checklist

Use this checklist before starting implementation of a new adapter, runtime bridge, durable store package, product package, or composite integration.

## 1. Package role

- [ ] The package role is explicit.
- [ ] The package is classified using [Extension and Plugin Taxonomy](../extension-taxonomy.md).
- [ ] The package README declares its responsibilities.
- [ ] The package README declares explicit non-goals.
- [ ] The package does not imply that provider/product behavior belongs in `hazeteam-core`.

Possible roles:

- [ ] transport adapter;
- [ ] runtime bridge;
- [ ] durable store package;
- [ ] product/domain package;
- [ ] presentation renderer;
- [ ] permission/policy adapter;
- [ ] observability plugin;
- [ ] lifecycle/migration plugin;
- [ ] testkit/simulator package;
- [ ] deployment package;
- [ ] composite integration.

## 2. Core boundary

- [ ] The design imports only public `hazeteam-core` root or subpath entrypoints.
- [ ] The design does not require `hazeteam-core/src/**` imports.
- [ ] The design does not require private `dist/**` implementation imports.
- [ ] Missing core symbols are listed as API gaps.
- [ ] Core-owned semantics are not reimplemented privately.
- [ ] Provider SDKs stay outside core.
- [ ] Product/domain vocabulary stays outside generic core source.

## 3. Public core surfaces used

List required public entrypoints:

- [ ] `hazeteam-core/host`.
- [ ] `hazeteam-core/presentation`.
- [ ] `hazeteam-core/foundation`.
- [ ] `hazeteam-core/adapters`.
- [ ] `hazeteam-core/diagnostics`.
- [ ] `hazeteam-core/lifecycle`.
- [ ] Other declared public subpath: `________________`.

List required public symbols:

```text
- 
```

API gaps to resolve before implementation:

```text
- 
```

## 4. External system boundary

- [ ] Raw external payload boundary is defined.
- [ ] Provider SDK/client ownership is defined.
- [ ] Credential/secrets ownership is defined.
- [ ] External callback endpoint ownership is defined.
- [ ] External delivery API ownership is defined.
- [ ] External actor/user/account mapping is defined.
- [ ] External permission source is defined.
- [ ] External readiness checks are adapter-owned.

## 5. Session/conversation binding

- [ ] External conversation coordinates are defined.
- [ ] Binding key is deterministic.
- [ ] Binding key is not based on display names.
- [ ] Binding value maps to workspaceRef.
- [ ] Binding value maps to agentRef where applicable.
- [ ] Binding value maps to hostSessionRef where applicable.
- [ ] Missing binding policy is defined.
- [ ] Disabled/archived binding behavior is defined.
- [ ] Multi-workspace collision behavior is defined.
- [ ] Production durability requirement is decided.

## 6. Inbound mapping

- [ ] Normalized event DTOs are adapter-owned.
- [ ] Raw provider payload does not enter core values.
- [ ] Actor mapping is safe.
- [ ] Attachment refs are safe.
- [ ] Idempotency keys are deterministic.
- [ ] Correlation ids are propagated.
- [ ] Binding resolution happens before dispatch.
- [ ] Malformed event failures are safe.
- [ ] Unauthorized event failures are safe.

## 7. Presentation delivery

- [ ] Delivery target is derived from trusted binding state.
- [ ] Outbox claim lifecycle is preserved.
- [ ] External renderer responsibility is defined.
- [ ] External delivery responsibility is defined.
- [ ] External message refs are safe.
- [ ] Delivery failures use safe errors.
- [ ] Retry ownership is defined.
- [ ] Stale claim policy is planned if production delivery crosses restarts.

## 8. Action tokens and callbacks

- [ ] External action payload is opaque/tokenized.
- [ ] Callback parser is adapter-owned.
- [ ] Permission check happens before token consume.
- [ ] Token verify uses expected context.
- [ ] Token consume happens exactly once before side-effecting intent submission.
- [ ] Replay behavior is defined.
- [ ] Expired token behavior is defined.
- [ ] Wrong workspace/agent/topic behavior is defined.
- [ ] Provider callback acknowledgement ownership is defined.

## 9. Runtime bridge

- [ ] Runtime bridge implements public port/facade expectations.
- [ ] Runtime SDK/client stays outside core.
- [ ] Runtime success is converted to safe result.
- [ ] Runtime failure is converted to safe result.
- [ ] Thrown errors are redacted.
- [ ] Runtime readiness is defined.
- [ ] Runtime scheduling/daemon ownership is outside core.

## 10. Approval flow

- [ ] Approval source/resolver ownership is defined.
- [ ] Approval card rendering is safe.
- [ ] Approve/reject buttons are tokenized.
- [ ] Approval permission is checked before consume.
- [ ] Approval replay behavior is safe.
- [ ] Wrong binding/workspace/agent behavior is safe.
- [ ] Raw approval/tool payloads do not leak.

## 11. Durable stores

- [ ] Required durable core contract stores are listed.
- [ ] Required adapter-owned stores are listed.
- [ ] Backend choice is documented.
- [ ] Schema versioning is planned.
- [ ] Migration policy is planned.
- [ ] Backup/restore policy is planned where needed.
- [ ] Atomic claim requirement is covered.
- [ ] Atomic token consume requirement is covered.
- [ ] Idempotency uniqueness is covered.
- [ ] Restart behavior is planned.

## 12. Readiness, health, observability

- [ ] Core port readiness is separated from adapter readiness.
- [ ] External infrastructure readiness is adapter-owned.
- [ ] Health/liveness/readiness distinction is defined.
- [ ] Safe status output is defined.
- [ ] Logs are redacted.
- [ ] Metrics labels are bounded and safe.
- [ ] Correlation id propagation is defined.
- [ ] Raw provider errors are redacted.

## 13. Security and redaction

- [ ] Secrets never enter core values.
- [ ] Raw provider payloads never enter core values.
- [ ] Stack traces are not public output.
- [ ] Storage roots and local paths are not public output.
- [ ] Callback payloads do not include raw action bodies.
- [ ] Token ids are treated as bearer-like handles.
- [ ] Multi-tenant/workspace isolation is defined.
- [ ] Attachment security policy is defined where relevant.

## 14. Testing plan

- [ ] Static boundary tests planned.
- [ ] Public API import tests planned.
- [ ] Contract/unit tests planned.
- [ ] Mapper tests planned.
- [ ] Delivery tests planned.
- [ ] Callback/token tests planned.
- [ ] Runtime bridge tests planned.
- [ ] Approval tests planned.
- [ ] Durable store tests planned.
- [ ] Fake end-to-end tests planned.
- [ ] Real smoke tests are environment-gated.
- [ ] Package-local tests will run in CI.
- [ ] Package source will compile in CI.

## 15. Implementation slicing

- [ ] First slice is contract/boundary-only if possible.
- [ ] Real provider wiring is deferred until fake semantics are green.
- [ ] Durable storage is separate from contract/mapping slices.
- [ ] Branches have clear allowed/forbidden files.
- [ ] Worker prompts include final report requirements.
- [ ] Merge order accounts for public barrel conflicts.

## Design sign-off

Design status:

```text
READY_TO_IMPLEMENT | NEEDS_CORE_API_GAP | NEEDS_ARCHITECTURE_REVIEW | OUT_OF_SCOPE
```

Notes:

```text
- 
```
