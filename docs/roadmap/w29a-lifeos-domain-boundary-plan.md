# W29A LifeOS Domain Boundary Plan

## Status

W29A is a planning-only roadmap for future LifeOS/domain integration boundaries. It adds no executable LifeOS behavior, domain product behavior, OCA behavior, provider behavior, sidecar behavior, package export wiring, CI, scripts, tests, deployment behavior, or production-readiness evidence.

The repository posture remains adapter-ready-for-real-system-integration under explicit gates and not production-ready. The adapter can be used only through explicit integration gates already described by the current adapter-readiness evidence. This plan does not create a LifeOS/domain readiness claim, a real-provider success claim, an OCA readiness claim, or a production deployment claim.

## Planning scope

This document defines future ownership boundaries and safe follow-up slices. It is not an implementation specification for product behavior.

Future W29 work may describe or add contract-only domain surfaces only when an explicit Worker prompt assigns that work. Until fan-in is complete and verified, W29 leaves must not depend on each other, must not update shared export surfaces, and must not claim that LifeOS/domain behavior is available to users.

## Future LifeOS/domain ownership boundaries

### Domain event vocabulary boundary

Future LifeOS/domain work may own a declarative domain event vocabulary.

Allowed ownership:

- stable safe domain event refs;
- bounded event kind names;
- event schema descriptors;
- event source classification after adapter normalization;
- correlation refs and idempotency refs;
- redacted, JSON-safe event summaries;
- event-to-intent planning descriptors.

Outside this boundary:

- raw provider events remain at the provider edge;
- raw OpenClaw runtime events remain outside domain descriptors;
- OCA session objects and runtime outputs remain capability-owned;
- durable backend implementation remains outside domain vocabulary;
- event handlers that mutate product state are future product behavior and out of scope for W29A.

A domain event vocabulary may state what kind of domain-significant event exists. It must not claim that the repository captures, stores, routes, or executes LifeOS events in production.

### Domain command vocabulary boundary

Future LifeOS/domain work may own declarative command vocabulary.

Allowed ownership:

- stable safe command refs;
- command names and bounded aliases;
- safe input schema descriptors;
- intent mapping descriptors;
- policy and approval refs;
- capability action refs;
- idempotency strategy descriptors;
- safe presentation hints.

Outside this boundary:

- Telegram bot command objects are transport-owned;
- OpenClaw tool calls are runtime/plugin-owned;
- OCA operation execution is capability-owned;
- core approval, token, outbox, and policy semantics remain core/plugin-owned;
- provider SDK construction, network calls, secret loading, and deployment config remain outside domain command vocabulary.

A domain command descriptor may describe what a LifeOS command means. It must not implement a command handler that performs provider IO, mutates core internals, starts OCA work, loads secrets, or performs product-side effects.

### Adapter-to-domain boundary

The adapter and plugin runtime may later translate normalized provider input into safe domain-facing context.

The adapter-to-domain boundary may pass only normalized, bounded, public-safe values such as:

- workspace ref;
- agent ref;
- command ref;
- actor or principal ref;
- topic binding ref;
- correlation ref;
- idempotency ref;
- safe command arguments;
- safe attachment refs;
- safe capability status refs.

It must not pass:

- raw Telegram/OpenClaw provider objects;
- raw callback data;
- raw provider request or response bodies;
- provider SDK handles;
- endpoint-like values;
- resolved secrets or credential values;
- runtime-only handles;
- stack traces, logs, stdout, stderr, or local filesystem paths;
- raw OCA session, log, output, diff, or artifact objects.

Topic routing authority remains channel ref plus chat ref plus thread ref, not topic title or display text. Provider acknowledgement remains separate from business success.

### Domain-to-OCA approval boundary

Future LifeOS/domain packages may declare that a command or agent uses an OCA runtime capability. They may not call OCA directly.

Allowed domain ownership:

- capability binding declarations;
- allowed capability action refs;
- operation risk classification descriptors;
- policy refs and approval policy refs;
- user-facing approval presentation hints that are bounded and redacted.

Outside this boundary:

- OCA session lifecycle is OCA capability-owned;
- OCA operation execution is OCA capability-owned;
- plugin/core policy enforcement is not domain-owned;
- token issue, verification, and consumption are not domain-owned;
- adapter callback payload construction is not domain-owned.

Mandatory future flow:

1. Domain command declares a capability action and approval requirement.
2. Plugin command router resolves safe topic, actor, agent, and command context.
3. Core/plugin policy preflight determines whether approval is required.
4. Adapter renders a safe approval presentation using tokenized actions.
5. Callback handling performs permission checks before token consumption.
6. Capability execution happens only after the required approval boundary passes.
7. Capability returns a safe summary, not raw runtime output.

Denied permission, failed verification, or already-consumed token states must be safe, idempotent, and must not consume or replay side effects incorrectly.

### Safe public domain projection boundary

Future LifeOS/domain public projections may expose descriptor-level information only.

Allowed projection fields:

- safe refs;
- bounded display labels;
- domain readiness posture;
- command or event kind;
- safe status enum;
- policy and approval refs;
- capability binding refs;
- redacted summary;
- correlation ref;
- JSON-safe booleans, arrays, and bounded strings.

Forbidden projection content:

