# Adapter Readiness

## 1. Purpose

`hazeteam-core` is a transport-neutral core package. External adapter packages translate external events into public core calls and translate safe core outputs back into external delivery operations.

For step-by-step adapter package design, implementation, testing, and release guidance, start with the [Adapter Authoring Guide](adapter-authoring/README.md). The final adapter release checklist is [Adapter Handoff Package](release/adapter-handoff.md). Adapter packages should use that handoff document as the pre-implementation and pre-release checklist.

## 2. Core owns

Core owns domain-neutral refs, validation, envelopes, approval state, presentation outbox state, action-token state, runtime queue semantics, workflow state, lifecycle state, diagnostics, and host facade contracts.

Core code stays transport-neutral and deterministic. It exposes ports, validators, serializers, readiness metadata, and in-memory test implementations, but it does not connect to external systems by itself.

## 3. External adapter owns

External adapters own real delivery/callback/transport, external message parsing, external channel/conversation IDs, durable integration stores when needed, deployment wiring, and product/domain behavior.

Durable implementations remain outside core. S61C or future adapter packages may provide them externally and inject them behind public contracts.

## 4. Adapter flow sketch

S60 final facade is now composed through `createCoreInteractionHost`.

```text
external inbound message
-> resolve/create host session binding
-> HostInboundAction or UserIntent facade input
-> AgentControlHost.dispatch through S60C
-> HostOutboundItem / PresentationOutboxItem
-> external delivery
-> action token verify/consume for external callback
-> UserIntent
-> approval/runtime/execution
-> status/health through S60D
```

Adapters should not submit direct execution requests or mutate runtime/workflow state outside public ports.

## 5. Port readiness diagnostics

S61B exposes `getPortReadiness(input?)` on the composed facade. The method returns a S59 public envelope with descriptive readiness metadata over the ports supplied to `createCoreInteractionHost(options)`.

Readiness is descriptive only. It does not create durable implementations, open external connections, validate external infrastructure, or change store behavior. Missing required ports are safe diagnostic state, not construction-time exceptions.

## 6. Presentation flow

Adapter responsibilities:

1. list or receive a pending presentation outbox item through the composed facade or S60B operations;
2. claim the item for external delivery;
3. map the item payload to an external message;
4. issue a presentation action token for each external action;
5. include only the token id and safe adapter-owned callback data in the external action payload;
6. mark delivered or failed after external delivery;
7. verify and consume the token when the callback returns;
8. map the verified callback back to `UserIntent`;
9. submit the intent through the facade inbound operation.

The presentation outbox delivery pump owns the `pending -> delivering -> sent/failed` delivery lifecycle. The presentation action token verifier is independent from that lifecycle and does not change outbox retry, failure, or dead-letter behavior.

S60B/S60C/S60D remain independent operation modules under the final facade.

## 7. Session binding flow

```text
external channel/conversation
-> resolve or create host session binding
-> produce HostSessionRef + workspaceRef + agentRef
-> dispatch HostInboundAction
-> reuse binding for later callbacks/messages
```

External session binding is tracked by the host session-binding surface and keeps this mapping domain-neutral.

For production adapter guidance on external conversation mapping, missing/disabled bindings, callback binding, delivery target derivation, and durable binding storage, see [Session Binding Guide](adapter-authoring/session-binding-guide.md).

## 8. Action token flow

```text
issue token bound to workspace/outbox/approval/action
-> include token id in external action/callback payload
-> verify without mutation
-> consume once
-> deny replay, expired token, and binding mismatch
-> submit validated UserIntent
```

Parsing alone is not authorization; callback-token verification and consume happen through S60B operations or the composed S60 facade.

For adapter callback ordering, permission-before-consume guidance, replay handling, and opaque callback payload rules, see [Action Tokens and Callbacks Guide](adapter-authoring/action-tokens-and-callbacks-guide.md).

## 9. Runtime flow

The runtime queue owns job lifecycle. `drainRuntimeOnce` is deterministic and single-step. Core does not provide a production runtime loop owner; deployment-specific timing belongs outside core.

For runtime bridge, workflow status, approval routing, and external orchestrator guidance, see [Runtime, Workflow, and Approval Guide](adapter-authoring/runtime-workflow-approval-guide.md).

## 10. Safe serialization rules

Public serialized outputs must not expose host filesystem details, storage roots, private runtime backing objects, or internal execution context details that reveal storage layout.

Adapters should use public serializers, public refs, and adapter-facing envelopes. Before logging or returning a core operation result, an external adapter should wrap raw `Result<T>` values with `serializeResultEnvelope(result, safeSerializer)` unless the facade or operation module already returned a `CoreApiEnvelope<T>`. See [Public Result and Error Envelopes](foundation/public-result-error-envelopes.md).

For production redaction, health/logging/metrics safety, and release security review rules, see [Security and Redaction Guide](adapter-authoring/security-redaction-guide.md) and [Testing and Certification Guide](adapter-authoring/testing-and-certification-guide.md).

## 11. S62B executable generic adapter acceptance

S62B adds an executable deterministic acceptance suite at `tests/acceptance/generic-external-adapter-flow.test.mjs`.

The suite uses the S62 generic external adapter simulator, `createCoreInteractionHost`, and in-memory core dependencies only. It exercises the adapter-facing flow end-to-end without a real external adapter, real transport, external-service binding, callback endpoint, durable implementation, daemon, or scheduler.

External adapter packages can use this suite as a contract reference for the public facade boundary:

- inbound external message mapping into a safe `HostInboundAction` submission;
- presentation outbox listing, claim, fake external rendering, and delivered marking;
- action-token issue, verify, consume, replay denial, and mismatch denial;
- direct execution denial on the adapter-facing user-intent path;
- safe not-configured runtime/status/health envelopes when deterministic runtime readers are not injected.

The acceptance suite asserts `contractVersion: "core.v1"`, public envelope shape, JSON safety, no raw storage/path roots, no provider/transport payload leakage, and no raw error stack leakage.

Production adapter delivery, external I/O, callback routing endpoints, external retry orchestration, and deployment scheduling remain outside core.

## 12. Known follow-up slices

- S61 port injection readiness
- S62 generic external adapter simulator
- S62B executable generic external adapter acceptance suite
- S63 release handoff

These slices define the remaining adapter-readiness hardening work after the composed S60 facade. S63 adapter handoff is the final release package for adapter authors. It links the S60 facade, S61 port-injection inventory, S62 simulator reference, safe serialization rules, non-goals, and final checklist in one place.

Use [Adapter Handoff Package](release/adapter-handoff.md) as the release checklist before implementing an external adapter or certifying adapter-facing core changes. Use [Adapter Implementation Roadmap](adapter-authoring/adapter-implementation-roadmap.md) and the [Adapter Design](adapter-authoring/checklists/adapter-design-checklist.md), [Adapter PR](adapter-authoring/checklists/adapter-pr-checklist.md), and [Adapter Release](adapter-authoring/checklists/adapter-release-checklist.md) checklists to plan and review external adapter packages.
