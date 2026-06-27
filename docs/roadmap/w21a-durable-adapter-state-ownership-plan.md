# W21A Durable Adapter State Ownership Plan

## Status and scope

W21A is planning-only documentation.

W20A assigned W21 as the durable adapter state planning and fake/inert storage boundary track. This plan translates that track into future ownership, state categories, allowed evidence, forbidden behavior, dependency order, and worker-slice boundaries.

The current repository classification remains adapter-ready-for-real-system-integration under explicit gates.

The repository remains not production-ready.

This plan does not implement source, tests, package metadata, package locks, CI, scripts, runtime behavior, production database behavior, cache behavior, queue behavior, migrations, backup, restore, replay CLI, recovery runtime, provider behavior, credential loading, deployment behavior, sidecar behavior, OCA execution, LifeOS/domain behavior, or durable backend behavior.

No durable backend, production storage, migration, replay CLI, backup/restore, or recovery runtime is implemented by this plan.

## Starting baseline after W20A

The W21 durable-state plan starts from the current merged baseline:

- W18E3 final readiness classification: the adapter is classified as adapter-ready-for-real-system-integration under explicit gates, below production readiness, with production runtime, deployment, durable backend, sidecar, OCA, and LifeOS/domain work still future-scoped.
- W19H final Wave 5 closure report: Wave 5 is closed as repository evidence and does not create production runtime behavior, deployment readiness, default real-provider execution, default credential loading, OCA readiness, LifeOS readiness, sidecar readiness, durable backend production readiness, or real-system validation by static tests alone.
- W20A downstream runtime ownership plan: W21 is assigned to durable adapter state planning and fake/inert storage boundaries, with no production durable backend, migrations, backup, restore, replay CLI, or recovery runtime.
- W17H4 durable replay fake E2E is historical fake/inert evidence for inbound idempotency, delivery replay, callback replay, correlation, and safe fake store lifecycle. It is not production durable backend evidence.
- W17H5 no-leak matrix is preserved no-leak evidence for public outputs and examples. It is not provider execution evidence.
- W19F2 static public-surface regression guard is static guard evidence only. It is not runtime validation, durable backend validation, or real-system validation.
- W19A and W19C real integration harness and smoke harness evidence remain explicit-gate and opt-in only. They do not prove a durable backend, production storage, real-provider success, or production runtime behavior.

## Durable adapter state categories

The following categories define future adapter-owned state only. W21A does not implement any category.

