# Core Interaction Port Injection

S61A records the port-injection inventory for the core interaction surface. S61B wires that inventory into `createCoreInteractionHost(options)` as an adapter-facing readiness diagnostic method.

This is still readiness metadata only. The core package does not introduce durable storage, network clients, cache clients, adapter bindings, connection attempts, lifecycle loops, or production persistence in this slice.

## Why injected ports exist

The interaction host is adapter-facing, but the core must stay transport-neutral. Adapters should be able to provide their own durable stores, queues, readers, and diagnostic sources while the core keeps stable contracts and deterministic operation modules.

Port injection keeps these concerns separate:

- core defines public contracts and safe operation boundaries;
- adapters choose how to persist or read data outside core;
- tests can use in-memory defaults without special infrastructure;
- production deployments can replace defaults without changing operation semantics.

## Inventory module

The inventory lives in:

```text
src/host/core-interaction-port-contracts.ts
```

It exposes descriptive helpers only:

- `describeCoreInteractionPortInventory()` returns a stable contract map;
- `validateCoreInteractionPortInventory(input)` verifies that a value has the expected inventory shape;
- `summarizeCoreInteractionPortReadiness(input)` reports descriptive readiness statuses.

The readiness statuses are:

- `ready` — a caller supplied an implementation for the port;
- `partial` — the port is optional or has a non-final fallback path, but was not injected;
- `missing` — a required interaction port was not injected;
- `unsupported` — the current public contracts do not yet expose a usable port or the caller explicitly marked it unsupported.

These helpers perform no I/O and own no runtime lifecycle.

## Facade diagnostics

`createCoreInteractionHost(options)` now exposes:

```ts
host.getPortReadiness(input?)
```

The method returns a S59 `CoreApiEnvelope<CoreInteractionPortReadinessResult>`. It describes the ports that were actually supplied through `CoreInteractionHostProductionOptions` and never attempts to open or validate an external connection.

`getPortReadiness` is safe to call even when required ports are absent. Missing required ports are reported as diagnostic state in the readiness payload; they are not treated as construction-time exceptions. Existing facade methods still preserve their own S60B/S60C/S60D behavior if a caller invokes an operation whose dependency is absent.

The input is JSON-safe and generic:

```ts
interface CoreInteractionPortReadinessInput {
  contractVersion?: "core.v1";
  includeInventory?: boolean;
  unsupportedPorts?: readonly CoreInteractionPortName[];
  correlationId?: string;
  metadata?: JsonObject;
}
```

## Required ports for the adapter-facing facade

The final facade needs these ports to support the S60 interaction flows without transport state leaking into core:

| Port | Existing public contract | Current default | Used by |
| --- | --- | --- | --- |
| `agentControlHost` | `AgentControlHost` from `src/host/agent-control-host.ts` | none | inbound dispatch |
| `presentationOutboxStore` | `PresentationOutboxStore` from `src/presentation/presentation-outbox.ts` | `createInMemoryPresentationOutboxStore` | presentation delivery |
| `presentationActionTokenStore` | `PresentationActionTokenStore` from `src/presentation/action-token.ts` | `createInMemoryPresentationActionTokenStore` | action token issue, verify, consume |
| `sessionBindingStore` | `HostSessionBindingStore` from `src/host/session-binding.ts` | `createInMemoryHostSessionBindingStore` | external conversation to host session binding |

S61B reports these as `ready` only when they are explicitly supplied to `createCoreInteractionHost(options)`.

## Optional ports

These ports already have useful public contracts or can be represented as read-only extension points, but the final facade can remain partially useful without all of them:

| Port | Existing public contract | Current default | Notes |
| --- | --- | --- | --- |
| `approvalStore` | `ApprovalRequestStore` from `src/approval/index.ts` | `createInMemoryApprovalRequestStore` | useful for approval inspection; direct approval mutation is not part of this slice |
| `runtimeQueue` | `RuntimeJobQueue` from `src/runtime/index.ts` | `createInMemoryRuntimeJobQueue` | one possible runtime drain source |
| `runtimeWorkerLoop` | `RuntimeWorkerLoop` from `src/runtime/index.ts` | `createRuntimeWorkerLoop` | one-step runtime execution boundary |
| `runtimeDrainOnce` | `CoreRuntimeDrainFunction` from `src/host/core-interaction-runtime.ts` | none | direct injected drain callback |
| `workflowStore` | `WorkflowInstanceStore` from `src/workflow/index.ts` | module-defined in-memory workflow store contracts | status source when a workflow store is injected |
| `workflowStatusReader` | `CoreWorkflowStatusReader` from `src/host/core-interaction-runtime.ts` | none | minimal read-only workflow status source |
| `eventStore` | `EventStore` from `src/events/index.ts` | `createInMemoryEventStore` | diagnostic and audit reads |
| `documentStore` | `DocumentStoreReadModel` from `src/storage/index.ts` | `createInMemoryDocumentStoreReadModel` | read model only |
| `stateFileStore` | `WorkspaceStateFileStore` from `src/storage/index.ts` | `createWorkspaceStateFileStore` | state-file references only |
| `healthReader` | `CoreHealthStatusReader` from `src/host/core-interaction-runtime.ts` | none | safe health envelope source |

S61B reflects the optional ports that are present on the final facade options: runtime drain/queue/worker-loop wiring, workflow store/reader wiring, and health reader wiring. Other optional inventory entries remain visible for future slices and external adapter packages.

## Planned or unsupported ports

Some inventory entries are explicitly not final integration points yet:

| Port | Status | Reason |
| --- | --- | --- |
| `executionResultStore` | planned / unknown | no dedicated public execution-result store type was identified in the current public indexes |
| `diagnosticsReader` | planned | diagnostics can become a read-only source later, but it is not wired into the final interaction host in this slice |

The inventory keeps these entries visible so future slices can decide whether to add public contracts or keep them outside the interaction facade.

## Durable implementations stay outside core

Durable implementations remain outside the core package. The core package must not add database drivers, cache clients, network clients, message broker clients, or adapter runtime packages for this slice.

Production deployments can place durable infrastructure behind the public contracts, but those implementations live in adapter or deployment packages. S61C or future adapter packages may provide those implementations externally and pass them into `createCoreInteractionHost(options)`.

## Handoff

S61B completes descriptive facade wiring for the port inventory. Later slices can use the same contracts to:

1. provide durable implementations in external packages;
2. preserve the existing S60B/S60C/S60D operation modules as behavior owners;
3. report readiness before and after facade construction;
4. keep core free from transport and durable-infrastructure code.
