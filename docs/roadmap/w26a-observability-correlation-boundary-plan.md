# W26A Observability and Correlation Boundary Plan

## Status and scope

W26A is a planning-only roadmap for future observability and correlation work.

The repository remains adapter-ready-for-real-system-integration under explicit gates and not production-ready. This plan does not change the current repository classification, does not claim production observability readiness, and does not claim a real-provider success result.

This document describes future ownership, boundaries, guard needs, worker slices, and fan-in rules only. It does not implement observability behavior.

## Planning-only constraints

This phase adds no runtime behavior and no production readiness evidence.

W26A does not add:

- production telemetry pipeline;
- logging or tracing exporter implementation;
- metrics backend;
- default network behavior;
- runtime startup;
- listener, webhook, polling, daemon, server, or scheduler behavior;
- provider SDK or provider client construction;
- credential loading or secret resolution;
- durable backend behavior;
- package exports;
- CI, scripts, tests, deployment behavior, or production readiness gates;
- production observability readiness claim;
- real-provider success claim.

Future work must keep default check and test paths no-network and no-secret unless a later explicit gate says otherwise.

## Correlation reference ownership

A future implementation should treat correlation as a safe reference graph, not as a raw trace dump.

Correlation reference ownership rules:

- The first safe boundary that accepts an operation should create or derive the correlation reference when one is absent.
- Downstream boundaries should propagate the existing correlation reference instead of replacing it.
- Retry, duplicate, replay, callback, delivery, and approval paths should link to the original correlation reference and may add safe related references for their own operation class.
- Durable records, audit records, readiness projections, and public observability summaries may store correlation references only after raw provider and runtime material has been normalized.
- Correlation references must be bounded, stable, synthetic or safe, and redaction-compatible.
- Correlation references must not encode raw provider identifiers, provider account identifiers, host details, local environment details, runtime output, secret material, or unbounded free-form text.

Future reference vocabulary should remain close to this safe family:

- corr:event for normalized external event processing;
- corr:intent for adapter-to-core intent submission;
- corr:presentation for presentation claim and rendering;
- corr:delivery for provider delivery attempt lifecycle;
- corr:callback for callback receipt and dispatch lifecycle;
- corr:approval for approval request and resolution lifecycle;
- corr:runtime-operation for runtime capability work;
- corr:oca-session for downstream OCA session summaries, if that parked overlay is explicitly reopened later;
- corr:restore for restore jobs;
- corr:replay for replay jobs;
- corr:readiness for readiness snapshot generation.

The vocabulary above is conceptual planning vocabulary. It is not a code-level API, package export, or runtime contract implementation.

## Safe event and audit projection boundary

Future observability and audit outputs must be safe public projections. They may describe what happened, when it happened, and how it relates to other safe records, but they must not expose raw operational material.

Allowed public projection categories:

- event reference;
- correlation reference;
- component reference;
- operation kind;
- safe status;
- safe severity;
- safe reason code;
- bounded duration bucket or bounded elapsed duration;
- bounded redacted summary;
- related safe references;
- retry or replay eligibility classification;
- provider acknowledgement classification, kept separate from business success.

Forbidden public projection categories:

- raw provider payloads;
- raw runtime or tool payloads;
- raw provider request or response bodies;
- provider SDK objects or client handles;
- resolved credential values or secret-bearing config;
- raw durable backend rows;
- stack traces;
- local or host-specific paths;
- raw diagnostic output;
- raw exception text;
- provider account identifiers unless they have been mapped to safe references;
- endpoint examples that look real;
- unbounded strings or nested unknown objects.

Safe event and audit projections should use reason codes and bounded summaries instead of raw exception text. They should be JSON-serializable and suitable for public readiness summaries, admin UI summaries, and CI summaries without exposing protected material.

## Redacted public observability summaries

Future public summaries should answer operational questions without exposing operational internals.

Safe summaries may include:

- counts by safe status or reason code;
- lifecycle step names from the public contract vocabulary;
- bounded duration buckets;
- whether a provider acknowledgement was observed;
- whether business success was confirmed separately;
- whether a retry, replay, or manual follow-up is eligible;
- whether a failure is blocked, retryable, terminal, skipped, or degraded.

Safe summaries must not include:

- resolved credentials, credential values, secret-bearing config, or raw environment data;
- raw provider identifiers that have not been normalized;
- raw message bodies, callback payloads, request bodies, or response bodies;
- local paths, hostnames, container identifiers, or process details;
- raw stack traces, raw diagnostic output, or copied terminal output;
- raw OCA logs, raw diffs, unsafe branch names, unsafe command lines, or code-agent internals.

Any public example added by future workers must use synthetic references, redacted labels, bounded strings, and JSON-safe values only.

## Runtime-value containment

Runtime values remain outside public observability.

Future observability work must preserve these rules:

- Resolved secret values may exist only inside an explicit runtime edge or explicit smoke edge.
- Runtime-only values derived from provider execution must be dropped or redacted before a public result, durable record, audit record, or readiness projection is created.
- Public observability may describe credential status only through safe descriptors such as configured, missing, invalid, disabled, blocked, or redacted.
- Public observability must never serialize a runtime-only value.
- Package-root import must stay inert and must not resolve credentials, read environment values, construct clients, open network connections, or start runtime behavior.

