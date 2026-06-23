# Public API Map

This document maps the public `hazeteam-core` package entrypoints for downstream external adapter implementers. It is a contract map, not generated API documentation and not an exhaustive type reference.

Public API means the root package entrypoint and the package subpaths declared in `package.json`. Internal implementation files under `src/**` are not adapter-facing API, even when they are visible in the repository.

For the final adapter handoff checklist, see [Adapter Handoff Package](release/adapter-handoff.md). For full adapter package implementation guidance, see [Adapter Authoring Guide](adapter-authoring/README.md) and [Public API and Import Rules](adapter-authoring/public-api-and-import-rules.md).

## Import model

Use the root entrypoint when an integration wants explicit namespaces:

```ts
import { foundation, workspace, host, presentation } from "hazeteam-core";
```

Use subpath imports when an integration only needs one core surface:

```ts
import { createCoreInteractionHost } from "hazeteam-core/host";
import { parseUserIntent } from "hazeteam-core/presentation";
import { createDefaultPolicyEngine } from "hazeteam-core/policy";
```

Do not import from files such as `hazeteam-core/dist/host/agent-control-host.js` or repository-private `src/**` paths. Those files are implementation details and may change without adapter migration guarantees.

If an adapter needs a symbol that is not reachable through the root package or a declared public subpath, treat that as an API gap. Do not import private implementation files as a workaround.

## Entrypoint map

### `hazeteam-core` root package

- Responsibility: namespaced access to all public barrels.
- Typical external adapter usage: import a small set of namespaces when wiring a host process or integration test fixture.
- Non-goals: it is not a flattened all-symbol namespace and should not be used to bypass subpath ownership boundaries.
- Safety notes: prefer namespaced usage to avoid ambiguous symbol names across core modules.

### `hazeteam-core/foundation`

- Responsibility: shared core primitives: refs, result objects, core errors, public result/error envelopes, JSON types, canonical JSON, hashes, id validation, and redaction helpers.
- Typical external adapter usage: validate and construct safe refs and wrap public results through `successEnvelope`, `failureEnvelope`, `serializeCoreError`, or `serializeResultEnvelope`.
- Non-goals: no transport identity resolution, no credential handling, no external account lookup, no transport status-code mapping, and no persistence.
- Safety notes: keep ids pathless and bounded; use public envelopes before logging or returning core results; use safe serializers for success values instead of exposing internal objects.

### `hazeteam-core/workspace`

- Responsibility: workspace descriptors, runtime environment configuration, workspace registry, path resolver, and workspace execution context construction/serialization.
- Typical external adapter usage: select a workspace for an inbound external conversation and prepare execution context input.
- Non-goals: no deployment discovery, no remote storage provisioning, and no external channel binding store.
- Safety notes: storage roots are trusted runtime configuration. Serialized public outputs must not expose host absolute paths or storage roots.

### `hazeteam-core/identity`

- Responsibility: agent descriptors, agent registry snapshots, identity resolution, principal serialization, and agent/workspace relation validation.
- Typical external adapter usage: map an external actor or integration principal into core identity refs before dispatching a host action.
- Non-goals: no authentication protocol, no external account synchronization, and no product-specific user model.
- Safety notes: keep raw external identity payloads outside core; pass only validated refs and minimal safe metadata.

### `hazeteam-core/storage`

- Responsibility: document read models, document patch stores, unit of work helpers, and workspace state-file primitives including safe public state refs.
- Typical external adapter usage: provide trusted persistence wiring for host/composition flows and read safe public state refs from host-facing results.
- Non-goals: no production database adapter, no remote object-store implementation, and no external delivery persistence.
- Safety notes: internal state-file refs may have host filesystem details; adapter-facing outputs should use public refs.

### `hazeteam-core/events`

- Responsibility: event taxonomy, event envelope validation/serialization, in-memory event store, and query result serialization.
- Typical external adapter usage: append or inspect core audit events in tests and diagnostics surfaces.
- Non-goals: no external event bus, no streaming transport, and no product analytics pipeline.
- Safety notes: events must remain workspace-scoped, redacted, and free of raw external payloads or secrets.

### `hazeteam-core/policy`

- Responsibility: tool grants, action classification, capability evaluation, and default policy decisions.
- Typical external adapter usage: evaluate whether a parsed intent or planned action may proceed, requires approval, or must be denied.
- Non-goals: no external permissions backend, no organization policy service, and no product-specific rule registry.
- Safety notes: unknown or dangerous actions should remain deny-by-default unless a trusted policy layer explicitly grants capability.

### `hazeteam-core/approval`

