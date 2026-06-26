# W20A Downstream Runtime Ownership Plan

## Status and scope

W20A is planning-only documentation. It translates preserved Wave 5 limitations into explicit downstream ownership tracks, ordering, dependencies, non-goals, worker-prompt rules, and safety gates.

Wave 5 is closed as an adapter evidence wave. The current repository classification remains adapter-ready-for-real-system-integration under explicit gates.

The repository remains not production-ready. No production runtime behavior is implemented by this plan.

This plan does not implement source, tests, CI, scripts, package metadata, package locks, runtime behavior, provider behavior, credential loading, deployment behavior, sidecar behavior, OCA execution, LifeOS behavior, or durable backend behavior.

## Starting evidence after W19H

The downstream plan starts from the following merged baseline:

- W18E3 final readiness classification: the repository is classified as adapter-ready-for-real-system-integration under explicit gates, below production readiness, with downstream overlays still future-scoped.
- W19H final Wave 5 closure report: Wave 5 is closed as repository evidence and does not create production runtime behavior, deployment readiness, default real-provider execution, default credential loading, OCA readiness, LifeOS readiness, sidecar readiness, durable backend production readiness, or real-system validation by static tests alone.
- W19A real integration attempt contract: real-system attempts are represented as explicit-gate-only descriptors where ready-to-attempt is not pass and provider acknowledgement alone is not business success.
- W19B runtime credential binding port: runtime credentials bind only through an injected port, runtime values remain runtime-only, and public projections remain redacted/json-safe.
- W19C opt-in smoke harness runner: smoke-harness behavior is exercised through fakes and preserves skipped, blocked, ready-to-run, acknowledgement-only, passed, and failed-safe distinctions without default real-provider execution.
- W19D and W19D3 Telegram integration harness public export and metadata fan-in: the Telegram package root exposes the integration harness while keeping non-production metadata, no default network, no default client construction, no listener/webhook/polling runtime, and inert effects.
- W19E runtime credential binding public export: the runtime-values barrel exports the runtime-value boundary and runtime credential binding port without default secret loading.
- W19F2 static public-surface regression guard: Wave 5 public-surface invariants are protected statically; this guard is not runtime validation and not real-system validation.
- W19G documentation closure: release-facing docs preserve the current guarded classification and production non-claims.

## Downstream workstreams

Each downstream track must remain separately assignable. A future prompt may split one track into multiple leaf slices, but it must not combine unrelated runtime ownership areas without an explicit fan-in slice.

| Track | Scope | Bounded outcome |
| --- | --- | --- |
| W20 — Downstream ownership and dependency planning | Planning docs for post-Wave-5 ownership, dependencies, gates, and prompt rules. | Planning-only map for future slices. |
| W21 — Durable adapter state planning and fake/inert storage boundaries | Adapter-owned topic binding, callback token, delivery attempt, inbound idempotency, replay, correlation, readiness snapshot, and fake/inert storage boundary planning. | Durable-state ownership plan and fake/inert boundary expectations; no production durable backend. |
| W22 — Explicit credential loader boundary planning | Credential loader boundary and runtime-value ownership plan. | Explicit injected/edge-owned credential-loader plan; no real credential loading by default. |
| W23 — Provider/client runtime boundary planning | Provider client runtime boundary and factory/injection ownership plan. | Explicit provider/client runtime boundary plan; no default SDK/client construction. |
| W24 — Listener/webhook/polling runtime planning | Listener, webhook, polling, callback HTTP endpoint, daemon, scheduler, and process-supervision ownership plan. | Runtime-mode planning only; no default daemon/server/listener/polling startup. |
| W25 — Deployment and operations documentation planning | Deployment/operator docs, health/readiness, observability, secret profile, runbook, and release-gate documentation planning. | Deployment documentation plan; no deployment-ready claim. |
| W26 — Sidecar boundary planning | Optional sidecar boundary, transport, lifecycle, and no-leak planning. | Sidecar boundary plan; no sidecar runtime readiness claim. |
| W27 — OCA runtime bridge planning | OCA bridge ownership, capability boundary, credential boundary, and validation planning. | OCA bridge plan; no OCA runtime readiness claim. |
| W28 — LifeOS/domain product bridge planning | LifeOS/domain product ownership, adapter-to-domain bridge, and product-readiness evidence planning. | Product bridge plan; no LifeOS/domain product readiness claim. |
| W29 — Real-system validation plan | Real-system validation sequencing distinct from static, fake, and opt-in smoke evidence. | Validation evidence plan; no real-provider success claim unless future execution evidence proves it. |

## Ownership matrix

This matrix assigns future ownership lanes only. It does not authorize source or runtime changes by W20A.