| State category | Owner | Purpose | Allowed fake/inert representation | Forbidden production behavior | Public projection and no-leak expectation | Future acceptance signal |
| --- | --- | --- | --- | --- | --- | --- |
| Topic binding state | Future adapter durable-state contract area; fake evidence may live in future testkit/fake-store slices. | Preserve canonical channel, chat, and thread binding authority independent of topic display title. | In-memory fake records with safe refs, disabled/archive status, display metadata, and deterministic lookup behavior. | No production database/cache/queue integration, migration, auto-discovery, real provider lookup, or title-as-authority behavior. | Public output may expose safe binding refs and status only; no raw provider payloads, endpoints, tokens, handles, or runtime-only values. | Fake lookup/update/disable tests prove safe refs, title non-authority, duplicate-safe behavior, and redacted projection. |
| Callback token state | Future adapter callback/token contract area; fake evidence may live in future testkit/fake-store slices. | Track expected token context, safe token refs, verification status, and lifecycle without exposing token values. | In-memory fake token records with opaque token refs, expected context refs, expiry markers, and safe statuses. | No production token store, no real token generation, no credential loading, no provider callback payload persistence, and no token-value public output. | Public output may expose callback/token refs and status only; no raw callback payloads or token values. | Fake verify/expire/replay tests prove token values stay private and malformed/unsafe inputs fail safe. |
| Callback permission/consume state | Future adapter callback permission boundary area; fake evidence may live in future testkit/fake-store slices. | Preserve permission-before-consume sequencing and replay-safe consume decisions. | In-memory fake permission decisions and consume markers keyed by safe callback/token/action refs. | No production policy engine, no product action dispatch, no production idempotency runtime, and no consume before permission and verification. | Public output may expose decision status and safe reason codes only; no raw callback payloads, actor internals, or policy internals. | Fake E2E proves permission denial prevents consume and replay consume is suppressed. |
| Delivery attempt state | Future adapter delivery attempt contract area; fake evidence may live in future testkit/fake-store slices. | Track delivery attempt refs, idempotency refs, provider acknowledgement, business completion split, retryability, and safe failure summary. | In-memory fake delivery-attempt records and replay-safe fake executor results. | No production provider delivery runtime, no production queue/outbox, no retry scheduler, no real provider response persistence, and no duplicate provider call on replay. | Public output may expose safe delivery refs, provider acknowledgement status, business status, retryability, and redacted failure only. | Fake replay tests prove duplicate attempts suppress effects and provider acknowledgement remains separate from business success. |
| Inbound idempotency state | Future adapter inbound idempotency contract area; fake evidence may live in future testkit/fake-store slices. | Prevent duplicate inbound events from dispatching duplicate command/runtime/delivery/callback effects. | In-memory fake reservation, processing marker, completed outcome, and duplicate suppression records. | No production idempotency runtime, no real listener/webhook/polling runtime, no raw provider event persistence, and no command dispatch as part of W21 planning. | Public output may expose safe event/idempotency/correlation refs and duplicate status only. | Fake tests prove reserve/mark/complete lifecycle and duplicate suppression without raw provider payload storage. |
| Replay cursor/state | Future adapter replay-state contract area; fake evidence may live in future testkit/fake-store slices. | Track bounded replay cursors, replay modes, replay ranges, and suppression evidence for deterministic recovery planning. | In-memory fake cursors and replay summaries using safe refs and bounded status values. | No replay CLI, no production recovery runtime, no backup/restore, no provider fetch replay, and no operational restore behavior. | Public output may expose safe replay refs, cursor status, and bounded counts/categories only. | Fake replay tests prove cursor progression and safe blocked/duplicate/complete statuses without raw logs or payloads. |
| Correlation state | Future adapter correlation/observability contract area. | Preserve traceability across inbound, callback, delivery, runtime, readiness, and replay records without exposing internals. | In-memory fake correlation refs, component refs, operation classes, status, severity, and redacted diagnostic categories. | No production tracing backend, no raw logs/stdout/stderr, no stack traces, no local paths, and no connector/tool internals. | Public output may expose bounded correlation refs and redacted categories only. | Static/no-leak tests and fake flow tests prove correlation refs propagate while unsafe material is omitted. |
| Real integration attempt evidence state | Future Telegram integration-harness evidence area; durable storage remains fake/inert unless a future production slice explicitly owns it. | Preserve explicit-gate attempt descriptors, supplied redacted evidence status, provider acknowledgement, business result, and no-leak status. | In-memory fake evidence summaries and redacted attempt snapshots with safe refs. | No real-provider success claim, no durable provider transcript, no raw provider response, no default network behavior, and no production storage of attempts. | Public output may expose ready/blocked/passed distinctions, provider acknowledgement, business result, and redacted evidence refs only. | Harness tests prove ready-to-attempt is not pass, provider acknowledgement alone is not success, and unsafe evidence fails safe. |
| Readiness snapshot state | Future adapter readiness snapshot contract area. | Summarize durable-state readiness, fake-store posture, migration absence, and production non-claim status for release and operator review. | In-memory fake readiness snapshots with component refs, blocked statuses, and bounded issue codes. | No production health endpoint, no deployment readiness, no live store connection, no production migration state, and no readiness overclaim. | Public output may expose safe component refs, readiness status, and issue categories only. | Static/readiness tests prove snapshot is json-safe and preserves adapter-ready-for-real-system-integration under explicit gates and not production-ready wording. |
| Redacted diagnostic/audit summary state | Future adapter diagnostic/audit summary contract area. | Preserve bounded audit summaries for state lifecycle decisions while excluding protected operational material. | In-memory fake audit summaries with safe refs, event class, actor/category refs, status, and redacted diagnostics. | No production audit log, no raw logs, no provider/client handles, no stack traces, no local paths, no endpoints, and no connector/tool internals. | Public output may expose redacted/json-safe summaries only. | No-leak static/fake tests prove diagnostics reject or redact protected material. |

## Ownership matrix

This matrix assigns future ownership boundaries. It does not authorize W21A source, test, package, or release-doc changes.

