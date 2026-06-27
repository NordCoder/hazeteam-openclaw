# W24A Runtime Mode Boundary Plan

## Status and posture

W24A is a planning-only roadmap for future runtime mode work. It defines ownership boundaries, follow-up slices, static guard expectations, and fan-in rules for listener, webhook, polling, daemon/supervision, explicit startup, and opt-in real edge work.

The repository remains adapter-ready-for-real-system-integration under explicit gates and not production-ready.

This plan does not implement runtime behavior. It adds no listener, webhook server, polling loop, daemon, timers, provider client, credential loader, network call, server startup, deployment behavior, package export, CI wiring, script, test, durable backend, OCA behavior, LifeOS behavior, sidecar behavior, or production readiness claim.

## Planning boundary

W24A owns only this roadmap document. Future runtime work must remain explicitly assigned by later prompts and must preserve the default no-network and no-secret posture unless a future real-edge slice is explicitly gated.

This phase may describe future work, but it must not be treated as evidence that any runtime mode exists. Ready-to-attempt remains below pass. Provider acknowledgement remains distinct from business success. A skipped, blocked, or ready-to-run smoke state is not a real-provider success.

## Runtime mode ownership boundaries

### Listener mode

Future listener-mode work should own the adapter-facing contract for consuming provider-originated inbound events through an explicitly supplied listener boundary. The listener mode may define safe lifecycle states, safe readiness projections, and typed handoff into the inbound pipeline.

Listener ownership must not include provider SDK construction, default network listeners, automatic process startup, production health endpoints, credential loading, durable backend implementation, OCA execution, LifeOS behavior, or sidecar supervision unless those items are explicitly assigned to the same future slice.

### Webhook mode

Future webhook-mode work should own the adapter-facing contract for receiving provider callback or update events through an explicitly supplied webhook edge. It may define safe webhook mode descriptors, redacted readiness, callback permission handoff, duplicate-safe planning hooks, and raw-payload containment requirements.

Webhook ownership must not include starting an HTTP server, binding ports, registering provider webhooks, loading TLS or platform secrets, implementing production deployment behavior, or treating provider callback acceptance as business success unless a future prompt explicitly assigns those behaviors and tests.

### Polling mode

Future polling-mode work should own the adapter-facing contract for pull-based inbound event retrieval through an explicitly supplied polling boundary. It may define inert lifecycle states, safe polling intent descriptors, backoff vocabulary, and handoff requirements into normalized channel events.

Polling ownership must not include timers, loops, sleeps, scheduler behavior, provider SDK calls, network calls, default background work, durable cursor storage, or production retry behavior unless explicitly assigned by a future implementation slice.

### Daemon and supervision boundary

Future daemon or supervision work should own process-level lifecycle boundaries only after listener, webhook, and polling contracts are safe, inert, and guarded. It may define how a runtime host is supervised, stopped, reported, and made observable through safe redacted status.

Daemon ownership must not include unassigned provider clients, production deployment automation, process managers, containers, system services, sidecar behavior, OCA runtime behavior, LifeOS behavior, or production support claims.

### Explicit startup boundary

Future startup work should require an explicit operator or host call before any runtime mode can begin. Startup must remain opt-in and must report safe readiness without leaking secrets, raw provider payloads, runtime-only values, private paths, stack traces, SDK objects, client instances, or network details.

No package import, package-root export, constructor, config read, or readiness projection may start runtime behavior by default. Package roots must remain side-effect-free.

### Opt-in real edge boundary

Future opt-in real edge work should remain separate from default checks and tests. It may prove a narrow real edge only when explicit operator acknowledgement, configured redacted credential status, open network gate, injected provider/runtime ports, safe operation class, safe refs, and supplied redacted attempt evidence are all present.

A future real edge must not convert ready-to-attempt, ready-to-run, skipped, blocked, provider-acknowledged-only, or cleanup-incomplete states into a pass. Real-provider success requires explicit evidence for the exact assigned edge and must keep provider acknowledgement separate from internal business success.

## Outside this phase and future leaf phases unless explicitly assigned

The following areas stay outside W24A and outside future W24 leaf phases unless a prompt explicitly assigns them:

- provider SDK or client construction;
- credential loading, secret resolution, or default config loading;
- production deployment behavior;
- production runtime behavior;
- production durable backend implementation;
- production storage readiness;
- database, cache, queue, migration, backup, restore, or replay runtime behavior;
- OCA behavior;
- LifeOS or domain product behavior;
- sidecar behavior;
- package-root exports, package metadata, and shared barrels before fan-in;
- broad static guards before assigned guard slices;
- CI, scripts, generated output, or distribution artifacts.