| Future track | Owned package/doc area | Allowed evidence type | Forbidden behavior | Prerequisites | Acceptance signal | Merge-gate expectation |
| --- | --- | --- | --- | --- | --- | --- |
| W20 | `docs/roadmap/**` planning files assigned by prompt. | Docs-only planning, ownership matrix, dependency map, prompt rules. | Source, tests, package metadata, release classifier rewrites, runtime behavior. | W19H final closure present. | Plan states current classification, non-goals, and downstream separation. | Diff limited to assigned roadmap docs; no production overclaims; no fan-in unless assigned. |
| W21 | Future adapter durable-state docs and, only when later assigned, fake/inert adapter-state files. | Planning docs first; later fake/inert storage contracts, unit tests, and static no-leak checks if explicitly scoped. | Production database/cache/queue, migrations, backup, restore, replay CLI, recovery runtime. | W20 ownership plan; existing W17H4 fake durable replay evidence. | Fake/inert boundary is explicit and production durable backend remains unclaimed. | No production store wiring; no shared package-root fan-in without assigned fan-in slice. |
| W22 | Future runtime credential-loader docs and explicit edge-owned credential-loader boundary files if assigned. | Planning docs first; later injected port tests, redacted projection tests, no-leak checks. | Default secret loading, direct library package `process.env` secret reads, secret manager integration by default, credential rotation runtime. | W18A runtime value boundary; W19B/W19E credential binding port and public export. | Public output remains redacted/json-safe and loader ownership is explicit. | No default credential loading; no secrets in tests, docs, reports, or outputs. |
| W23 | Future provider/client runtime boundary docs and explicit provider-client edge files if assigned. | Planning docs first; later injected-port/factory tests and redacted provider-result tests. | Default SDK/client construction, default network calls, provider acknowledgement treated as business success. | W18B provider client port; W19A real integration attempt contract; W19C smoke harness evidence. | Provider execution remains injected and provider acknowledgement/business success stay separate. | Package roots inert; no network/client imports in safe roots; fan-in required for shared exports. |
| W24 | Future listener/webhook/polling runtime docs and explicitly assigned runtime-edge files. | Planning docs first; later fake/dry-run lifecycle tests and secret-gated runtime descriptors. | Default daemon, webhook server, callback HTTP endpoint, polling loop, timers, scheduler, process supervision. | W18D listener/webhook/polling boundary; W23 provider/client planning where provider execution is needed. | Runtime modes are explicit and default import/check paths remain inert. | No default startup; no listener/webhook/polling root side effects; no shared fan-in without assignment. |
| W25 | Future deployment/operator docs under assigned operations/release paths. | Documentation planning, runbook/checklist drafts, release-gate wording, static docs review. | Deployment-ready claim, production runtime claim, CI/deployment workflow changes unless explicitly assigned. | W20 plan; W21-W24 planning for capability boundaries being documented. | Docs state deployment gaps and do not imply deployability. | No CI/scripts/package changes; release docs changed only by assigned release-doc slice. |
| W26 | Future sidecar boundary docs and explicit sidecar interface files if assigned. | Planning docs first; later fake/inert sidecar contract tests if scoped. | Sidecar runtime readiness claim, sidecar server/client runtime, sidecar deployment behavior. | W20 plan; W24/W25 planning for runtime/deployment boundaries. | Sidecar remains optional and not readiness proof until future evidence exists. | OCA/LifeOS/source fan-in prohibited unless assigned; no sidecar runtime startup. |
| W27 | Future OCA bridge docs and explicit OCA wrapper bridge files if assigned. | Planning docs first; later fake/inert OCA bridge tests and no-leak checks if scoped. | Real OCA client execution, OCA credential loading by default, OCA readiness claim. | W20 plan; W22 credential planning; W23 provider/client planning; W26 if sidecar is required. | OCA bridge remains parked or explicitly bounded and not adapter-readiness proof. | No OCA runtime readiness wording; no product fan-in without assigned fan-in slice. |
| W28 | Future LifeOS/domain bridge docs and explicit domain bridge files if assigned. | Planning docs first; later descriptor/fake bridge tests if scoped. | LifeOS/domain product behavior, product readiness claim, product-specific command/policy expansion without explicit scope. | W20 plan; W27 only if OCA bridge is an input; adapter boundary evidence remains current. | Domain bridge is explicit and does not weaken generic adapter safety. | No LifeOS readiness wording; no product runtime behavior in generic adapter slices. |
| W29 | Future validation docs, evidence matrix, and explicitly assigned validation harness files if scoped. | Planning docs first; later secret-gated validation evidence with redacted outputs and honest skipped/blocked/pass states. | Treating static/fake/smoke evidence as real-system validation, real-provider success overclaim, unsafe output. | W21-W24 boundaries planned; W25 documentation gates; W22/W23 gates where provider execution is attempted. | Validation criteria distinguish static, fake, opt-in smoke, real-system attempt, and production evidence. | No pass without supplied redacted evidence, provider acknowledgement, and business success; no cross-track fan-in without assignment. |

