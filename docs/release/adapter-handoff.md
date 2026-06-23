# Adapter Handoff Package

## Purpose

This handoff is the adapter-author checklist for using `hazeteam-core` as a transport-neutral core package. It records the public surfaces an external adapter can rely on, the responsibilities that stay outside core, and the boundary checks that must remain true before release.

For full adapter authoring guidance, use [Adapter Authoring Guide](../adapter-authoring/README.md). For implementation planning and review, use [Adapter Implementation Roadmap](../adapter-authoring/adapter-implementation-roadmap.md), [Adapter Design Checklist](../adapter-authoring/checklists/adapter-design-checklist.md), [Adapter PR Checklist](../adapter-authoring/checklists/adapter-pr-checklist.md), and [Adapter Release Checklist](../adapter-authoring/checklists/adapter-release-checklist.md).

This package is not a runtime feature. It adds no delivery engine, listener, storage backend, cache backend, provider-specific SDK, or product workflow.

## What core provides

`hazeteam-core` provides deterministic, domain-neutral interaction contracts and safe adapter-facing operation results:

- `createCoreInteractionHost` as the composed interaction facade in `hazeteam-core/host`;
- host inbound action validation and host session binding contracts in `hazeteam-core/host`;
- presentation outbox item, delivery-claim, and store contracts in `hazeteam-core/presentation`;
- presentation action token issue, verify, consume, and store contracts in `hazeteam-core/presentation`;
- public result and error envelopes in `hazeteam-core/foundation`;
- generic adapter stub contracts in `hazeteam-core/adapters` for boundary tests;
- runtime drain, workflow status, and health/status facade operations when the required ports are injected;
- documentation for port-injection inventory/readiness and generic external adapter simulator reference flows.

The core package owns operation semantics, validation, redaction, state transitions, and public envelopes. It does not own deployment wiring.

## What the external adapter must provide

An external adapter must provide the non-core integration layer:

- mapping from external events into safe core refs and facade inputs;
- explicit `createCoreInteractionHost` dependencies for the flows it wants to enable;
- actual message delivery and callback reception outside core;
- durable implementations of stores, queues, or readers when production persistence is required;
- correlation between external delivery results and core delivery refs;
- logging and metrics sinks that accept only safe serialized core outputs;
- product or domain behavior outside this package.

The adapter must keep raw external payloads, secrets, credentials, deployment handles, and storage handles outside core values.

For a detailed ownership split across transport adapters, runtime bridges, durable stores, renderers, permission adapters, observability plugins, and deployment packages, see [Extension and Plugin Taxonomy](../adapter-authoring/extension-taxonomy.md).

## Required public entrypoints

Adapter implementations should use only the root package or package subpaths declared in `package.json`. The stable adapter handoff entrypoints are:

