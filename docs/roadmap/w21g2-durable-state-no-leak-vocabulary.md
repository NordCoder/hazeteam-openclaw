# W21G2 Durable State No-Leak Vocabulary

## Status

W21G2 is documentation-only. It documents safe vocabulary for future durable-state public projections, using W21B durable-state contract types as the current type baseline and W21A durable adapter state planning as the planning boundary.

This document does not change W21B source. It does not add tests, static guards, package-root exports, store behavior, runtime behavior, production durable backend behavior, or production readiness.

The current repository classification remains `adapter-ready-for-real-system-integration-under-explicit-gates`. The repository remains not production-ready.

## Scope boundaries

This document is a vocabulary reference for future public durable-state projection design and review. It is not an implementation plan for persistence, networking, provider execution, secret loading, command execution, migration, backup, restore, replay CLI, recovery runtime, deployment runtime, sidecar runtime, OCA runtime, or LifeOS/domain behavior.

Future workers may use this document to keep durable-state public records redacted, JSON-safe, and explicit about readiness limits. They must still follow the contract pack, implementation manifest, assigned prompt, and current repository state for any implementation work.

## Safe vocabulary

Preferred public durable-state projection fields should use bounded vocabulary that describes safe refs, statuses, issue categories, and redacted summaries only.

Safe vocabulary:

- `safeRef`
- `stateRef`
- `bindingRef`
- `callbackRef`
- `tokenRef` as an opaque reference only
- `deliveryAttemptRef`
- `idempotencyRef`
- `replayRef`
- `correlationRef`
- `attemptEvidenceRef`
- `readinessSnapshotRef`
- `diagnosticRef`
- `redactedSummary`
- `status`
- `issueCode`
- `providerAcknowledged`
- `businessSuccess`

Refs are opaque safe identifiers or descriptors. They are not raw provider values, resolved runtime values, endpoint values, local paths, raw payloads, logs, process output, SDK handles, client handles, connector internals, or secrets.

`tokenRef` is allowed only as an opaque reference such as `token-ref:synthetic-001`. It must never imply that a token value, raw callback value, credential value, or provider payload is public.

`providerAcknowledged` and `businessSuccess` must remain separate. Provider acknowledgement alone is not business success, and ready-to-attempt or ready-to-run states are not pass states.

`redactedSummary` must be JSON-safe and must contain only bounded diagnostic categories, safe refs, safe statuses, and safe issue codes.

## Forbidden vocabulary

Durable-state public field names and public concepts must not expose protected material. Future public durable-state projections should not introduce fields or concepts that carry or imply any of the following:

- token value fields;
- secret, password, apiKey, or authHeader fields;
- endpoint or url fields;
- rawPayload, rawProviderPayload, or rawCallbackPayload fields;
- stack or stackTrace fields;
- localPath fields;
- stdout or stderr fields;
- client, sdk, or handle fields;
- processEnv fields;
- runtimeValue fields;
- raw logs;
- raw command output;
- raw diffs;
- connector or tool internals.

This list is vocabulary guidance and does not contain actual secrets, endpoints, payloads, logs, paths, or provider data.

If a future implementation needs operational diagnostics, it should publish safe diagnostic refs, issue codes, redacted summaries, and bounded statuses instead of raw artifacts.

## Safe public projection examples

The examples below are synthetic, generic, and non-operational. They use fake refs only. They do not include real provider payloads, endpoints, secrets, local paths, raw logs, raw diffs, command output, or connector/tool internals.

### Callback token projection

~~~json
{
  "safeRef": "state:synthetic-callback-token-001",
  "stateRef": "state:synthetic-callback-token-001",
  "callbackRef": "callback:synthetic-action-001",
  "tokenRef": "token-ref:synthetic-token-001",
  "status": "issued",
  "issueCode": "none",
  "correlationRef": "correlation:synthetic-flow-001",
  "redactedSummary": {
    "summaryKind": "redacted-summary",
    "status": "issued",
    "issueCode": "none",
    "safeRefs": [
      "callback:synthetic-action-001",
      "token-ref:synthetic-token-001"
    ],
    "jsonSafe": true
  }
}
~~~

### Delivery attempt projection

~~~json
{
  "safeRef": "delivery-attempt:synthetic-delivery-001",
  "stateRef": "state:synthetic-delivery-001",
  "deliveryAttemptRef": "delivery-attempt:synthetic-delivery-001",
  "idempotencyRef": "idempotency:synthetic-message-001",
  "status": "acknowledgement-only",
  "issueCode": "business-success-missing",
  "providerAcknowledged": true,
  "businessSuccess": false,
  "correlationRef": "correlation:synthetic-flow-002",
  "redactedSummary": {
    "summaryKind": "redacted-summary",
    "status": "acknowledgement-only",
    "issueCode": "business-success-missing",
    "safeRefs": [
      "delivery-attempt:synthetic-delivery-001",
      "idempotency:synthetic-message-001"
    ],
    "jsonSafe": true
  }
}
~~~

### Readiness snapshot projection

~~~json
{
  "safeRef": "readiness-snapshot:synthetic-snapshot-001",
  "stateRef": "state:synthetic-readiness-001",
  "readinessSnapshotRef": "readiness-snapshot:synthetic-snapshot-001",
  "status": "adapter-ready-for-real-system-integration-under-explicit-gates",
  "issueCode": "no-production-durable-backend",
  "providerAcknowledged": false,
  "businessSuccess": false,
  "redactedSummary": {
    "summaryKind": "redacted-summary",
    "status": "not-production-ready",
    "issueCode": "no-production-durable-backend",
    "safeRefs": [
      "readiness-snapshot:synthetic-snapshot-001"
    ],
    "jsonSafe": true
  }
}
~~~

## Future W21E static guard guidance

A future W21E durable-state no-leak static guard should verify the durable-state public surface without implementing runtime behavior. At minimum, it should check that:

- forbidden field names remain absent from durable-state public surfaces;
- raw payload vocabulary remains absent;
- default storage behavior remains absent;
- default network behavior remains absent;
- default secret loading remains absent;
- default runtime behavior remains absent;
- provider acknowledgement and business success remain separate;
- ready-to-attempt and ready-to-run are not treated as pass states;
- diagnostic and audit summaries stay redacted and JSON-safe.

The static guard should not claim durable backend readiness, production storage readiness, deployment readiness, real-provider success, OCA readiness, LifeOS/domain readiness, sidecar readiness, or production readiness.

## Non-goals

W21G2 makes no claim of:

- durable backend readiness;
- production storage readiness;
- deployment readiness;
- real-provider success;
- OCA readiness;
- LifeOS/domain readiness;
- sidecar readiness;
- production readiness.

W21G2 does not implement or claim:

- store behavior;
- runtime behavior;
- network behavior;
- secret loading;
- package-root exports;
- test coverage;
- static guard coverage;
- CI changes;
- release readiness changes.