- Responsibility: approval request state, approval type refs, approval decisions, approval transitions, and approval serialization.
- Typical external adapter usage: render approval requests through presentation outbox items and submit validated approval decisions back as user intents.
- Non-goals: no external UI, no external callback endpoint, and no post-decision delivery implementation.
- Safety notes: approval refs and approval type refs are safe core ids; callbacks should be token-gated before becoming `UserIntent` values. See [Runtime, Workflow, and Approval Guide](adapter-authoring/runtime-workflow-approval-guide.md).

### `hazeteam-core/presentation`

- Responsibility: presentation outbox item model, control-surface rendering, action-token state, and user intent parsing/validation/serialization.
- Typical external adapter usage: consume `PresentationOutboxItem` objects, map them to external messages, issue action tokens, and map external callbacks to `UserIntent` through public parsing/validation.
- Non-goals: no external message sending, no callback server, and no external channel conversation persistence.
- Safety notes: presentation payloads are bounded and redaction-aware; keep raw callback payloads, secrets, host paths, channel ids, delivery ids, and rendered external message ids outside presentation payloads. See [Presentation Outbox Delivery Guide](adapter-authoring/presentation-outbox-delivery-guide.md) and [Action Tokens and Callbacks Guide](adapter-authoring/action-tokens-and-callbacks-guide.md).

### `hazeteam-core/adapters`

- Responsibility: generic in-memory adapter stub boundary for tests, fake approval intent driver, adapter delivery result serialization/enveloping, and inbound intent submission checks.
- Typical external adapter usage: use the stub as a reference contract for consuming outbox items, submitting user intents without direct execution privileges, and wrapping delivery results through public envelopes.
- Non-goals: no real transport, no network delivery, no production adapter SDK, and no product/domain behavior.
- Safety notes: direct execution intent kinds are denied at the stub boundary; adapter-facing failures should be returned/logged as public envelopes.

### `hazeteam-core/workflow`

- Responsibility: action bundles, workflow definitions, core document-update planning, workflow instance state, and approval coordination helpers.
- Typical external adapter usage: inspect workflow state and route user-approved actions into the runtime path through public workflow/runtime surfaces.
- Non-goals: no external workflow engine and no product-specific workflow catalog.
- Safety notes: workflow state is canonical core state; external adapters should not mutate workflow internals outside public stores and coordinators.

### `hazeteam-core/runtime`

- Responsibility: idempotency store, runtime job queue, worker loop shell, runtime retry, cancellation, and dead-letter helper models.
- Typical external adapter usage: observe or trigger deterministic runtime draining through host/facade wiring, and report job status through safe diagnostics.
- Non-goals: no production daemon, no scheduler, no external queue service, and no cross-process locking implementation.
- Safety notes: runtime queue owns job lifecycle. External adapters should not execute runtime jobs directly or skip idempotency/retry semantics.

### `hazeteam-core/execution`

- Responsibility: execution preflight gates, document-update executor, execution result store, and execution audit event helpers.
- Typical external adapter usage: surface execution status and safe summaries after runtime/workflow processing.
- Non-goals: no external side-effect executor, no arbitrary command runner, and no product-specific action implementation.
- Safety notes: preflight gates must run before execution. Public summaries should not expose host paths, secrets, raw documents, or raw external payloads.

### `hazeteam-core/diagnostics`

- Responsibility: health model, health serialization/redaction, safe log records, metrics, and trace correlation helpers.
- Typical external adapter usage: expose status/health endpoints or external runtime status messages based on safe health and trace records.
- Non-goals: no metrics exporter, no logging backend, and no monitoring deployment.
- Safety notes: diagnostic records must remain redacted and correlation-oriented; do not include raw external message payloads or secrets. See [Readiness, Health, and Observability Guide](adapter-authoring/readiness-health-observability-guide.md) and [Security and Redaction Guide](adapter-authoring/security-redaction-guide.md).

### `hazeteam-core/testing`

- Responsibility: fixture discovery, scenario harness, golden fixture format, golden trace verifier, and serialized test harness results.
- Typical external adapter usage: verify an external adapter simulator or host wiring against deterministic golden expectations.
- Non-goals: no production test runner service and no external integration certification service.
- Safety notes: fixtures should use generic ids and sanitized payloads; golden acceptance should not depend on external network state. See [Testing and Certification Guide](adapter-authoring/testing-and-certification-guide.md).

### `hazeteam-core/lifecycle`

- Responsibility: plugin manifest shell, compatibility checks, static migration status, migration readiness/write gates, and backup/export/restore plan models.
- Typical external adapter usage: check compatibility and readiness before starting host wiring, and expose lifecycle status to external runtime health surfaces.
- Non-goals: no destructive migration executor, no backup storage implementation, and no deployment orchestrator.
- Safety notes: lifecycle gates should block startup or writes when compatibility/readiness fails; plans are declarative and safe to serialize. See [Durable Stores Guide](adapter-authoring/durable-stores-guide.md) and [Adapter Release Checklist](adapter-authoring/checklists/adapter-release-checklist.md).