## Non-goals

W24A does not add or claim:

- runtime startup in this phase;
- listener implementation;
- webhook implementation;
- polling implementation;
- timers, loops, schedulers, or daemons;
- default runtime behavior;
- default network behavior;
- default secret or config loading;
- provider SDK or client construction;
- durable backend behavior;
- production runtime readiness;
- production deployment readiness;
- production storage readiness;
- OCA readiness;
- LifeOS readiness;
- sidecar readiness;
- real-provider success;
- production readiness.

## Future static guard requirements

Future W24 guard slices should protect architecture, not orchestration bookkeeping. Guards should focus on public-surface and runtime-overreach risks created by the assigned W24 source slices.

Expected guard coverage includes:

- runtime mode contract files do not import provider SDKs, network modules, process managers, timers, or credential loaders;
- fake/inert lifecycle ports remain explicit-call only and do not start listeners, webhook servers, polling loops, daemons, or background timers;
- package-root imports remain side-effect-free;
- public readiness and lifecycle outputs remain JSON-safe and redacted;
- raw provider payloads, callback payloads, runtime-only values, secrets, config values, paths, stacks, SDK objects, client instances, network responses, and tool internals do not appear in public outputs;
- ready-to-attempt and ready-to-run vocabulary is not treated as pass vocabulary;
- provider acknowledgement vocabulary remains separate from business success vocabulary;
- OCA, LifeOS, and sidecar surfaces are not advanced by runtime-mode leaves;
- production-ready and production-deployment-ready claims remain absent unless a future production gate explicitly proves them.

Static guard work should be narrow to the W24 leaf it protects. Broad cross-package cleanup, package-root assertions, and release classifier assertions belong to W24E fan-in unless a future prompt assigns them earlier.

## Max-parallel follow-up matrix

| Slice | Ownership | Allowed intent | Shared surfaces | Must not do |
| --- | --- | --- | --- | --- |
| W24B | Runtime mode contract types | Define safe type-only or inert contract vocabulary for listener, webhook, polling, daemon/supervision, explicit startup, and opt-in real edge boundaries | No package root, no package metadata, no global docs, no broad guards | No runtime startup, no timers, no network, no provider client, no credential loading, no durable backend, no OCA/LifeOS/sidecar behavior |
| W24C | Fake/inert runtime lifecycle port | Define an explicit fake/inert lifecycle port or factory that can model lifecycle states without effects | No package root, no package metadata, no global docs, no broad guards | No listener/webhook/polling implementation, no daemon, no background loop, no server, no network, no secret loading, no real-provider pass claim |
| W24D1 | Static guard for W24B | Add narrow static checks for W24B public contract safety and no-leak vocabulary | W24B guard files only unless assigned otherwise | No source implementation, no fan-in exports, no package-root changes, no unrelated static cleanup |
| W24D2 | Static guard for W24C | Add narrow static checks for W24C fake/inert lifecycle safety and no runtime side effects | W24C guard files only unless assigned otherwise | No source implementation beyond assigned guard needs, no fan-in exports, no package-root changes, no unrelated static cleanup |
| W24E | Fan-in after all W24 leaves are merged | Integrate already merged W24 leaves, resolve shared surfaces, and update status docs only after all W24 leaves are available | W24E owns reserved shared files | No new runtime behavior, no new provider clients, no production deployment behavior, no production readiness claim unless explicitly assigned and proven |

## Shared file reservations for W24E only

The following shared surfaces are reserved for W24E only:

- package root exports;
- local barrels that integrate multiple W24 leaves;
- package metadata;
- docs/roadmap/current-development-state.md;
- README files;
- broad static guards;
- release classifier wording;
- cross-leaf status consolidation.

W24B, W24C, W24D1, and W24D2 should avoid these shared files unless a future prompt explicitly changes the reservation. If a leaf cannot complete without a reserved shared surface, it should stop that part and report the need for fan-in rather than touching the shared file.

## Fan-in rules

W24E may run only after W24B, W24C, W24D1, and W24D2 are merged or otherwise explicitly available to the fan-in prompt. W24E should verify that each leaf remains within its assigned scope before exposing any combined surface.

W24E may update reserved shared surfaces only to integrate already completed W24 work. It must not invent missing leaf behavior, convert planning vocabulary into runtime behavior, start default network paths, add credential loading, add production deployment behavior, or claim real-provider success.

## Public example policy

This roadmap intentionally includes no executable runtime startup examples. Future public examples, if assigned, must be redacted, JSON-safe, secret-free, path-free, raw-payload-free, and must not include live provider identifiers, tokens, credentials, private repository data, stack traces, SDK instances, or network responses.