- raw provider payloads;
- raw OCA payloads;
- raw runtime payloads;
- raw approval payloads;
- raw secrets, credential values, or config dumps;
- endpoint examples that look real;
- local paths;
- stack traces;
- logs, stdout, or stderr;
- connector, tool, SDK, or client internals;
- unbounded user text or nested object dumps.

Example safe planning projection:

```json
{
  "projectionKind": "domain-boundary-planning-example",
  "domainRef": "domain:lifeos:placeholder",
  "agentRef": "agent:lifeos:placeholder-agent",
  "commandRef": "domain-command:lifeos:placeholder-command",
  "eventRef": "domain-event:lifeos:placeholder-event",
  "correlationRef": "correlation:w29a-placeholder",
  "readinessPosture": "not-implemented",
  "redactionStatus": "redacted-json-safe",
  "productionReady": false
}
```

This example is illustrative only. It does not define a runtime contract, handler, exported type, endpoint, command implementation, or product behavior.

### No raw provider, OCA, or runtime payload exposure

All future LifeOS/domain slices must preserve the raw-payload boundary. Raw provider data may exist only in an edge zone that normalizes and redacts before crossing into adapter-public, domain, capability-public, readiness, durable, or presentation surfaces. OCA raw output requires stricter handling because coding-session output can contain sensitive paths, logs, patches, command output, or private repository content. Domain work must receive safe summaries and refs only.

## Non-goals

W29A and its proposed leaf work do not include:

- LifeOS product behavior;
- domain product readiness;
- OCA runtime behavior;
- sidecar behavior;
- provider SDK or client construction;
- default network behavior;
- default secret or config loading;
- production deployment readiness;
- real-provider success claim;
- package-root export wiring by leaf Workers;
- local barrel export wiring by leaf Workers;
- package metadata updates by leaf Workers;
- broad static guard updates by leaf Workers;
- CI, script, deployment, or release gate changes by leaf Workers.

## Max-parallel W29 follow-up matrix

| Slice | Future title | Owns | Must not own | Shared-file policy | Fan-in dependency |
| --- | --- | --- | --- | --- | --- |
| W29B | LifeOS/domain contract types | Type-only or descriptor-only vocabulary for safe domain events, commands, policies, approval refs, agent refs, and projections | Runtime handlers, package root exports, local barrels unless explicitly assigned, OCA execution, provider network, secrets, deployment, production readiness | No shared files | None; independent leaf |
| W29C | Fake/inert domain adapter boundary | Fake/inert adapter-to-domain normalization boundary using safe refs and redacted JSON-safe public outputs | Real LifeOS behavior, real domain product behavior, provider SDK/client construction, OCA runtime, network, secrets, deployment, package root exports | No shared files | None; independent leaf |
| W29D1 | Static guard for W29B | Narrow static no-leak and scope guard for W29B-owned files only | Broad global static guard rewrites, package exports, sibling enforcement outside W29B scope, runtime tests | No shared files except its own new static file if explicitly assigned | After W29B branch content exists or as an independently scoped guard if prompt supplies file targets |
| W29D2 | Static guard for W29C | Narrow static no-leak and scope guard for W29C-owned files only | Broad global static guard rewrites, package exports, sibling enforcement outside W29C scope, runtime tests | No shared files except its own new static file if explicitly assigned | After W29C branch content exists or as an independently scoped guard if prompt supplies file targets |
| W29E | W29 fan-in | Integrates already-merged W29 leaves, updates reserved shared surfaces, and records final W29 docs posture | New LifeOS product behavior, OCA behavior, provider runtime behavior, sidecar behavior, production readiness, real-provider success claim | W29E only | Only after all W29 leaves are merged |

## Shared-file reservation for W29E only

The following shared surfaces are reserved for W29E only and must not be edited by W29B, W29C, W29D1, or W29D2 unless a future Orchestrator prompt explicitly reassigns ownership:

- package root;
- local barrels;
- package metadata;
- docs/roadmap/current-development-state.md;
- README;
- broad static guards.

Leaf Workers should use isolated files and narrow tests only. If a leaf discovers it needs any reserved shared surface, it should stop that part of the work and report the need for W29E fan-in.

## Fan-in rules

W29E may run only after all W29 leaf branches that it integrates are merged into the target branch and verified. W29E must use the merged target state as factual input; it must not depend on unmerged sibling branches.

W29E may update reserved shared surfaces only to expose or document already-merged W29 leaves. It must preserve the repository posture as adapter-ready-for-real-system-integration under explicit gates and not production-ready unless a later, explicit release-gate prompt proves otherwise. W29E must not use OCA or LifeOS/domain behavior as evidence of generic adapter readiness or real-provider success.

## Worker guardrails for future W29 leaves

Future W29 Workers should preserve these guardrails:

- work only in the assigned branch and assigned files;
- do not edit main, target branch, sibling branches, or shared fan-in surfaces;
- do not import private hazeteam-core paths;
- do not copy hazeteam-core source;
- keep package-root imports side-effect-free;
- keep public outputs JSON-safe and redacted;
- keep fake/inert boundaries below production readiness;
- keep ready-to-attempt and ready-to-run below pass;
- keep provider acknowledgement separate from business success;
- do not add default network calls, secret loading, provider SDK construction, deployment runtime, sidecar runtime, OCA runtime, or LifeOS product behavior.

## W29A result

W29A creates only this planning document. It intentionally leaves all implementation, exports, tests, scripts, package metadata, release docs, and fan-in work to future explicitly scoped slices.
