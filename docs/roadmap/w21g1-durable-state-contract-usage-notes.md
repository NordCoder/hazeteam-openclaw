# W21G1 Durable State Contract Usage Notes

## Status

W21G1 is documentation-only.

W21B added durable-state contract types under the adapter durable-state area. Those types provide safe vocabulary and type-level boundaries for future durable adapter state work.

W21B did not add any of the following:

- store implementation;
- package-root export;
- runtime behavior;
- persistence;
- migration;
- backup or restore behavior;
- replay CLI;
- recovery runtime;
- provider runtime;
- credential loading;
- deployment behavior;
- OCA behavior;
- LifeOS or domain behavior;
- sidecar behavior;
- production durable backend.

The current classification remains `adapter-ready-for-real-system-integration-under-explicit-gates`.

The repository remains not production-ready.

## Contract usage rules

Future workers should read the W21B durable-state contract types as safe vocabulary and type-level boundaries only.

Allowed usage:

- use W21B names as stable vocabulary for future adapter-owned state categories;
- use W21B contracts to keep public projections redacted and JSON-safe;
- use W21B fields to preserve safe refs, status vocabulary, issue-code vocabulary, duplicate/replay vocabulary, readiness vocabulary, and provider-acknowledgement/business-success separation;
- use W21B contracts as fake/inert durable-state preparation only;
- use W21B contracts to document or test no-leak expectations when explicitly assigned.

Forbidden interpretation:

- do not treat W21B as proof of production persistence;
- do not treat W21B as proof of production durable backend readiness;
- do not treat W21B as permission to add package-root exports;
- do not treat W21B as permission to wire default runtime behavior;
- do not treat W21B as permission to add migrations;
- do not treat W21B as permission to add storage adapters;
- do not treat W21B as permission to add database, cache, queue, backup, restore, replay CLI, recovery runtime, provider runtime, credential loading, deployment, OCA, LifeOS/domain, or sidecar behavior.

## Category-to-use mapping

| W21B durable-state category | Intended future use | Allowed fake/inert usage | Forbidden production interpretation |
| --- | --- | --- | --- |
| Topic binding state | Preserve canonical channel, chat, and optional thread binding authority using safe refs rather than display titles. | Fake records may model binding refs, channel refs, chat refs, thread refs, display refs, status, and deterministic lookup/update behavior. | Not a production topic-binding store, not provider lookup, not title-as-authority, not migration or storage-adapter evidence. |
| Callback token state | Track callback token lifecycle through opaque token refs and expected context refs without exposing token values. | Fake records may model token refs, callback refs, expiry markers, verification status, and safe blocked/expired outcomes. | Not a production token store, not token generation, not credential loading, and not permission to expose token values or raw callback payloads. |
| Callback permission/consume state | Preserve permission-before-consume sequencing and replay-safe consume decisions. | Fake records may model permission decisions, consume refs, token verification booleans, token-consumed status, and duplicate suppression. | Not a production policy engine, not product action dispatch, not consume-before-permission, and not production idempotency runtime. |
| Delivery attempt state | Track delivery attempt refs, idempotency refs, provider acknowledgement, business success, retryability, and duplicate disposition separately. | Fake records may model delivery attempts, acknowledgement-only outcomes, business-success outcomes, retryable/terminal states, and duplicate-safe replay. | Not production delivery runtime, not provider network execution, not queue/outbox/retry scheduler, and not proof that provider acknowledgement is business success. |
| Inbound idempotency state | Prevent duplicate inbound events from producing duplicate effects. | Fake records may model reservations, processing/completed markers, safe event refs, duplicate suppression, and effect-suppressed outcomes. | Not production idempotency runtime, not listener/webhook/polling runtime, and not raw provider event persistence. |
| Replay cursor/state | Track bounded replay planning vocabulary, cursor refs, replay modes, duplicate-check outcomes, and safe replay counts. | Fake records may model audit-only replay, duplicate-check replay, bounded replay plans, cursor progression, and blocked/completed summaries. | Not replay CLI, not recovery runtime, not backup/restore behavior, not provider fetch replay, and not operational restore evidence. |
| Correlation state | Preserve traceability between inbound, callback, delivery, runtime, readiness, replay, and diagnostics using safe refs. | Fake records may model component refs, operation refs, related refs, severity, and redacted diagnostic categories. | Not production tracing backend, not raw logs, not stack traces, not local paths, and not connector/tool internal exposure. |
| Real integration attempt evidence state | Preserve explicit-gate attempt evidence vocabulary, provider acknowledgement, business success, and redacted-evidence distinctions. | Fake records may model blocked, ready-to-attempt, acknowledgement-only, failed-safe, and supplied redacted attempt summaries. | Not real-provider success, not default network behavior, not provider transcript storage, and not production durable evidence. |
| Readiness snapshot state | Summarize adapter durable-state posture, explicit gates, durable backend posture, issue codes, and non-production classification. | Fake snapshots may model guarded readiness status, closed/open/not-required gates, not-production-ready status, and no-production-durable-backend issue codes. | Not deployment readiness, not production health endpoint, not live store readiness, not migration readiness, and not production readiness. |
| Redacted diagnostic/audit summary state | Preserve bounded audit and diagnostic summaries for state lifecycle decisions without protected material. | Fake summaries may model safe diagnostic refs, audit summary refs, actor category refs, event class refs, statuses, safe refs, and redacted issue categories. | Not production audit log, not raw logs/stdout/stderr, not endpoint/handle/path/stack exposure, and not connector/tool internal exposure. |

## Worker guidance for future W21C/W21D/W21E slices

Future W21C/W21D/W21E workers should follow these rules unless a later prompt explicitly assigns different ownership:

- import or reference W21B contracts only from explicitly assigned files;
- do not add package-root exports unless a future fan-in slice owns that change;
- do not add broad static guards unless explicitly assigned;
- do not add production storage;
- do not add migrations;
- do not add default network behavior;
- do not add default secret loading;
- do not add default runtime behavior;
- do not add unsafe public fields;
- do not expose raw provider payloads, raw callback payloads, secrets, credentials, resolved runtime values, endpoints, provider/client handles, SDK handles, stack traces, local paths, raw logs, raw command output, stdout, stderr, or connector/tool internals;
- keep provider acknowledgement separate from business success;
- keep ready-to-attempt and ready-to-run states below pass;
- report fan-in-needed instead of editing package roots, package metadata, CI, scripts, release docs, README files, broad acceptance matrices, OCA/LifeOS overlays, sidecar areas, or core sources.

## Non-goals preserved

This document makes no claim of:

- durable backend readiness;
- production storage readiness;
- deployment readiness;
- real-provider success;
- OCA readiness;
- LifeOS or domain readiness;
- sidecar readiness;
- production readiness.

W21G1 does not implement source, tests, package metadata, package roots, CI, scripts, release docs, storage adapters, migrations, runtime behavior, network behavior, secret loading, provider behavior, deployment behavior, OCA behavior, LifeOS/domain behavior, sidecar behavior, or production durable backend behavior.