| Need | Public entrypoint | Required symbols |
| --- | --- | --- |
| Composed interaction facade | `hazeteam-core/host` | `createCoreInteractionHost`, `createCoreInteractionHostSkeleton`, `describeCoreInteractionHostContract`, `CoreInteractionHost`, `CoreInteractionHostProductionOptions`, `CORE_INTERACTION_CONTRACT_VERSION` |
| Host/session contracts | `hazeteam-core/host` | `AgentControlHost`, `HostInboundAction`, `HostSessionBindingStore`, `createInMemoryHostSessionBindingStore`, `serializeHostSessionBinding`, `validateHostInboundAction` |
| Presentation outbox contracts | `hazeteam-core/presentation` | `PresentationOutboxStore`, `PresentationOutboxItem`, `createInMemoryPresentationOutboxStore`, `serializePresentationOutboxItem`, `serializePresentationDeliveryResult` |
| Action token contracts | `hazeteam-core/presentation` | `PresentationActionTokenStore`, `IssuePresentationActionTokenInput`, `VerifyPresentationActionTokenInput`, `ConsumePresentationActionTokenInput`, `createInMemoryPresentationActionTokenStore`, `serializePresentationActionToken`, `serializePresentationActionTokenVerificationResult`, `serializePresentationActionTokenConsumeResult` |
| Public envelopes | `hazeteam-core/foundation` | `CoreApiEnvelope`, `successEnvelope`, `failureEnvelope`, `serializeCoreError`, `serializeResultEnvelope` |
| Adapter boundary reference | `hazeteam-core/adapters` | `CoreAdapterBoundary`, `submitAdapterIntent`, `consumePresentationOutboxItem`, `serializeAdapterDeliveryResultEnvelope` |
| Generic simulator reference | repository test fixture/docs | `createGenericExternalAdapterSimulator` and mapping helpers are acceptance references, not package API |
| Port readiness/inventory | `hazeteam-core/host` and `createCoreInteractionHost` | `describeCoreInteractionPortInventory`, `validateCoreInteractionPortInventory`, `summarizeCoreInteractionPortReadiness`, `CoreInteractionPortReadiness`, `CoreInteractionPortReadinessInput`, `CoreInteractionPortReadinessSummaryInput`, `CoreInteractionPortReadinessResult`, and related port descriptor/readiness types are public host exports; `getPortReadiness` is available through `createCoreInteractionHost` diagnostics |

If an adapter needs a symbol not reachable through these public entrypoints, treat that as an API gap. Do not import private implementation files as a workaround. See [Public API and Import Rules](../adapter-authoring/public-api-and-import-rules.md) for the full import policy and API-gap process.

## Safe serialization rules

External adapters must serialize public results before returning, logging, or delivering them outside the trusted runtime boundary.

- Prefer facade methods that already return `CoreApiEnvelope<T>`.
- For raw `Result<T>` values, call `serializeResultEnvelope(result, safeSerializer)`.
- Use `successEnvelope`, `failureEnvelope`, and `serializeCoreError` for custom adapter boundary responses.
- Use serializer functions from the owning module for outbox items, token results, delivery results, session bindings, and health/status values.
- Do not expose host filesystem details, storage roots, private runtime backing objects, stack traces, raw external payloads, secrets, credentials, or mutable store instances.
- Do not place raw document content or external delivery handles inside presentation payloads, token metadata, health output, or error data.
- Treat callback token ids as bearer-like public handles: pass only the token id through the external callback payload and validate it before creating a user intent.

For production redaction and observability rules, see [Security and Redaction Guide](../adapter-authoring/security-redaction-guide.md) and [Readiness, Health, and Observability Guide](../adapter-authoring/readiness-health-observability-guide.md).

## Callback token flow

The safe callback flow is:

```text
presentation action
-> issue action token through the facade or presentation token operation
-> include only token id plus adapter-owned safe callback context in external action payload
-> receive callback outside core
-> verify action token against workspace, outbox, approval, and action
-> consume action token once
-> reject missing, expired, mismatched, or already consumed tokens
-> map verified callback to UserIntent input
-> submit UserIntent through createCoreInteractionHost
```

Verification alone is not enough for side-effecting callback handling. The adapter must consume the token before treating the callback as accepted. For adapter-side permission-before-consume ordering and replay handling, see [Action Tokens and Callbacks Guide](../adapter-authoring/action-tokens-and-callbacks-guide.md).

## Delivery/outbox flow

The presentation delivery flow is:

```text
list pending presentation items
-> claim one item for delivery
-> map item payload to an external message outside core
-> deliver externally
-> mark delivered on success
-> mark failed on delivery failure
```

The presentation outbox owns `pending -> delivering -> sent/failed` lifecycle semantics. The adapter owns delivery attempts outside core and must not skip claim semantics or mutate outbox records outside the public store/facade operations.

For target derivation, rendering, tokenized buttons, retry ownership, stale claims, and delivery pump design, see [Presentation Outbox Delivery Guide](../adapter-authoring/presentation-outbox-delivery-guide.md).