| State category | Owning future package or doc area | Allowed future fake/inert evidence | Forbidden behavior | Dependency | Future test/guard expectation | Fan-in requirement |
| --- | --- | --- | --- | --- | --- | --- |
| Topic binding state | Future `@hazeteam/openclaw-adapter` durable-state contract files; future `@hazeteam/openclaw-testkit` fakes only when assigned. | Fake binding store contract, safe fixture records, unit/fake E2E checks. | Production store, package-root export, provider lookup, title authority, migration. | W21A plan before W21B contract types. | Unit/fake tests for safe refs, no raw payloads, and title non-authority. | Required for package-root export or shared public surface only; leaf must not edit broad roots. |
| Callback token state | Future adapter callback durable contract files and testkit fakes. | Fake token records and replay-safe lifecycle tests. | Production token persistence, real token generation, raw callback persistence, token-value public output. | W21B contract types before W21C fake store ports. | Unit/fake tests for verify/expire/replay no-leak behavior. | Required before package-root export or shared callback-state barrel exposure. |
| Callback permission/consume state | Future adapter callback permission state files and fake stores. | Fake permission decision and consume marker records. | Production policy runtime, product dispatch, consume-before-permission, default runtime behavior. | Callback token contracts before consume state boundary. | Fake E2E confirms permission-before-consume and replay denial. | Required for shared callback fan-in or acceptance matrix expansion. |
| Delivery attempt state | Future adapter delivery-attempt state contract files and testkit fakes. | Fake delivery-attempt records, replay-safe executor, idempotent write/read checks. | Production queue/outbox, provider network, retry scheduler, production storage. | W21B contract types before W21C ports; provider-client boundary remains injected. | Fake tests for duplicate suppression and provider acknowledgement/business split. | Required for package-root export, broad static guard, or shared delivery fan-in. |
| Inbound idempotency state | Future adapter inbound idempotency state contract files and testkit fakes. | Fake reservation, marker, completed, and duplicate records. | Listener/webhook/polling runtime, production idempotency runtime, raw inbound persistence. | W21B contracts before W21D replay/idempotency boundary. | Fake tests for reserve/mark/complete and no duplicate effect signals. | Required for acceptance aggregation or shared public exports. |
| Replay cursor/state | Future adapter replay-state contract files and docs. | Fake cursor, replay window, blocked/replayed/complete summaries. | Replay CLI, recovery runtime, backup/restore, provider fetch replay. | Idempotency semantics before replay cursor semantics. | Fake tests for cursor progression and no unsafe output. | Required for shared replay public surface or docs fan-in. |
| Correlation state | Future adapter correlation docs/contracts and fake diagnostics. | Fake correlation propagation checks and redacted summary fixtures. | Production tracing backend, raw logs/stdout/stderr, stack traces, local paths. | State categories define safe refs before correlation fan-out. | Static/no-leak guard for public correlation summaries. | Required when correlation spans multiple package areas. |
| Real integration attempt evidence state | Future transport integration-harness evidence docs/contracts. | Fake redacted attempt snapshots and explicit-gate result summaries. | Real-provider success claim, raw provider transcript, default network, production durable storage. | W19A/W19C evidence remains input; W21A before storage contracts. | Harness guard confirms ready-to-attempt not pass and provider acknowledgement/business split. | Required before broad harness export changes or release-doc claims. |
| Readiness snapshot state | Future adapter readiness snapshot docs/contracts. | Fake snapshots with component refs, blocked statuses, and issue categories. | Production health endpoint, deployment readiness, live store connection, production migration state. | Durable categories before snapshot aggregation. | Static/readiness guard for json-safe projection and guarded classification wording. | Required for aggregate readiness fan-in or current-state/release-doc update. |
| Redacted diagnostic/audit summary state | Future adapter diagnostic/audit docs/contracts and testkit fixtures. | Fake audit summaries with safe refs and redacted diagnostics. | Production audit log, raw logs, stack traces, endpoints, handles, connector/tool internals. | No-leak constraints before diagnostics are public. | Static no-leak guard over diagnostic/audit summaries. | Required before package-root export or broad diagnostics guard. |

Future slices must not perform broad storage fan-in or package-root exports unless a future fan-in slice explicitly owns the relevant shared files. Leaf slices should prefer local contracts and local fakes. If a leaf needs `packages/*/src/index.ts`, package metadata, package locks, global static tests, release docs, README files, CI, scripts, or shared acceptance matrices, it must report fan-in-needed instead of editing those files.

## Future W21 slice decomposition

The following leaf plan is a proposed decomposition only. Exact future prompt names may differ, but future work must keep docs, leaf contracts, fake/inert store ports, static guards, and fan-in separated.

