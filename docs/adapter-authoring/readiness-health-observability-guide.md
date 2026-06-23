# Readiness, Health, and Observability Guide

## Purpose

Adapter packages need safe ways to report whether core ports, adapter stores, external transports, runtime bridges, and deployment dependencies are configured and usable.

This guide separates core readiness from adapter-owned production readiness.

## Core readiness principle

Core readiness is descriptive. It reports public core port configuration and safe diagnostic state. It must not open external connections, create stores, start runtime loops, or mutate production infrastructure.

Adapter readiness is deployment-aware. It may check external systems, store connectivity, provider configuration, runtime bridge state, topic bindings, and permission policy.

## Readiness layers

A production adapter should normally expose readiness at several layers.

### Core facade readiness

Core facade readiness answers:

```text
are the expected public core ports injected and describable?
```

Examples:

- agent control host present;
- session binding store present;
- presentation outbox store present;
- presentation action token store present;
- optional workflow/status/health ports present or missing;
- runtime drain configured or not configured.

Use `getPortReadiness` where available through `createCoreInteractionHost`.

### Adapter component readiness

Adapter component readiness answers:

```text
are adapter-owned components configured and internally consistent?
```

Examples:

- topic/channel binding store configured;
- delivery sink configured;
- renderer registry loaded;
- command registry loaded;
- permission policy loaded;
- idempotency store configured;
- approval routing configured;
- durable schema version compatible.

### External infrastructure readiness

External infrastructure readiness answers:

```text
can the adapter reach the external systems it owns?
```

Examples:

- Telegram/OpenClaw channel configured;
- callback endpoint reachable;
- database reachable;
- runtime bridge reachable;
- provider credentials present;
- required external topics/channels exist;
- rate-limit state acceptable;
- deployment secrets available.

Core should not perform these checks. The adapter or deployment package owns them.

## Readiness status model

Adapter readiness should use a small status vocabulary.

Recommended statuses:

- `ready`;
- `degraded`;
- `not_configured`;
- `failed`.

Individual checks may use:

- `ready`;
- `missing`;
- `degraded`;
- `failed`.

Safe readiness output should include:

- status;
- stable check name;
- stable code;
- safe message;
- optional detailsRef;
- generatedAt;
- correlationId where relevant.

It should not include secrets, raw provider errors, stack traces, connection strings, storage roots, or raw external payloads.

## Startup gating

Adapters may choose to gate startup based on readiness.

Recommended model:

```text
load config
-> build adapter components
-> create core facade with explicit ports
-> run core port readiness
-> run adapter component readiness
-> run external infrastructure readiness
-> if blocking checks fail: do not start listeners/workers
-> if degraded checks fail: start in degraded mode if policy allows
```

Core constructors should not make this decision implicitly. Deployment code owns startup policy.

## Health vs readiness

Readiness and health are related but different.

Readiness asks:

```text
should this adapter accept work now?
```

Health asks:

```text
what is the current operational state of this process and dependencies?
```

Liveness asks:

```text
is the process alive enough for the supervisor not to kill it?
```

Do not overload a single endpoint or status card with incompatible semantics. A service can be live but not ready.

## Safe health output

Health output should be safe for operators and external status UIs.

Allowed:

- service name;
- version;
- status;
- check names;
- safe codes;
- safe messages;
- degraded/missing/failed status;
- timestamps;
- correlation ids;
- opaque details refs;
- dependency labels without credentials.

Forbidden:

- bot tokens;
- API keys;
- database URLs;
- raw provider responses;
- stack traces;
- host absolute paths;
- raw runtime objects;
- raw external payloads;
- unredacted user content.

## Observability ownership

Core may provide safe diagnostics, metrics models, and trace/correlation helpers. External adapters own real observability exporters.

Examples of adapter-owned exporters:

- OpenTelemetry exporter;
- JSON log sink;
- metrics endpoint;
- alerting integration;
- OpenClaw status channel;
- Telegram admin status topic;
- web dashboard.

Exporters should consume only safe DTOs/envelopes. They must not scrape private store internals.

## Correlation and tracing

Every adapter flow should maintain correlation.

Recommended correlation propagation:

```text
external request/update id
-> adapter correlation id
-> core facade input metadata/correlation
-> public core envelope
-> adapter delivery attempt
-> external response/log
```

Correlation ids must be safe to log. They should not contain secrets, raw payloads, host paths, or personally identifying data beyond what the product explicitly treats as safe.

## Logging rules

Adapter logs should record:

- operation kind;
- safe refs;
- safe status code;
- correlation id;
- timing;
- retryability;
- detailsRef;
- sanitized external target labels where safe.

Adapter logs should not record:

- raw inbound payloads by default;
- raw callback payloads beyond opaque token ref where safe;
- token store records;
- secrets;
- stack traces in public logs;
- database URLs;
- provider SDK objects;
- raw document contents.

If raw payload retention is needed for debugging, store it in a controlled adapter-owned debug store and reference it by `rawDebugRef` or `detailsRef`.

## Metrics

Useful adapter metrics:

- inbound events received;
- inbound events rejected safely;
- duplicate inbound events;
- missing binding errors;
- pending presentation count;
- delivery claims succeeded/contended;
- delivery successes/failures;
- retryable vs non-retryable delivery failures;
- action tokens issued;
- token verify failures;
- token consume conflicts;
- callback replays;
- approval approve/reject counts;
- runtime dispatch successes/failures;
- readiness status by component.

Metric labels must be low-cardinality and safe. Avoid raw user ids, message ids, token refs, and unbounded strings as metric labels.

## OpenClaw Telegram readiness reference

An OpenClaw Telegram adapter may check:

- OpenClaw channel configured;
- Telegram delivery capability available through OpenClaw;
- bot identity available without exposing token;
- required supergroup/chat known;
- forum topics bound for required agents;
- callback acknowledgement path configured;
- topic binding store ready;
- presentation outbox/token stores ready;
- runtime bridge configured;
- approval source/resolver configured;
- permission policy loaded;
- fake/test mode clearly identified.

These checks belong in the adapter repository, not core.

## Status cards

Adapters may render safe readiness/health cards externally.

A status card should show:

- overall status;
- component statuses;
- safe messages;
- last checked time;
- correlation or trace ref if useful;
- remediation hint without secrets.

A status card should not show:

- token values;
- connection strings;
- raw exception text;
- raw external payload;
- filesystem paths;
- private store internals.

## Failure handling

Readiness failures should be precise and safe.

Examples:

- `session_store_missing`;
- `token_store_missing`;
- `topic_binding_store_unavailable`;
- `delivery_channel_not_configured`;
- `runtime_bridge_degraded`;
- `permission_policy_missing`;
- `schema_migration_required`;
- `callback_endpoint_unavailable`.

Do not collapse all failures into a generic exception. Safe codes are important for operations and automated remediation.

## Test checklist

Readiness/observability tests should cover:

- all required core ports present -> ready;
- missing required core port -> safe not-configured/missing;
- optional port missing -> degraded or not-configured as designed;
- adapter store unavailable -> safe failed/degraded;
- external channel not configured -> safe not_configured;
- raw provider error redacted;
- status card contains no secrets;
- logs contain correlation ids but no raw payloads;
- metric labels are bounded and safe.

## Implementation checklist

Before merging readiness/observability code, verify:

- core readiness and adapter readiness are separated;
- external checks are not hidden inside core constructors;
- output is safe to render and log;
- raw provider errors are converted to safe codes/messages;
- secrets and storage roots are redacted;
- readiness can distinguish missing/degraded/failed;
- tests cover missing dependencies;
- package-local tests run in CI.