## Raw payload containment

Raw payloads belong only to explicit edge zones. They are never the public observability contract.

Future work must preserve these containment rules:

- Provider edge code may inspect raw external payloads only long enough to normalize safe references, classify intent, attach or derive correlation, and drop or quarantine unsupported fields.
- Runtime capability edge code may inspect raw runtime results only long enough to classify status and produce a safe bounded summary.
- Deployment secret or config zones may validate raw values only inside explicit deployment-owned edges and must expose only redacted descriptors.
- Safe durable records, public DTOs, readiness summaries, admin summaries, and audit projections must receive normalized values only.
- Quarantine, if needed later, must be deployment-owned and must not become a generic public adapter record.

## No-leak constraints

Future W26 implementation work must preserve no-leak safety across source, docs, tests, fixtures, public exports, public DTOs, public summaries, release reports, and smoke summaries.

Public observability and correlation surfaces must not leak:

- secret or credential material;
- raw config material;
- raw provider payloads;
- raw runtime or tool payloads;
- local paths or host-specific details;
- stack traces;
- raw logs or copied terminal output;
- provider SDK or client internals;
- private core implementation paths;
- unbounded external error messages;
- connector, tool, or automation internals.

Safe public output must stay JSON-serializable, bounded, redacted, and explicit about status. Skipped, blocked, ready-to-attempt, or ready-to-run observability states must not be reported as pass states.

## Static guard needs

Future static guards should protect real architectural invariants, not temporary orchestration bookkeeping.

W26 static guard coverage should be split as follows:

- W26D1 should guard W26B contract type vocabulary against unsafe public field names, raw payload escape hatches, non-redacted runtime-value names, provider client handles, and unbounded diagnostic fields.
- W26D2 should guard W26C fake or inert sink and port surfaces against exporter behavior, network behavior, credential resolution, provider SDK construction, runtime startup, raw payload persistence, and unsafe public summaries.
- Broad shared static guards are reserved for W26E only, after all W26 leaves are merged.
- Static guards must not require real network, real credentials, provider accounts, local environment values, or production infrastructure.

## Max-parallel follow-up matrix

| Slice | Future scope | Ownership boundary | Non-goals | Fan-in posture |
| --- | --- | --- | --- | --- |
| W26B | Observability and correlation contract types | Safe type vocabulary for references, event projections, summaries, statuses, reason codes, and component refs | No exporters, no metrics backend, no runtime behavior, no package-root export | Leaf only; no shared files |
| W26C | Fake or inert observability event sink or correlation port | Explicit fake or inert port that can collect safe projections through direct calls | No production sink, no telemetry pipeline, no default network, no runtime startup, no provider client | Leaf only; no shared files |
| W26D1 | Static guard for W26B | Contract-type no-leak and raw-payload boundary checks | No runtime tests, no package integration, no broad shared guard | Leaf only; unique guard file unless prompt says otherwise |
| W26D2 | Static guard for W26C | Fake or inert sink no-leak, no-network, no-exporter, no-client-construction checks | No runtime exporter tests, no provider execution, no production behavior | Leaf only; unique guard file unless prompt says otherwise |
| W26E | Fan-in after W26B, W26C, W26D1, and W26D2 are merged | Integrate public surfaces, update shared docs, and verify combined no-leak posture | No production observability readiness claim, no real-provider success claim, no telemetry pipeline | Fan-in only after all W26 leaves are merged |

## Shared file reservation for W26E only

The following shared surfaces are reserved for W26E only:

- package root files;
- local barrels;
- package metadata;
- docs/roadmap/current-development-state.md;
- README;
- broad static guards.

W26B, W26C, W26D1, and W26D2 must not pre-empt W26E by editing those shared surfaces. If a leaf cannot complete without touching one of them, it should stop and report the scope conflict instead of expanding the slice.

## Fan-in rules

W26E may run only after all W26 leaves are merged or explicitly abandoned by the Orchestrator.

W26E responsibilities:

- verify that W26B and W26C use compatible safe status, severity, component, reason-code, event-reference, and correlation-reference vocabulary;
- verify that W26D1 and W26D2 cover the new public surfaces without false production-readiness claims;
- update reserved shared surfaces only if assigned by the W26E prompt;
- preserve package-root inertness and no default side effects;
- preserve provider acknowledgement and business success separation;
- preserve permission-before-token-consume auditability for callback-related observability;
- preserve replay and idempotency correlation for duplicate and replay paths;
- preserve no-leak behavior across public projections and docs.

W26E must not introduce production telemetry, logging, tracing, metrics, runtime startup, provider SDK/client construction, default network behavior, credential loading, deployment behavior, production observability readiness, or real-provider success claims unless a later contract explicitly re-scopes the phase.

## Acceptance checklist for this plan

This plan is complete when future workers can identify:

- who creates or propagates a correlation reference;
- what safe correlation vocabulary is allowed;
- what a safe event or audit projection may contain;
- what public observability must never contain;
- how runtime values and raw payloads remain contained;
- how W26B, W26C, W26D1, W26D2, and W26E can run without shared-file conflicts;
- which shared surfaces are reserved for W26E only;
- why this wave remains planning and fake or inert boundary work, not production observability readiness.