| Future slice | Owned area | Forbidden files | Prerequisites | Acceptance signal | Fan-in required |
| --- | --- | --- | --- | --- | --- |
| W21B — Durable State Contract Types | Narrow future adapter durable-state contract files under an explicitly assigned adapter state directory. | Package roots, package metadata, package locks, CI, scripts, release docs, README files, broad tests, OCA/LifeOS/core files, production storage files. | W21A plan merged. | Types/contracts define safe records and no-leak public projections for assigned state categories without store implementation. | No, unless package-root export or shared barrel is required. |
| W21C — Fake/Inert Adapter State Store Port | Narrow future fake/inert store-port files and local unit tests under assigned adapter/testkit paths. | Production database/cache/queue, migrations, package roots, global static tests, release docs, package metadata, CI/scripts. | W21B contract types merged. | Fake/inert ports exercise read/write/duplicate-safe lifecycle with json-safe public output and no production backend. | No, unless shared public exports are required. |
| W21D — Replay and Idempotency State Boundary | Narrow future inbound idempotency, replay cursor, and delivery/callback replay boundary files plus local tests. | Replay CLI, recovery runtime, backup/restore, migrations, production scheduler, listener/webhook/polling runtime, package roots unless assigned. | W21B and relevant W21C fake store ports merged. | Fake tests prove duplicate suppression, cursor progression, and safe blocked/replayed/completed summaries. | Possibly, if cross-category aggregation or acceptance E2E uses shared surfaces. |
| W21E — Durable State No-Leak Static Guard | One explicitly assigned static guard file for durable-state public projections and forbidden runtime/storage overreach. | Source behavior except read-only static inspection, package metadata, package roots, CI/scripts, release docs, README files. | W21B/W21C or whichever source files the guard inspects are merged. | Static guard checks no raw provider/callback payloads, secrets, endpoints, runtime-only values, handles, stack traces, local paths, raw logs, and default production storage/network behavior in assigned durable-state surfaces. | No, unless the guard must be added to a shared aggregate beyond the existing test pattern. |
| W21F — Durable State Docs and Fan-In | Explicitly assigned fan-in docs and shared export surfaces only if earlier leaves require public visibility or roadmap/status linkage. | New production storage behavior, migrations, backup/restore, replay CLI, recovery runtime, CI/scripts unless explicitly assigned, OCA/LifeOS/core behavior. | Earlier W21 leaf branches merged and verified. | Public exports/docs expose already-merged fake/inert state boundaries while preserving guarded classification and production non-claims. | Yes; this is the fan-in slice. |

## Dependency ordering

Safe ordering for W21 and later durable-state work:

1. Docs planning before source.
2. Contract types before store ports.
3. Fake/inert store boundary before any production storage.
4. Redacted projections before public output.
5. Idempotency/replay semantics before runtime recovery.
6. No migrations before an explicit production durable backend slice.
7. No package-root fan-in before an assigned fan-in slice.
8. Static/no-leak guard before broad use.
9. No production-ready claim until an explicit release gate proves production readiness.

Additional ordering constraints:

- Durable state contracts must define safe refs and protected-material exclusions before any fake store persists records.
- Fake/inert evidence must remain deterministic and default no-network/no-secret.
- Real integration attempt evidence state must remain explicit-gate-only and must not be treated as durable backend evidence.
- Readiness snapshots must not aggregate into deployment readiness or production readiness.
- Migration, backup, restore, replay CLI, and recovery runtime planning belong to later explicitly assigned production-storage or operations slices, not W21A.

## Non-goals

W21A does not implement or claim:

- production durable backend;
- database integration;
- cache integration;
- queue integration;
- migrations;
- backup;
- restore;
- replay CLI;
- runtime recovery;
- production idempotency runtime;
- production audit log;
- production persistence;
- production deployment readiness;
- real-provider success;
- OCA runtime readiness;
- LifeOS/domain readiness;
- sidecar readiness;
- production readiness.

## Safety and no-leak constraints

Future durable-state slices must preserve the current no-leak discipline.

Protected material must not appear in public durable-state outputs, docs examples, reports, readiness snapshots, smoke summaries, diagnostic summaries, audit summaries, or fake-store public projections:

- raw provider payloads;
- raw callback payloads;
- secrets, tokens, credentials, or resolved credential values;
- endpoints;
- runtime-only values;
- SDK/client handles;
- provider handles;
- stack traces;
- local paths;
- raw logs, stdout, or stderr;
- connector/tool internals.

Allowed public outputs are redacted/json-safe projections only: safe refs, bounded descriptors, explicit blocked/skipped/duplicate statuses, safe issue codes, provider acknowledgement fields separated from business-success fields, and redacted diagnostic categories.

Future slices must reject or redact unsafe input before it becomes public state evidence. Fake/inert stores may hold only safe records and must not be presented as production persistence.

## Worker-prompt rules for future W21 slices

Future W21 prompts should include:

- one slice per worker;
- explicit branch and expected base SHA;
- explicit owned files and directories;
- explicit forbidden files and directories;
- no package-root or barrel fan-in unless assigned;
- no package metadata changes unless assigned;
- no source/test fan-in unless assigned;
- no production storage behavior;
- no migrations;
- no default runtime behavior;
- no default network behavior;
- no default secret loading;
- no unsafe public fields;
- no broad acceptance/static/release/docs changes unless assigned;
- no OCA, LifeOS, sidecar, deployment, production provider runtime, or production durable backend readiness claim unless a future release-gated slice proves it;
- final report must include changed-file scope, safety, tests/checks, self-review fields, and fan-in-needed status.

Future prompts should require workers to report checks honestly. If the GitHub connector cannot execute commands, commands such as `npm run test:static` and `npm run check` must be reported as not run with connector limitation rather than passed.

## Current classification guardrail

This plan preserves the repository posture as adapter-ready-for-real-system-integration under explicit gates and not production-ready.

W21A is an ownership and dependency document only. It does not alter release readiness, does not implement durable adapter state, and does not remove any known limitation.
