# Core Interaction Facade

## Purpose

S60E final facade is composed. `createCoreInteractionHost(options)` is the production-ready adapter-facing facade for core interaction flows, while `createCoreInteractionHostSkeleton()` remains available only as an explicit non-success contract skeleton.

The facade is transport-neutral and domain-neutral. It does not open connections, deliver external messages, render channel-specific markup, host callback endpoints, own deployment scheduling, or introduce product-specific behavior.

For adapter package implementation guidance around this facade, see [Core Interaction Facade Guide](../adapter-authoring/core-interaction-facade-guide.md). For external session binding, delivery, callback, runtime, and approval flows, see the [Adapter Authoring Guide](../adapter-authoring/README.md).

## Composition model

`createCoreInteractionHost(options)` is a thin composition layer over the independent S60 operation modules:

- S60B: presentation interaction operations: list pending presentations, claim presentation delivery, mark delivered/failed, issue action token, verify action token, and consume action token.
- S60C: inbound session and dispatch interaction operations: external inbound handling, host session binding resolve/create, `HostInboundAction` validation, `AgentControlHost.dispatch`, and safe submission envelopes.
- S60D: runtime drain, workflow status, and health/status operations.

S60B/S60C/S60D remain independent operation modules. The final facade delegates to them and does not duplicate their lifecycle, retry, binding, token, policy, approval, or runtime semantics.

## Required and optional dependencies

Production wiring should inject explicit ports through `CoreInteractionHostProductionOptions`.

Required for inbound/session/dispatch operations:

- `agentControlHost`
- `sessionBindingStore`

Required for presentation/token operations:

- `presentationOutboxStore`
- `presentationActionTokenStore`

Optional for runtime/status/health operations:

- `runtimeDrainOnce` / `drainRuntimeOnce`
- `runtimeWorkerLoop`
- `runtimeQueue` with `runtimeHandlers`
- `runNextRuntimeJob`
- `workflowStatusReader` / `workflowStore`
- `healthReader` / `healthStatusReader`

Common optional inputs:

- `now`
- `correlationId`
- `metadata`
- runtime-specific id/context helpers when the runtime operation module supports them

The facade does not create hidden global stores. Missing required dependencies produce safe public failure envelopes at method level instead of raw exceptions or fake success.

For production durable implementations of required stores and restart/atomicity requirements, see [Durable Stores Guide](../adapter-authoring/durable-stores-guide.md).

## Port readiness diagnostics

S61B adds `getPortReadiness(input?)` to the composed facade. The method returns a S59 `CoreApiEnvelope` whose value describes the S61A port inventory and the ports that were actually supplied through `createCoreInteractionHost(options)`.

Readiness is descriptive only. It does not create stores, open external connections, validate external infrastructure, start runtime loops, or change operation semantics.

Missing required dependencies are represented as safe diagnostic state in the readiness payload. Calling `getPortReadiness` must not throw simply because a required operational port is absent. Existing S60 methods keep their existing method-level behavior when invoked with missing dependencies.

Durable implementations remain outside core. Future adapter or deployment packages can implement durable stores, queues, readers, or diagnostic providers externally and inject them through the public facade options.

For adapter-owned readiness, health, metrics, logs, and status surface guidance, see [Readiness, Health, and Observability Guide](../adapter-authoring/readiness-health-observability-guide.md).

## Method mapping

The composed facade delegates one-to-one:

- `submitHostAction` -> S60C `submitHostAction`
- `submitUserIntent` -> S60C `submitUserIntent`
- `listPendingPresentations` -> S60B `listPendingPresentations`
- `claimPresentation` -> S60B `claimPresentation`
- `markPresentationDelivered` -> S60B `markPresentationDelivered`
- `markPresentationFailed` -> S60B `markPresentationFailed`
- `issueActionToken` -> S60B `issueActionToken`
- `verifyActionToken` -> S60B `verifyActionToken`
- `consumeActionToken` -> S60B `consumeActionToken`
- `drainRuntimeOnce` -> S60D `drainRuntimeOnce`
- `getWorkflowStatus` -> S60D `getWorkflowStatus`
- `getHealth` -> S60D `getHealth`
- `getPortReadiness` -> S61A readiness summary over explicit facade options

Operation envelopes are preserved. The facade does not double-wrap success or failure results.

## Contract version and envelopes

The S60 contract version is `core.v1`.

Every facade operation returns a public `CoreApiEnvelope<T>`:

- success: `{ contractVersion: "core.v1", ok: true, value }`;
- failure: `{ contractVersion: "core.v1", ok: false, error }`.

Failures follow the public error-envelope rules from `hazeteam-core/foundation`. External adapters should treat facade failures as safe public results, not as thrown transport exceptions.

For public output, logging, metrics, and callback redaction rules, see [Security and Redaction Guide](../adapter-authoring/security-redaction-guide.md).

## Adapter ownership

External adapters still own real delivery/callback/transport. They translate external inbound events into safe core refs and facade inputs, deliver returned presentations or outbound items through external systems, verify/consume action tokens before accepting callbacks, and keep raw external payloads outside core.

The facade does not mutate documents directly. Document changes continue through workflow, approval, runtime, and execution ports. Runtime retry and dead-letter behavior remain owned by runtime queues and worker-loop surfaces.

For a complete extension taxonomy covering transport adapters, runtime bridges, durable stores, renderers, permission adapters, observability plugins, lifecycle plugins, testkits, and deployment packages, see [Extension and Plugin Taxonomy](../adapter-authoring/extension-taxonomy.md).

## Remaining readiness work

- S61 port injection readiness: harden production port injection and durable implementation guidance.
- S62 generic external adapter simulator: acceptance tests for adapter-facing flow without real transport.
- S63 release handoff: final packaging, migration notes, and public adapter readiness sign-off.

## Non-goals

The core interaction facade does not provide:

- real transport code;
- external channel connections;
- callback endpoints;
- external message rendering;
- deployment-specific schedulers or daemons;
- product/domain adapters;
- alternative approval, policy, runtime retry, dead-letter, outbox, or action-token semantics.