Cross-track fan-in is forbidden unless a future prompt explicitly assigns a fan-in slice with owned shared files, prerequisites, and merge-gate expectations. A leaf that discovers it needs shared package roots, package metadata, CI, release docs, global static tests, OCA/LifeOS/shared runtime files, or sibling outputs must stop and report the fan-in need.

## Dependency ordering

Future work should follow this safe ordering:

1. Planning before source changes.
2. Fake/inert boundaries before real runtime behavior.
3. Injected ports before default wiring.
4. Redacted projections before public output.
5. Secret-gated tests before real-provider attempts.
6. Docs and static guards before merge fan-in.
7. Real-system validation planning before claiming validation evidence.
8. No production-ready claim until an explicit future release gate says production readiness is proven.

Recommended downstream order:

1. W20 planning and ownership confirmation.
2. W21 durable-state planning and fake/inert storage boundaries.
3. W22 credential-loader boundary planning.
4. W23 provider/client runtime boundary planning.
5. W24 listener/webhook/polling runtime planning.
6. W25 deployment and operations documentation planning.
7. W26 sidecar boundary planning when sidecar is required.
8. W27 OCA runtime bridge planning after credential/provider/runtime boundaries are explicit.
9. W28 LifeOS/domain product bridge planning after OCA/domain prerequisites are explicit.
10. W29 real-system validation plan after the relevant runtime boundaries and documentation gates are known.

## Non-goals for W20A

W20A does not implement or claim:

- production OpenClaw SDK/client wiring;
- production Telegram/OpenClaw provider runtime;
- listener, webhook server, callback HTTP endpoint, polling loop, daemon, scheduler, timers, or process supervision;
- production credential loader, secret manager integration, runtime-value loader, or credential rotation;
- production deployment runtime or operator runtime;
- production durable backend, migrations, backup, restore, replay CLI, or recovery runtime;
- sidecar support or sidecar runtime readiness;
- real OCA client execution or OCA runtime readiness;
- LifeOS/domain-product behavior or product readiness;
- real-provider success;
- production readiness.

## Safety and no-leak constraints

Future slices must preserve no-leak discipline for public outputs, docs examples, smoke summaries, readiness summaries, reports, errors, and durable safe records.

The following material must not appear in public output:

- raw provider payloads;
- raw callback payloads;
- secrets, tokens, passwords, API keys, credentials, or resolved credential values;
- endpoints;
- runtime-only values;
- SDK/client handles;
- provider handles;
- stack traces;
- local paths or filesystem paths;
- raw logs, raw diffs, raw command output, stdout, or stderr;
- connector/tool internals.

Future public outputs should use redacted/json-safe projections only: safe refs, bounded descriptors, safe diagnostic categories, explicit blocked/skipped statuses, provider acknowledgement fields separate from business-success fields, and redacted failure summaries.

## Worker-prompt rules for future slices

Future worker prompts should include these rules unless a later manifest supersedes them:

- one slice per worker;
- exact worker chat name;
- repository, branch, base branch, expected base SHA, and target branch;
- explicit owned files and directories;
- explicit forbidden files and directories;
- no broad repo-recursive scans unless the slice is a static guard and explicitly owns them;
- no docs/source/test/package metadata fan-in unless assigned;
- no sibling-branch dependency unless assigned as a stacked or fan-in slice;
- no production readiness language;
- no deployment readiness language unless a future deployment release gate explicitly proves it;
- no default network behavior;
- no default secret loading;
- no default SDK/client construction;
- no default listener/webhook/polling/daemon startup;
- no OCA, LifeOS, sidecar, deployment, production durable backend, or product-readiness claim unless explicitly implemented, tested, and release-gated by a future slice;
- final report must include changed-file scope, safety, tests/checks, and self-review fields.

Future prompts must also require workers to report commands honestly. If GitHub connector command execution is unavailable, checks such as `npm run test:static` and `npm run check` must be reported as not run with the connector limitation reason, not as passed.

## Current classification guardrail

This plan preserves the current repository posture: adapter-ready-for-real-system-integration under explicit gates and not production-ready.

The plan is an ownership and dependency document only. It does not alter the Wave 5 evidence baseline, does not update release readiness, and does not remove any known limitation.