## Session binding flow

The inbound session flow is:

```text
external channel and conversation refs
-> resolve existing host session binding or create a binding
-> validate HostInboundAction or UserIntent facade input
-> dispatch through AgentControlHost via createCoreInteractionHost
-> reuse binding for later messages and callbacks
```

Session binding is a mapping layer between external conversation identity and core host session identity. The adapter owns external identity lookup and must pass only bounded, pathless refs into core. For production binding design, see [Session Binding Guide](../adapter-authoring/session-binding-guide.md).

## Runtime, status, and health limitations

Runtime/status methods in the facade are adapter-facing diagnostics and control surfaces over injected dependencies.

- `drainRuntimeOnce` is a deterministic one-step operation, not a scheduler or daemon.
- Workflow status is a read surface over injected workflow status readers or stores.
- Health/status is safe diagnostic output over injected readers.
- Missing optional runtime/status/health dependencies should produce safe partial or failure envelopes, not hidden side effects.
- Core does not create hidden global queues, background workers, deployment timers, or process supervisors.

For runtime bridges, workflow status, approval routing, and external orchestrator guidance, see [Runtime, Workflow, and Approval Guide](../adapter-authoring/runtime-workflow-approval-guide.md).

## Port injection guidance

Production adapters should inject explicit implementations into `createCoreInteractionHost` rather than relying on hidden defaults. Required interaction ports are:

- `agentControlHost` for inbound dispatch;
- `presentationOutboxStore` for presentation delivery lifecycle;
- `presentationActionTokenStore` for callback token lifecycle;
- `sessionBindingStore` for external conversation binding.

Optional ports may provide runtime drain, workflow status, health/status, events, document read models, approval inspection, or state-file references. Durable implementations are adapter/deployment concerns behind public contracts. Core must not import real database drivers, cache clients, network clients, message broker clients, or external SDKs for these ports.

The S61A/S61B readiness inventory is the public adapter-facing audit reference for injected core interaction ports. `describeCoreInteractionPortInventory`, `validateCoreInteractionPortInventory`, and `summarizeCoreInteractionPortReadiness` are exported through `hazeteam-core/host`; `getPortReadiness` is exposed by `createCoreInteractionHost` for facade diagnostics over explicitly injected dependencies. Durable implementations remain outside core.

For production store implementation and restart semantics, see [Durable Stores Guide](../adapter-authoring/durable-stores-guide.md).

## Non-goals

This release handoff does not add or certify:

- real transport;
- provider-specific SDK;
- database implementation;
- cache implementation;
- production message queue implementation;
- external callback server;
- product/domain behavior;
- deployment scheduler or daemon;
- new runtime, session, presentation, token, approval, retry, or workflow semantics.

## Final checklist for adapter authors

Before implementing or releasing an external adapter:

1. Import only package root or declared public subpaths.
2. Create the core interaction facade with explicit required ports.
3. Keep external transport, callback receiving, durable stores, credentials, and product behavior outside core.
4. Use public envelopes for all adapter-facing results.
5. Serialize with safe serializers before logging or returning core data.
6. Claim outbox items before delivery and mark delivery outcome after the external attempt.
7. Issue action tokens for external actions and consume them exactly once on callback.
8. Resolve or create session bindings before dispatching inbound messages.
9. Treat runtime drain as one deterministic step and schedule it outside core.
10. Use the generic simulator fixture as an acceptance reference, not as production source.
11. Treat missing public exports as API gaps rather than importing private files.
12. Re-run static boundary checks before merging adapter-facing changes.
13. Use the [Adapter Design Checklist](../adapter-authoring/checklists/adapter-design-checklist.md), [Adapter PR Checklist](../adapter-authoring/checklists/adapter-pr-checklist.md), and [Adapter Release Checklist](../adapter-authoring/checklists/adapter-release-checklist.md) for implementation and release reviews.