### `hazeteam-core/composition`

- Responsibility: deterministic vertical MVP composition surface and acceptance suite for the generic core document-update scenario.
- Typical external adapter usage: use as a reference composition and regression baseline when validating adapter-facing flows.
- Non-goals: not a product adapter, not an external runtime, and not a production orchestrator.
- Safety notes: composition must stay in-process, deterministic, domain-neutral, and aligned with the golden oracle.

### `hazeteam-core/host`

- Responsibility: automation runtime shell, agent control host surfaces, external session binding, composed `createCoreInteractionHost` facade for adapter-facing interaction flow, and S61B port readiness diagnostics.
- Typical external adapter usage: provide explicit ports to `createCoreInteractionHost`, call `getPortReadiness` for descriptive diagnostics, map an external inbound message or callback into facade inputs, call inbound/presentation/runtime methods, deliver returned public items through the external adapter, and keep `createCoreInteractionHostSkeleton` only for non-success contract checks.
- Public readiness exports: `describeCoreInteractionPortInventory`, `summarizeCoreInteractionPortReadiness`, `validateCoreInteractionPortInventory`, `CoreInteractionPortReadiness`, `CoreInteractionPortReadinessInput`, `CoreInteractionPortReadinessSummaryInput`, `CoreInteractionPortReadinessResult`, and related port descriptor/readiness types.
- Non-goals: no real transport, no external channel binding implementation, no production daemon, no product-specific facade, no hidden global stores, and no durable implementation packages.
- Safety notes: host-facing results must be serialized through S54 safe public DTOs and S59 envelopes; do not expose internal execution context paths, layout roots, secrets, or raw storage objects to external channels. See [Core Interaction Facade](host/core-interaction-facade.md) for S60/S61 composition details and [Core Interaction Facade Guide](adapter-authoring/core-interaction-facade-guide.md) for adapter package usage guidance.

## Adapter handoff export audit

The release handoff package uses the following public entrypoints as stable adapter-facing API:

- `hazeteam-core/host`: `createCoreInteractionHost`, `createCoreInteractionHostSkeleton`, `describeCoreInteractionHostContract`, `CoreInteractionHost`, `CoreInteractionHostProductionOptions`, `CORE_INTERACTION_CONTRACT_VERSION`, `AgentControlHost`, `HostInboundAction`, `HostSessionBindingStore`, `createInMemoryHostSessionBindingStore`, `serializeHostSessionBinding`, `validateHostInboundAction`, `describeCoreInteractionPortInventory`, `summarizeCoreInteractionPortReadiness`, `validateCoreInteractionPortInventory`, `CoreInteractionPortReadiness`, `CoreInteractionPortReadinessInput`, `CoreInteractionPortReadinessSummaryInput`, `CoreInteractionPortReadinessResult`, and related port descriptor/readiness types. The composed `createCoreInteractionHost` facade also exposes `getPortReadiness` diagnostics over injected dependencies.
- `hazeteam-core/presentation`: `PresentationOutboxStore`, `PresentationOutboxItem`, `createInMemoryPresentationOutboxStore`, `serializePresentationOutboxItem`, `serializePresentationDeliveryResult`, `PresentationActionTokenStore`, `IssuePresentationActionTokenInput`, `VerifyPresentationActionTokenInput`, `ConsumePresentationActionTokenInput`, `createInMemoryPresentationActionTokenStore`, `serializePresentationActionToken`, `serializePresentationActionTokenVerificationResult`, and `serializePresentationActionTokenConsumeResult`.
- `hazeteam-core/foundation`: `CoreApiEnvelope`, `successEnvelope`, `failureEnvelope`, `serializeCoreError`, and `serializeResultEnvelope`.
- `hazeteam-core/adapters`: `CoreAdapterBoundary`, `submitAdapterIntent`, `consumePresentationOutboxItem`, and `serializeAdapterDeliveryResultEnvelope`.
- `hazeteam-core/testing`: deterministic scenario harness and fixture helpers for core acceptance checks.

Current audit notes:

- S61A/S61B port readiness helpers and related types are exported through `hazeteam-core/host` and documented in [Core Interaction Port Injection](host/core-interaction-port-injection.md).
- The generic external adapter simulator is documented in [Generic External Adapter Simulator](testing/generic-external-adapter-simulator.md) and lives in the test fixture area. It is an acceptance reference, not package API.
- No real durable store, database, cache, network, provider, or transport implementation is included in core.

## Remaining adapter-readiness slices

- S61 port injection readiness
- S62 generic external adapter simulator
- S63 release handoff
